use std::io::Write;

#[tauri::command]
pub(crate) fn get_theme(theme: String) -> String {
    let theme_dirs = dirs::config_dir().unwrap().join("United Chat").join("themes");

    let default_theme = r#"<!-- You can use the most common bindings on this editor -->
<!-- As an example: "CRTL + /" creates this comment line -->
<!-- You can use common CSS inline styling OR Tailwindcss, it's up to you. -->
<!-- For Tailwind, refer to this documentation: https://tailwindcss.com/docs -->
<!-- Slashes as comments will get rendered since this is an HTML editor -->
<div class="flex flex-col items-start justify-center bg-transparent m-2 text-black ">
    <div class="flex flex-row items-center">
      <!-- The "badges" modifier will include only 3 max badges, excluding the platform badge, this might make the boxed message a little too long  -->
      <!-- If you don't want to bother selecting which badges you want, you can use the "formatedBadges" -->
      <!-- "formatedBadges" follow this structure: Platform Badge -> Mod Badge (if any) -> Sub Badge (if any) -> Other badges -->
      <div class="flex flex-row items-center">
        {platform}
        <img class="w-6 h-6" src={badges} alt="badge"/>
      </div>
      <div class="flex flex-row items-center space-x-0.5">
        <p style="color: {color};">{user}</p>:
        <p>{formatedMessage}</p>
      </div>
    </div>
</div>

<!-- Imagination is your limit, do whatever you want. -->
<!-- After you're done and like what you're seeing, click "Save" to save the theme -->
<!-- if you don't, you'll lose everything. (PS: AutoSaving is planned) -->"#.to_string();

    if !theme_dirs.exists() {
        std::fs::create_dir_all(theme_dirs.clone()).unwrap();

        let mut file = std::fs::File::create(theme_dirs.join("default.html")).unwrap();
        file.write_all(default_theme.as_bytes()).unwrap();

        return default_theme;
    }


    match theme.as_str() {
        "default" => {
            default_theme
        }
        _ => {
            let theme_path = theme_dirs.join(format!("{}.html", theme));
            if theme_path.exists() {
                std::fs::read_to_string(theme_path).unwrap()
            } else {
                default_theme
            }
        }
    }
}