use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Database is locked")]
    Locked,
    #[error("Failed to open database: {0}")]
    OpenError(#[from] sled::Error),
    #[error("Timeout while waiting for database lock")]
    Timeout,
    #[error("Failed to get database path: {0}")]
    PathError(String),
    #[error("IO Error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type DbResult<T> = Result<T, DatabaseError>;