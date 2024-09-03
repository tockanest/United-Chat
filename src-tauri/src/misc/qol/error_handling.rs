use std::io::Write;

pub(crate) fn setup_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let path = dirs::config_dir().unwrap().join("United Chat").join("logs");

        if !path.exists() {
            std::fs::create_dir_all(&path).expect("Failed to create directory");
        }

        // Timestamp: dd-mm-yyyy-hh-mm
        let timestamp = chrono::Local::now().format("%d-%m-%Y-%H-%M");
        let file_name = format!("error-{}.log", timestamp);
        let file_path = path.join(file_name);

        std::fs::File::create(file_path.clone()).expect("Failed to create file");

        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .append(true)
            .open(file_path)
            .expect("Failed to open file");

        let error = format!(
            "Error: {}\nBacktrace: {:?}\n",
            info,
            std::backtrace::Backtrace::capture()
        );

        file.write_all(error.clone().as_bytes()).expect("Failed to write to file");

        eprint!("{}", error)
    }));
}