use std::path::PathBuf;
use tokio::fs;

use super::error::DatabaseError;

pub struct DatabaseConfig {
    pub(crate) max_retries: u32,
    pub(crate) retry_delay_ms: u64,
    pub(crate) timeout_ms: u64,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            max_retries: 5,
            retry_delay_ms: 100,
            timeout_ms: 5000,
        }
    }
}

impl DatabaseConfig {
    pub async fn get_database_path() -> PathBuf {
        let path = dirs::config_dir()
            .unwrap()
            .join("United Chat")
            .join("database");
        if !path.exists() {
            fs::create_dir_all(&path)
                .await
                .map_err(|e| DatabaseError::PathError(e.to_string()))
                .unwrap();
        }
        path
    }
}
