use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

pub struct DownloadState(pub Mutex<(u64, Option<CommandChild>)>);

#[tauri::command]
async fn download_video(
    app: AppHandle,
    state: State<'_, DownloadState>,
    url: String,
    title: String,
    format: String,
    quality: String,
    output_dir: String,
    browser: String,
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
        "--no-colors".to_string(),
        "--newline".to_string(),
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

    if !browser.is_empty() {
        args.push("--cookies-from-browser".to_string());
        args.push(browser);
    }

    args.push(url);

    let sidecar = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;

    let session_id: u64;
    {
        let mut lock = state.0.lock().unwrap();
        lock.0 += 1; // Increment session ID
        session_id = lock.0;
        
        if let Some(old_child) = lock.1.take() {
            println!("[Rust] Killing existing child before starting new one (Session {})...", session_id - 1);
            let _ = old_child.kill();
        }
    }

    let (mut rx, child) = sidecar
        .args(args)
        .spawn()
        .map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?;

    // Store child process for cancellation
    {
        let mut lock = state.0.lock().unwrap();
        lock.1 = Some(child);
    }

    let mut last_error = String::new();

    while let Some(event) = rx.recv().await {
        // VALIDATE SESSION: Stop if this download has been canceled or replaced
        {
            let lock = state.0.lock().unwrap();
            if lock.0 != session_id {
                println!("[Rust] Session {} is no longer active. Aborting loop. Cleaning up...", session_id);
                
                // Wait a bit for the OS to release file handles after killing the process
                std::thread::sleep(std::time::Duration::from_millis(300));
                
                // POWER CLEANUP: Scan directory for any remnant files matching this download
                if let Some(parent) = final_path.parent() {
                    if let Ok(entries) = std::fs::read_dir(parent) {
                        // Extract a unique enough part of the filename to search for
                        // We use the sanitized_title which is the core of our filename
                        let search_pattern = sanitized_title.clone();
                        
                        for entry in entries.flatten() {
                            let path = entry.path();
                            if path.is_file() {
                                if let Some(filename) = path.file_name() {
                                    let filename_str = filename.to_string_lossy();
                                    // If the file contains our title and is not a hidden file
                                    if filename_str.contains(&search_pattern) && !filename_str.starts_with('.') {
                                        println!("[Rust] Power cleaning remnant: {:?}", path);
                                        let _ = std::fs::remove_file(path);
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Also explicitly try to delete the final path itself
                let _ = std::fs::remove_file(&final_path);
                
                return Err("CANCELED".to_string());
            }
        }

        match event {
            CommandEvent::Stdout(line) => {
                let out = String::from_utf8_lossy(&line);
                
                if out.contains("%") {
                    for part in out.split_whitespace() {
                        if part.contains("%") {
                            // Extract only digits and decimal point
                            let clean_pct: String = part.chars().filter(|c| c.is_digit(10) || *c == '.').collect();
                            if let Ok(pct) = clean_pct.parse::<f32>() {
                                println!("Rust parsed progress: {}", pct);
                                if let Err(e) = app.emit("download-progress", pct) {
                                    println!("Failed to emit progress: {}", e);
                                }
                                break;
                            }
                        }
                    }
                } else if !out.trim().is_empty() {
                    println!("yt-dlp out: {}", out.trim());
                }

                // Detect post-processing phases
                let out_lower = out.to_lowercase();
                if out_lower.contains("extractaudio") || out_lower.contains("ffmpeg") || out_lower.contains("merger") || (out_lower.contains("destination:") && out_lower.contains(".mp3")) {
                    println!("--> TRIGGER CONVERTING STATUS");
                    let _ = app.emit("download-status", "Converting...");
                }
            }
            CommandEvent::Stderr(line) => {
                let err_str = String::from_utf8_lossy(&line).to_string();
                println!("yt-dlp err: {}", err_str);
                last_error.push_str(&err_str);
                last_error.push('\n');
                
                // yt-dlp sometimes outputs progress to stderr
                if err_str.contains("%") {
                    for part in err_str.split_whitespace() {
                        if part.contains("%") {
                            let clean_pct: String = part.chars().filter(|c| c.is_digit(10) || *c == '.').collect();
                            if let Ok(pct) = clean_pct.parse::<f32>() {
                                println!("Rust stderr parsed progress: {}", pct);
                                if let Err(e) = app.emit("download-progress", pct) {
                                    println!("Failed to emit progress: {}", e);
                                }
                                break;
                            }
                        }
                    }
                }

                // Also detect status from stderr
                let err_lower = err_str.to_lowercase();
                if err_lower.contains("extractaudio") || err_lower.contains("ffmpeg") || err_lower.contains("merger") || (err_lower.contains("destination:") && err_lower.contains(".mp3")) {
                    println!("--> TRIGGER CONVERTING STATUS STDERR");
                    let _ = app.emit("download-status", "Converting...");
                }
            }
            CommandEvent::Terminated(payload) => {
                let mut lock = state.0.lock().unwrap();
                lock.1 = None;
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
    lock.0 += 1; // Invalidate current session ID
    
    if let Some(child) = lock.1.take() {
        println!("[Rust] Manual cancel requested (Session {}). Killing process tree...", lock.0 - 1);
        let _ = child.kill();
        
        // Aggressive kill for Windows process trees
        #[cfg(windows)]
        {
            // Kill by image name (trying both sidecar name and generic name)
            let names = [
                "yt-dlp-x86_64-pc-windows-msvc.exe",
                "yt-dlp.exe",
                "ffmpeg-x86_64-pc-windows-msvc.exe",
                "ffmpeg.exe"
            ];
            
            for name in names {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/T", "/IM", name])
                    .creation_flags(0x08000000) // CREATE_NO_WINDOW
                    .spawn();
            }
        }
    } else {
        println!("[Rust] Cancel requested but no active process found.");
    }
    Ok(())
}

#[tauri::command]
async fn get_video_info(app: AppHandle, url: String, browser: String) -> Result<serde_json::Value, String> {
    let sidecar = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?;

    let mut args = vec!["--no-warnings".to_string(), "-j".to_string(), url];
    if !browser.is_empty() {
        args.push("--cookies-from-browser".to_string());
        args.push(browser);
    }

    // Add a 15-second timeout to avoid "loading" hang
    let output_future = sidecar.args(args).output();
    let timeout_duration = std::time::Duration::from_secs(15);
    
    let output = tokio::time::timeout(timeout_duration, output_future)
        .await
        .map_err(|_| "Fetching info timed out (15s). Please make sure your browser is closed if using cookies.".to_string())?
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
fn relaunch_app(app: tauri::AppHandle) {
    app.restart();
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
async fn test_progress(app: AppHandle) -> Result<(), String> {
    for i in 1..=5 {
        std::thread::sleep(std::time::Duration::from_secs(1));
        let _ = app.emit("download-progress", serde_json::json!((i * 20) as f32));
    }
    Ok(())
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
        .manage(DownloadState(Mutex::new((0, None))))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<DownloadState>();
                if let Ok(mut lock) = state.0.lock() {
                    if let Some(child) = lock.1.take() {
                        println!("Cleaning up background process on exit...");
                        let _ = child.kill();
                    }
                };
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            download_video,
            get_video_info,
            cancel_download,
            open_folder,
            delete_file,
            get_thumbnail_base64,
            update_engine,
            get_file_size,
            test_progress,
            relaunch_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
