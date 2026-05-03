use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

pub struct DownloadState(pub Mutex<Option<CommandChild>>);

#[tauri::command]
async fn download_video(
    app: AppHandle,
    state: State<'_, DownloadState>,
    url: String,
    title: String,
    format: String,
    quality: String,
    output_dir: String,
) -> Result<String, String> {
    // Sanitize the title by removing illegal characters
    let sanitized_title = title.replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], "");
    
    let suffix = if format == "mp3" { "_audio" } else { "_video" };
    let ext = if format == "mp3" { "mp3" } else { "mp4" };
    
    let mut final_filename = format!("{}{}.{}", sanitized_title, suffix, ext);
    let mut final_path = std::path::Path::new(&output_dir).join(&final_filename);
    
    let mut counter = 0;
    while final_path.exists() {
        counter += 1;
        final_filename = format!("{}{} ({}).{}", sanitized_title, suffix, counter, ext);
        final_path = std::path::Path::new(&output_dir).join(&final_filename);
    }

    let mut args = vec![
        "--no-warnings".to_string(),
        "-o".to_string(),
        final_path.to_string_lossy().to_string(),
        "--no-playlist".to_string(),
    ];

    if format == "mp3" {
        args.push("-x".to_string());
        args.push("--audio-format".to_string());
        args.push("mp3".to_string());
        args.push("--audio-quality".to_string());
        let abr = match quality.as_str() {
            "64" => "64K",
            "128" => "128K",
            "192" => "192K",
            _ => "128K",
        };
        args.push(abr.to_string());
    } else {
        let height = match quality.as_str() {
            "360" => "360",
            "480" => "480",
            "720" => "720",
            "1080" => "1080",
            "best" => "9999", // High number for original quality
            _ => "720",
        };
        args.push("-f".to_string());
        args.push(format!(
            "bestvideo[height<=?{}]+bestaudio/best[height<=?{}]/best",
            height, height
        ));
        args.push("--merge-output-format".to_string());
        args.push("mp4".to_string());
    }

    args.push(url);

    let sidecar = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;

    let (mut rx, child) = sidecar
        .args(args)
        .spawn()
        .map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?;

    // Store child process for cancellation
    {
        let mut lock = state.0.lock().unwrap();
        *lock = Some(child);
    }

    let mut last_error = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let out = String::from_utf8_lossy(&line);
                
                // Detect post-processing phases
                if out.contains("[ExtractAudio]") || out.contains("[ffmpeg]") || out.contains("[Merger]") {
                    let _ = app.emit("download-status", "Converting...");
                }

                if out.contains("%") {
                    let parts: Vec<&str> = out.split_whitespace().collect();
                    for part in parts {
                        if part.contains("%") {
                            let clean_pct = part.replace("%", "");
                            if let Ok(pct) = clean_pct.parse::<f32>() {
                                let _ = app.emit("download-progress", pct);
                            }
                        }
                    }
                }
            }
            CommandEvent::Stderr(line) => {
                let err_str = String::from_utf8_lossy(&line).to_string();
                println!("yt-dlp err: {}", err_str);
                last_error.push_str(&err_str);
                last_error.push('\n');
            }
            CommandEvent::Terminated(payload) => {
                let mut lock = state.0.lock().unwrap();
                *lock = None;
                if payload.code == Some(0) {
                    return Ok(final_path.to_string_lossy().to_string());
                } else {
                    return Err(format!("Error: {}", last_error.trim()));
                }
            }
            _ => {}
        }
    }

    Ok("Process finished".to_string())
}

#[tauri::command]
async fn cancel_download(state: State<'_, DownloadState>) -> Result<(), String> {
    let mut lock = state.0.lock().unwrap();
    if let Some(child) = lock.take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_video_info(app: AppHandle, url: String) -> Result<serde_json::Value, String> {
    let sidecar = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;

    let output = sidecar
        .args(["--no-warnings", "-j", &url])
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if output.status.success() {
        let info: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        Ok(info)
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("yt-dlp error: {}", err))
    }
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    println!("Opening folder for path: {}", path);
    #[cfg(target_os = "windows")]
    {
        // Normalize path to use backslashes for Windows
        let normalized_path = path.replace("/", "\\");
        
        // Using explorer.exe /select, "path"
        // Separating them often works better with std::process::Command quoting
        let _ = std::process::Command::new("explorer")
            .arg("/select,")
            .arg(normalized_path)
            .spawn()
            .map_err(|e| e.to_string())?;
        
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let parent = std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new(""));
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    if std::path::Path::new(&path).exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_thumbnail_base64(url: String) -> Result<String, String> {
    if url.is_empty() { return Ok("".to_string()); }
    
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to fetch image: {}", e))?;
    
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;
    
    use base64::{engine::general_purpose, Engine as _};
    let b64 = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:image/jpeg;base64,{}", b64))
}

#[tauri::command]
async fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_engine(app: AppHandle) -> Result<String, String> {
    let sidecar = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;
        
    let output = sidecar
        .args(["-U"])
        .output()
        .await
        .map_err(|e| format!("Failed to run update: {}", e))?;
        
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(err.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DownloadState(Mutex::new(None)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            download_video,
            get_video_info,
            cancel_download,
            open_folder,
            delete_file,
            get_thumbnail_base64,
            update_engine,
            get_file_size
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
