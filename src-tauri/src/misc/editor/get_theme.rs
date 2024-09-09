use crate::misc::editor::save_theme::ThemeState;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::ops::Deref;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize)]
pub(crate) struct Theme {
    pub(crate) name: String,
    pub(crate) html_code: String,
    pub(crate) css_code: String,
}

#[tauri::command]
pub(crate) async fn get_theme(theme: String, app: AppHandle) -> Result<Theme, String> {
    let theme_dirs = dirs::config_dir()
        .unwrap()
        .join("United Chat")
        .join("themes");

    let default_theme = r#"<!-- You can use the most common bindings on this editor -->
<!-- As an example: "CRTL + /" creates this comment line -->
<!-- You can use common CSS inline styling OR Tailwindcss, it's up to you. -->
<!-- For Tailwind, refer to this documentation: https://tailwindcss.com/docs -->
<!-- Slashes as comments will get rendered since this is an HTML editor -->

<!-- If you want your messages to be deleted and do not want to handle it on this editor, PLEASE do not forget to set the main div id -->
<!-- If you do not handle it yourself and do not set it, the app WILL NOT remove old messages for you. -->
<div id={id} class="w-full h-full">
    <!--
    Outer container that takes up the full width and height of its parent.
    This ensures that all the content inside has the necessary space to render fully.
    -->
    <div class="flex flex-col items-start justify-center bg-transparent m-2 text-white max-w-[600px]">
        <!--
        Inner flex container holding the platform badge, username, and message.
        The 'flex-col' layout makes the inner elements stack vertically.
        The 'items-start' aligns all the items at the top of this container, preventing vertical misalignment.
        The 'max-w-[600px]' ensures that this container does not exceed 600px in width, preventing overflow.
        -->
        <div class="flex flex-row items-start w-full">
            <!--
            Flex container for the platform and user badges.
            'flex-row' arranges the badges horizontally.
            'items-start' ensures these badges align at the top, preventing them from stretching vertically.
            -->
            <div class="flex flex-row items-start space-x-2 mr-2">
                <!-- Placeholder for platform-specific badge (e.g., Twitch, YouTube) -->
                {platform}
                <!-- Displays user badges next to the platform badge -->
                <!-- There is also: {badge_1} to {badge_3}. You can also use {formatedBadges (*WIP)} to set automatically badges. -->
                {badges}
            </div>

            <!--
            Flex container for the username and message.
            'flex-row' arranges the username and message side by side.
            'items-start' ensures that both the username and message align at the top, which is crucial for keeping the username from being vertically centered when the message is long.
            'space-x-0.5' adds a small space between the username and the message.
            -->
            <div class="flex flex-row items-start space-x-0.5 w-full break-words overflow-hidden text-ellipsis space-x-2">
                <!--
                The username is styled with 'flex-none' to prevent it from stretching.
                This ensures the username stays fixed in size, maintaining its position at the top left of the container, regardless of the message length.
                The 'color' style is dynamically set based on user preference or platform data.
                -->
                <p style="color: {color};" class="flex-none">{user}</p>:

                <!--
                 The message text is placed in a flexible container ('flex-1') that allows it to take up the remaining space next to the username.
                'break-words' ensures that words break to the next line if they exceed the container width, preventing horizontal scrolling or overflow.
                'overflow-hidden' prevents any text that exceeds the container from spilling out, ensuring a clean layout.
                'whitespace-pre-wrap' preserves whitespace in the message text and wraps lines as necessary, ensuring the message is displayed as entered, while respecting the container boundaries.
                'text-ellipsis' adds an ellipsis (...) if the text overflows, but since 'break-words' and 'overflow-hidden' are in place, this is more of a fallback measure.
                -->
                <p class="flex-1 break-words overflow-hidden whitespace-pre-wrap">{formatedMessage}</p>
            </div>
        </div>
    </div>
</div>

<!-- Imagination is your limit, do whatever you want. -->
<!-- After you're done and like what you're seeing, click "Save" to save the theme -->
<!-- if you don't, you'll lose everything. (PS: AutoSaving is planned) -->
<!-- If you're having problems with line breaking messages, please use this example to format your styling accordingly. -->
<!--
    ### Detailed Explanation of Word Breaking and Overflow Handling:
    1. **`break-words`**:
       - **Purpose**: Forces the text to break onto a new line if a word is too long to fit within the container.
       - **Why It’s Important**: Without this, long words (or strings with no spaces, like URLs) might overflow out of the container, causing layout issues. By enabling word breaking, we ensure that all content stays within its designated area.

    2. **`overflow-hidden`**:
       - **Purpose**: Ensures that any content that exceeds the container boundaries is hidden.
       - **Why It’s Important**: This prevents text or other content from spilling out of its container, which can disrupt the layout and create a poor user experience. In combination with `break-words`, this ensures that content stays visually contained within its intended area.

    3. **`whitespace-pre-wrap`**:
       - **Purpose**: Preserves the whitespace in the message as it was entered, and wraps text as necessary.
       - **Why It’s Important**: This setting respects the original formatting of the message (including spaces and line breaks) while ensuring the text wraps properly within the container. It’s particularly useful for maintaining the readability of user-generated content.

    4. **`text-ellipsis`**:
       - **Purpose**: Adds an ellipsis (`...`) if the content is too long to fit within the container.
       - **Why It’s Important**: Although `break-words` and `overflow-hidden` manage most of the overflow issues, `text-ellipsis` acts as a safety net, ensuring that if any text does somehow exceed its container, it’s truncated gracefully with an ellipsis.
-->"#.to_string();

    if !theme_dirs.exists() {
        let default_theme_path = theme_dirs.join("default");

        if !default_theme_path.exists() {
            std::fs::create_dir_all(default_theme_path.clone()).unwrap();
        }

        let mut file = std::fs::File::create(default_theme_path.join("default.html")).unwrap();
        file.write_all(default_theme.as_bytes()).unwrap();

        return Ok(Theme {
            name: "default".to_string(),
            html_code: default_theme,
            css_code: "".to_string(),
        });
    }

    match theme.as_str() {
        "default" => Ok(Theme {
            name: "default".to_string(),
            html_code: default_theme,
            css_code: "".to_string(),
        }),
        _ => {
            let state = app.state::<ThemeState>();
            let theme_state = state.deref();

            let theme = theme_state.themes.iter().find(|(name, _, _)| name == &theme);
            println!("{:?}", theme);
            match theme {
                Some((_, html_path, css_path)) => {
                    let html_code = std::fs::read_to_string(html_path).unwrap();
                    let css_code = std::fs::read_to_string(css_path).unwrap();
                    Ok(Theme {
                        name: theme.unwrap().0.clone(),
                        html_code,
                        css_code,
                    })
                }
                None => Err("Theme not found".into())
            }
        }
    }
}

#[tauri::command]
pub(crate) async fn get_themes(app: AppHandle) -> tauri::Result<Vec<(String, std::path::PathBuf, std::path::PathBuf)>> {
    let themes_path = dirs::config_dir().ok_or("Failed to get config directory").unwrap().join("United Chat").join("themes");

    if !themes_path.exists() {
        std::fs::create_dir_all(&themes_path)?;
        let default_theme = get_theme("default".to_string(), app).await.unwrap();

        let default_theme_path = themes_path.join("default");
        std::fs::create_dir_all(default_theme_path.clone())?;

        let mut file = std::fs::File::create(default_theme_path.join("index.html"))?;
        file.write_all(default_theme.html_code.as_bytes())?;

        let mut css_file = std::fs::File::create(default_theme_path.join("style.css"))?;
        css_file.write_all(default_theme.css_code.as_bytes())?;

        return Ok(vec![("default".to_string(), default_theme_path.join("index.html"), default_theme_path.join("style.css"))]);
    }

    // Get all folders from the themes directory and filter out the ones that are not directories
    let themes = std::fs::read_dir(&themes_path)?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                if e.path().is_dir() {
                    Some(e)
                } else {
                    None
                }
            })
        })
        .map(|entry| {
            let theme_name = entry.file_name().into_string().unwrap();
            let html_path = entry.path().join("index.html");
            let css_path = entry.path().join("style.css");
            (theme_name, html_path, css_path)
        })
        .collect::<Vec<(String, std::path::PathBuf, std::path::PathBuf)>>();

    Ok(themes)
}
