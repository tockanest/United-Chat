use super::manager::DatabaseManager;
use std::sync::Arc;

#[derive(Default)]
pub struct DatabaseState(pub Arc<DatabaseManager>);

impl DatabaseState {
    pub fn new(manager: DatabaseManager) -> Self {
        Self(Arc::new(manager))
    }
}