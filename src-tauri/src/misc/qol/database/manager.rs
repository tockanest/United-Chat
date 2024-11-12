use sled::Db;
use std::fs;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

use super::config::DatabaseConfig;
use super::error::{DatabaseError, DbResult};

#[derive(Default)]
pub struct DatabaseManager {
    db: Arc<Mutex<Option<Arc<Db>>>>,
    path: Arc<Mutex<Option<std::path::PathBuf>>>,
}

impl DatabaseManager {
    pub fn new() -> Self {
        Self {
            db: Arc::new(Mutex::new(None)),
            path: Arc::new(Mutex::new(None)),
        }
    }

    async fn force_close_db(&self) -> DbResult<()> {
        let mut db_guard = self.db.lock().await;
        if let Some(db) = db_guard.take() {
            info!("Forcing database closure");
            match Arc::try_unwrap(db) {
                Ok(single_db) => {
                    single_db.flush()?;
                    drop(single_db);
                }
                Err(arc_db) => {
                    arc_db.flush()?;
                    // Wait for potential other references to be dropped
                    sleep(Duration::from_millis(100)).await;
                    drop(arc_db);
                }
            }
        }
        Ok(())
    }

    pub async fn reinitialize(&self) -> DbResult<()> {
        info!("Starting database reinitialization");

        // First, perform cleanup
        if let Err(e) = self.cleanup().await {
            error!("Database cleanup error: {}", e);
            // Continue anyway, as we'll try to reinitialize
        }

        // Then initialize with a fresh configuration
        info!("Reinitializing database with fresh configuration");
        let config = DatabaseConfig::default();
        match self.initialize(Some(config)).await {
            Ok(_) => {
                info!("Database reinitialized successfully");
                Ok(())
            }
            Err(e) => {
                error!("Failed to reinitialize database: {}", e);
                Err(e)
            }
        }
    }

    async fn clear_database_files(path: &std::path::Path) -> std::io::Result<()> {
        if path.exists() {
            info!("Clearing database files at: {:?}", path);
            // Force close any open file handles
            if cfg!(windows) {
                sleep(Duration::from_millis(100)).await;
            }
            fs::remove_dir_all(path)?;
            fs::create_dir_all(path)?;
        }
        Ok(())
    }

    pub async fn initialize(&self, config: Option<DatabaseConfig>) -> DbResult<()> {
        let config = config.unwrap_or_default();
        let db_path = DatabaseConfig::get_database_path().await;

        // Store the path for later use
        *self.path.lock().await = Some(db_path.clone());

        // First, try to force close any existing database connection
        if let Err(e) = self.force_close_db().await {
            warn!("Error while forcing database closure: {}", e);
            // Continue anyway as we'll try to handle this below
        }

        let mut attempts = 0;
        let start = std::time::Instant::now();

        loop {
            // Always try to get a fresh lock for the database
            let mut db_guard = self.db.lock().await;

            match sled::Config::new()
                .mode(sled::Mode::HighThroughput)
                .path(db_path.clone())
                .open()
            {
                Ok(db) => {
                    if db.was_recovered() {
                        info!("Database opened successfully");
                        *db_guard = Some(Arc::new(db));
                        return Ok(());
                    } else {
                        warn!("Database recovery failed, attempting cleanup");
                        drop(db_guard); // Release the lock before cleanup
                        attempts += 1;
                    }
                }
                Err(e) => {
                    drop(db_guard); // Release the lock before error handling

                    if e.to_string().contains("lock") {
                        warn!("Database is locked, attempt {}/{}", attempts + 1, config.max_retries);
                        // Try to force close and clear
                        if let Err(close_err) = self.force_close_db().await {
                            warn!("Failed to force close database: {}", close_err);
                        }
                        if let Err(clear_err) = Self::clear_database_files(&db_path).await {
                            error!("Failed to clear database files: {}", clear_err);
                        }
                        attempts += 1;
                    } else {
                        error!("Database error: {}", e);
                        return Err(DatabaseError::OpenError(e));
                    }
                }
            }

            if attempts >= config.max_retries {
                return Err(DatabaseError::Locked);
            }

            if start.elapsed().as_millis() as u64 > config.timeout_ms {
                return Err(DatabaseError::Timeout);
            }

            sleep(Duration::from_millis(config.retry_delay_ms)).await;
        }
    }

    pub async fn get_db(&self) -> DbResult<Arc<Db>> {
        let db_guard = self.db.lock().await;
        if let Some(db) = db_guard.as_ref() {
            Ok(db.clone())
        } else {
            Err(DatabaseError::Locked)
        }
    }

    pub async fn cleanup(&self) -> DbResult<()> {
        info!("Starting database cleanup");

        // Force close the database
        self.force_close_db().await?;

        // Clear the database files
        if let Some(path) = self.path.lock().await.as_ref() {
            Self::clear_database_files(path).await?;
        }

        info!("Database cleanup completed");
        Ok(())
    }
}