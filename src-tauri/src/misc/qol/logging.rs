use log::{LevelFilter, info};
use std::fs;
use std::path::PathBuf;

pub(crate) fn setup_logging() -> Result<(), Box<dyn std::error::Error>> {
    // Create logs directory if it doesn't exist
    let log_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("United Chat")
        .join("logs");
    
    if !log_dir.exists() {
        fs::create_dir_all(&log_dir)?;
    }

    // Create a log file with timestamp
    let timestamp = chrono::Local::now().format("%d-%m-%Y-%H-%M");
    let log_file = log_dir.join(format!("app-{}.log", timestamp));
    
    // Initialize the logger
    env_logger::Builder::from_default_env()
        .filter_level(LevelFilter::Debug)
        .format(|buf, record| {
            use std::io::Write;
            writeln!(
                buf,
                "{} [{}] - {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.level(),
                record.args()
            )
        })
        .target(env_logger::Target::Pipe(Box::new(
            fs::File::create(log_file)?,
        )))
        .init();

    info!("Logging initialized");
    Ok(())
} 