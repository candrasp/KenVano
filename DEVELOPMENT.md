# DEVELOPMENT.md — KenVano

> Dokumentasi teknis lengkap untuk developer.
> Dibuat oleh: **CandraSP** | Versi: **1.1.0**

---

## 📌 Ringkasan Aplikasi

**KenVano** adalah aplikasi desktop **video & audio downloader** yang dibangun dengan framework **Tauri 2**. Aplikasi ini memungkinkan pengguna mengunduh video/audio dari berbagai platform (YouTube, TikTok, Instagram, dll.) langsung ke komputer mereka, tanpa browser.

**Stack Teknologi:**
| Layer | Teknologi |
|---|---|
| Framework | Tauri v2 |
| Frontend | HTML + Vanilla CSS + Vanilla JS (tanpa framework) |
| Backend (Native) | Rust |
| Downloader Engine | `yt-dlp` (sidecar binary) |
| Audio/Video Merger | `ffmpeg` (sidecar binary) |
| Package Manager | Bun |

---

## 🗂️ Struktur Folder

```
kenvano/
│
├── src/                          # Frontend (UI Layer)
│   ├── index.html                # Halaman utama & semua tampilan/view
│   ├── main.js                   # Seluruh logika frontend (JS)
│   ├── styles.css                # Seluruh styling (CSS + animasi)
│   └── assets/
│       ├── fonts/                # Font lokal (Plus Jakarta Sans)
│       │   ├── PlusJakartaSans-Regular.woff2
│       │   ├── PlusJakartaSans-Medium.woff2
│       │   ├── PlusJakartaSans-SemiBold.woff2
│       │   ├── PlusJakartaSans-Bold.woff2
│       │   └── PlusJakartaSans-ExtraBold.woff2
│       └── img/                  # Ikon browser untuk fitur Cookie
│           ├── chrome.png
│           ├── edge.png
│           ├── firefox.png
│           ├── brave.png
│           └── opera.png
│
├── src-tauri/                    # Backend (Rust / Native Layer)
│   ├── src/
│   │   ├── main.rs               # Entry point aplikasi Rust
│   │   └── lib.rs                # Semua command backend (logika utama)
│   ├── binaries/                 # Binary eksternal yang disertakan
│   │   ├── yt-dlp-x86_64-pc-windows-msvc.exe   # Engine downloader
│   │   └── ffmpeg-x86_64-pc-windows-msvc.exe   # Engine konversi audio/video
│   ├── capabilities/
│   │   └── default.json          # Definisi izin/permissions Tauri
│   ├── icons/                    # Ikon aplikasi dalam berbagai ukuran
│   ├── Cargo.toml                # Dependency Rust
│   ├── Cargo.lock                # Lock file Rust
│   ├── tauri.conf.json           # Konfigurasi utama Tauri (window, bundle, dll.)
│   └── build.rs                  # Build script Rust
│
├── package.json                  # Dependency Node/Bun & scripts
├── bun.lock                      # Lock file Bun
├── README.md                     # Dokumentasi pengguna
├── SETUP.md                      # Panduan setup environment
├── RELEASE_NOTES.md              # Catatan perubahan per versi
├── DEVELOPMENT.md                # File ini
├── app-icon.svg                  # Ikon aplikasi (SVG)
├── kenvano-icon-500.png          # Ikon aplikasi (PNG)
└── screenshot.png                # Screenshot untuk README
```

---

## 🧩 Arsitektur Aplikasi

```
+-------------------------------------------------------+
|                     FRONTEND (UI)                     |
|   index.html  ->  main.js  ->  styles.css             |
|   (4 View: Home, History, Settings, Help)             |
+------------------------+------------------------------+
                         |  invoke() / event.listen()
                         |  (Tauri IPC Bridge)
+------------------------v------------------------------+
|                   BACKEND (Rust)                      |
|   src-tauri/src/lib.rs  (Command Handler)             |
+----------+---------------------------+----------------+
           | spawn sidecar            | reqwest HTTP
+----------v----------+   +-----------v--------------+
|  yt-dlp.exe         |   |  Fetch Thumbnail          |
|  ffmpeg.exe         |   |  via reqwest -> base64    |
+---------------------+   +--------------------------+
```

**Cara kerja:** Frontend memanggil fungsi Rust melalui Tauri IPC (`invoke`). Rust menjalankan `yt-dlp` sebagai *sidecar process*, menerima output-nya, lalu mengirim event progress kembali ke frontend via `app.emit()`.

---

## 📄 Detail Setiap File

### `src/index.html`
Satu-satunya file HTML. Memuat **4 View** (halaman) yang ditampilkan bergantian:

| View | ID | Fungsi |
|---|---|---|
| Home | `#view-home` | Input URL, pilih kualitas, tombol download |
| History | `#view-history` | Daftar riwayat unduhan dari localStorage |
| Settings | `#view-settings` | Ganti bahasa, tema, dan pilih browser cookie |
| Help | `#view-help` | Panduan, info update engine, tentang aplikasi |

**Komponen penting di HTML:**
- `#url-input` — Input URL video
- `#location-input` — Tampilan folder tujuan (readonly)
- `#video-info` — Card info video (judul, durasi, sumber)
- `#format-section` — Panel pilih format (Video/Audio) & kualitas
- `#progress-section` — Bar progress download
- `#toast` — Notifikasi pop-up
- `#cookie-modal` — Modal pilih browser untuk cookie bypass
- `.nav-bar` — Navigasi bawah (Home / History / Settings / Help)

---

### `src/main.js`
File JavaScript utama (~1253 baris). Seluruh logika UI ada di sini, dibungkus dalam satu listener `DOMContentLoaded`.

**Bagian-bagian utama:**

#### 1. Context Menu Kustom
```
Fungsi: Mengganti menu klik kanan browser default dengan menu sendiri
        (Paste, Copy, Select All) khusus pada input URL.
```

#### 2. i18n (Internasionalisasi)
```
Fungsi: Menyediakan teks dalam 2 bahasa (Bahasa Indonesia & English).
        Bahasa disimpan di localStorage dengan key "kenvano-lang".
Fungsi kunci: setLanguage(lang) — mengganti semua teks dengan atribut data-i18n
```

#### 3. Settings Logic
```
Fungsi: Mengelola tema (dark/light), bahasa, dan pilihan browser cookie.
        Semua disimpan di localStorage.
Keys localStorage:
  - "kenvano-theme"          -> "dark" atau "light"
  - "kenvano-lang"           -> "id" atau "en"
  - "kenvano-browser-cookie" -> "chrome", "edge", "firefox", "brave", "opera", atau ""
  - "kenvano-save-path"      -> path folder simpan default
```

#### 4. Cookie Modal
```
Fungsi: Modal pop-up yang muncul saat user belum memilih browser.
        Dipakai untuk bypass login menggunakan cookie dari browser terpilih.
Fungsi kunci:
  - showCookieModal(siteName, callback)  — tampilkan modal
  - hideCookieModal()                    — tutup modal
  - getSiteName(url)                     — deteksi nama situs dari URL
```

#### 5. View Navigation
```
Fungsi: Mengatur perpindahan antar halaman (Home/History/Settings/Help)
        dengan efek transisi CSS.
Fungsi kunci: switchView(viewId)
```

#### 6. Silent Auto-Update
```
Fungsi: Saat app pertama dibuka, secara otomatis memanggil backend
        untuk update yt-dlp di background (delay 2 detik).
        Jika berhasil update, tampilkan toast notifikasi.
```

#### 7. URL Input & Validasi
```
Fungsi: Validasi URL secara real-time saat user mengetik/paste.
        Cek apakah URL valid (http/https) dan apakah situs didukung.
Fungsi kunci:
  - isValidUrl(str)     — cek format URL
  - isSupportedUrl(str) — cek apakah situs ada di whitelist
  - checkUrlStatus()    — update tampilan error
  - onUrlChange()       — dipanggil setelah debounce, trigger fetch info video
```

#### 8. Fetch Video Info
```
Fungsi: Setelah URL valid dimasukkan, panggil backend untuk ambil metadata
        video (judul, durasi, format tersedia, thumbnail).
        Juga mengelola logika kualitas mana saja yang bisa dipilih.
Fungsi kunci:
  - onUrlChange()               — entry point, dengan debounce 400ms
  - fetchVideoInfoInternal()    — kirim invoke("get_video_info") ke Rust,
                                  tampilkan hasilnya, atur opsi kualitas
```

#### 9. Download Process
```
Fungsi: Menangani alur lengkap proses download dari tombol "Download" ditekan
        sampai file tersimpan di disk.
Fungsi kunci:
  - performDownload(url, browser) — kirim invoke("download_video") ke Rust,
                                    update progress bar via event listener,
                                    simpan ke history saat selesai
```

#### 10. History Management
```
Fungsi: Menyimpan & menampilkan riwayat download (maks. 20 item) di localStorage.
Fungsi kunci:
  - saveToHistory(item)        — tambah item baru ke history
  - getHistory()               — ambil history dari localStorage
  - renderHistory()            — render daftar history ke DOM
  - deleteHistoryItem(id,path) — hapus dari history (+ opsional hapus file fisik)
  - openHistoryFolder(path)    — buka folder file via invoke("open_folder")
```

#### 11. Toast Notification
```
Fungsi: Tampilkan notifikasi pop-up di sudut layar (sukses/error/info)
        yang menghilang otomatis setelah 4 detik.
Fungsi kunci: showToast(type, title, message)
```

#### 12. Progress Bar (Real-time)
```
Fungsi: Menerima event "download-progress" dari Rust via listen() Tauri.
        Untuk fase konversi (setelah download 100%), simulasikan progress
        animasi berdasarkan durasi video.
```

---

### `src/styles.css`
File CSS tunggal (~30KB). Mengandung seluruh desain sistem aplikasi.

**Fitur utama:**
- CSS Custom Properties (variabel) untuk tema dark/light
- Layout: mobile-like (max-width: 420px, fixed bottom nav)
- Komponen: card, tab, toggle, progress bar, toast, modal, history item
- Animasi: skeleton loading, progress indeterminate, toast slide-in

---

### `src-tauri/src/lib.rs`
Backend utama dalam Rust. Berisi semua **Tauri Command** yang dapat dipanggil dari frontend.

#### Daftar Command (API Backend):

| Command | Fungsi |
|---|---|
| `download_video` | Jalankan yt-dlp untuk mengunduh video/audio. Kirim progress via event. |
| `cancel_download` | Hentikan proses download yang sedang berjalan (kill process + hapus file sementara). |
| `get_video_info` | Ambil metadata video (judul, durasi, format) via yt-dlp -j. Timeout 15 detik. |
| `get_thumbnail_base64` | Download thumbnail dari URL dan kembalikan sebagai string base64. |
| `get_file_size` | Baca ukuran file dari disk (dalam bytes). |
| `open_folder` | Buka folder di file explorer OS (Windows: explorer /select, macOS: open -R, Linux: xdg-open). |
| `delete_file` | Hapus file dari disk. |
| `update_engine` | Jalankan yt-dlp -U untuk update otomatis engine ke versi terbaru. |
| `relaunch_app` | Restart aplikasi secara programatik. |
| `test_progress` | (Debug) Emit event progress palsu untuk testing. |

#### State Management (Rust):
```rust
// Melacak sesi download aktif + child process yt-dlp
pub struct DownloadState(pub Mutex<(u64, Option<CommandChild>)>);
//                                  ^     ^
//                              session_id  child process
```
- **Session ID** bertambah setiap download baru dimulai. Digunakan untuk mendeteksi apakah download sudah di-cancel (stale session).
- **Child process** disimpan agar bisa di-kill saat `cancel_download` dipanggil.

---

### `src-tauri/src/main.rs`
Entry point Rust yang sangat singkat — hanya memanggil `lib::run()`.

---

### `src-tauri/tauri.conf.json`
Konfigurasi aplikasi Tauri:
- **Window**: 420x690px, tidak bisa di-resize
- **Security (CSP)**: Izinkan Google Fonts, data URI untuk gambar
- **External Binaries**: ffmpeg dan yt-dlp didaftarkan sebagai sidecar
- **Bundle**: Target installer NSIS (Windows), install per-user

---

### `src-tauri/capabilities/default.json`
Mendefinisikan izin yang diberikan ke window utama:
- `shell:allow-execute` — Izin menjalankan yt-dlp dan ffmpeg
- `dialog:default` — Izin dialog pilih folder
- `clipboard-manager:allow-read-text` & `allow-write-text` — Izin clipboard
- `core:event:allow-listen` — Izin menerima event dari backend

---

### `src-tauri/Cargo.toml`
Dependency Rust yang digunakan:

| Crate | Kegunaan |
|---|---|
| `tauri` | Framework utama |
| `tauri-plugin-shell` | Menjalankan sidecar binary (yt-dlp, ffmpeg) |
| `tauri-plugin-dialog` | Dialog pilih folder |
| `tauri-plugin-opener` | Membuka file/URL eksternal |
| `tauri-plugin-clipboard-manager` | Akses clipboard |
| `reqwest` | HTTP client untuk download thumbnail |
| `base64` | Encode gambar thumbnail ke base64 |
| `serde` / `serde_json` | Serialisasi data JSON |
| `tokio` | Async runtime (untuk timeout) |

---

### `src-tauri/binaries/`
Binary eksternal yang di-bundle bersama aplikasi:
- **`yt-dlp-x86_64-pc-windows-msvc.exe`** (~18MB) — Engine download utama
- **`ffmpeg-x86_64-pc-windows-msvc.exe`** (~101MB) — Digunakan yt-dlp untuk merge video+audio & konversi ke MP3

> Nama file mengikuti format Tauri: `{nama}-{target-triple}.exe`

---

## 🔄 Alur Kerja Utama (Flow)

### Flow Download Video

```
User paste URL
    -> onUrlChange() [debounce 400ms]
    -> isValidUrl() + isSupportedUrl()
    -> showCookieModal() jika browser belum dipilih
    -> fetchVideoInfoInternal()
        -> invoke("get_video_info") [Rust: jalankan yt-dlp -j]
        -> Tampilkan info + opsi kualitas

User klik "Download"
    -> performDownload(url, browser)
    -> invoke("download_video") [Rust]
        -> Deteksi situs dari URL (youtube, tiktok, dll.)
        -> Tentukan tipe format (mp3 / video)
        -> Buat subfolder jika belum ada (misal: "youtube video" atau "youtube mp3")
        -> Jalankan yt-dlp dengan target path ke subfolder tersebut
        -> Rust: emit("download-progress", pct) setiap ada progress
        -> JS: listen("download-progress") -> update progress bar
    -> Selesai -> saveToHistory() -> showToast("success")
```

### Flow Cancel Download

```
User klik "Cancel"
    -> invoke("cancel_download") [Rust]
        -> lock.0 += 1  (invalidate session ID)
        -> child.kill() (kill yt-dlp process)
        -> taskkill /F /T untuk yt-dlp dan ffmpeg (Windows)
    -> Loop di Rust deteksi session_id berubah -> return Err("CANCELED")
    -> Cleanup file sementara dari disk
    -> JS: error "CANCELED" -> tidak tampilkan error toast
```

---

## 💾 Data yang Disimpan (localStorage)

| Key | Tipe | Isi |
|---|---|---|
| `kenvano-lang` | string | Bahasa aktif: "id" atau "en" |
| `kenvano-theme` | string | Tema: "dark" atau "light" |
| `kenvano-save-path` | string | Path folder simpan default |
| `kenvano-browser-cookie` | string | Browser cookie: "chrome", "edge", dll. atau "" |
| `kenvano-history` | JSON string | Array max 20 item riwayat download |

**Struktur satu item history:**
```json
{
  "id": "1720000000000",
  "title": "Nama Video",
  "source": "YouTube",
  "format": "MP4",
  "size": "720p",
  "fileSize": "45.3 MB",
  "duration": "05:32",
  "thumbnail": "data:image/jpeg;base64,...",
  "path": "C:\\Users\\User\\Downloads\\NamaVideo_video.mp4",
  "timestamp": 1720000000000
}
```

---

## 🛠️ Cara Menjalankan (Dev Mode)

```bash
# Install dependency
bun install

# Jalankan dev mode (hot-reload frontend, Rust dikompilasi ulang)
bun run dev
# atau
bunx tauri dev
```

## 📦 Build Produksi

```bash
bunx tauri build
```
Output: `src-tauri/target/release/bundle/nsis/KenVano_1.1.0_x64-setup.exe`

---

## ⚠️ Catatan Penting untuk Developer

1. **Menambah command baru**: Definisikan fungsi `#[tauri::command]` di `lib.rs`, lalu daftarkan di `tauri::generate_handler![]` dan panggil via `invoke("nama_command")` di JS.

2. **Binary yt-dlp/ffmpeg**: Harus menggunakan nama dengan *target triple* (`-x86_64-pc-windows-msvc`). Jika mengganti binary, pastikan nama sesuai.

3. **CSP (Content Security Policy)**: Diatur di `tauri.conf.json`. Jika ada resource eksternal baru, tambahkan ke CSP.

4. **Permissions baru**: Setiap plugin/fitur baru perlu didaftarkan di `capabilities/default.json`.

5. **Session ID Pattern**: Pattern `session_id` di Rust adalah mekanisme cancel yang aman. Jangan dihapus — ini yang memastikan file sementara dibersihkan saat download dibatalkan.

6. **Thumbnail**: Di-download via Rust (`get_thumbnail_base64`) karena CSP di Tauri memblokir direct `<img src="https://...">` yang datang dari domain luar secara dinamis.

---

*Dokumentasi ini dibuat berdasarkan analisis kode sumber. Update setiap ada perubahan signifikan.*
