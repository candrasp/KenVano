# Setup KenVano Sidecars

Aplikasi ini menggunakan `yt-dlp` dan `ffmpeg` sebagai sidecar. Karena keterbatasan ukuran file, Anda harus mengunduh binary tersebut secara manual dan meletakkannya di folder yang benar.

## Langkah-langkah:

1.  **Unduh yt-dlp**:
    *   Unduh `yt-dlp.exe` dari [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases).
    *   Rename menjadi `yt-dlp-x86_64-pc-windows-msvc.exe`.
    *   Letakkan di folder: `src-tauri/binaries/`.

2.  **Unduh ffmpeg**:
    *   Unduh `ffmpeg.exe` (biasanya dalam file zip dari [ffmpeg.org](https://ffmpeg.org/download.html) atau [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)).
    *   Rename menjadi `ffmpeg-x86_64-pc-windows-msvc.exe`.
    *   Letakkan di folder: `src-tauri/binaries/`.

## Struktur Folder:

```
src-tauri/
└── binaries/
    ├── ffmpeg-x86_64-pc-windows-msvc.exe
    └── yt-dlp-x86_64-pc-windows-msvc.exe
```

Setelah meletakkan file tersebut, Anda dapat menjalankan aplikasi dengan:

```bash
bun run tauri dev
```

## Fitur yang diimplementasikan:
- [x] UI Native Vanilla (HTML/CSS/JS)
- [x] Integrasi Tauri v2 & Bun
- [x] Command Download Video (Max 720p)
- [x] Command Extract Audio (MP3/AAC)
- [x] Dark Theme Premium Design
