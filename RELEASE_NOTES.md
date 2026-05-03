# Release Notes - KenVano Premium Downloader

## [1.0.0] - 2026-05-03

### 🚀 Highlights
Rilis perdana **KenVano Premium Downloader**, aplikasi pengunduh video dan audio lintas platform yang cepat, ringan, dan elegan. Dibangun menggunakan teknologi **Tauri v2** dan **Rust** untuk performa maksimal.

### ✨ Fitur Baru
- **Multi-Platform Support**: Unduh video dari YouTube, TikTok (tanpa watermark), Instagram (Reels), Twitter (X), Facebook, dan ribuan situs lainnya.
- **High Quality Video**: Mendukung pengunduhan hingga kualitas **Full HD (1080p)** untuk YouTube dan kualitas terbaik untuk platform lain.
- **Smart Audio Converter**: Ubah video apa pun menjadi format **MP3** berkualitas tinggi dengan indikator progres konversi yang akurat.
- **Premium UI/UX**: Antarmuka modern dengan tema **Developer Slate & Blue** yang nyaman di mata, mendukung Mode Gelap (*Dark Mode*).
- **Dual Language**: Tersedia dalam Bahasa Indonesia dan Bahasa Inggris yang dapat diganti secara instan.
- **Advanced History**: Riwayat unduhan yang cerdas, menampilkan thumbnail, durasi, format file (MP4/MP3), serta ukuran file asli.
- **Direct Actions**: Buka folder penyimpanan atau hapus file (termasuk file fisik) langsung dari dalam aplikasi.

### 🛠️ Perbaikan & Optimasi
- **Zero-Stall Loading**: Optimasi penanganan metadata video untuk mencegah UI membeku (*stuck*) saat memasukkan URL.
- **Indeterminate Progress**: Penambahan animasi progres pada tahap konversi audio agar pengguna tahu aplikasi tetap bekerja.
- **Smart Error Handling**: Pesan kesalahan yang lebih ramah pengguna jika terjadi kegagalan jaringan atau URL tidak valid.
- **Resource Efficient**: Penggunaan memori yang sangat rendah berkat backend Rust.
- **Auto-Update Engine**: Fitur pembaruan mesin pengunduh (`yt-dlp`) langsung dari dalam aplikasi untuk memastikan kompatibilitas dengan perubahan algoritma platform.

### 📦 Informasi Teknis
- **Backend**: Rust / Tauri v2
- **Frontend**: Vanilla JS / CSS3 / HTML5
- **Engine**: yt-dlp & FFmpeg
- **Typeface**: Plus Jakarta Sans

---
*Dikembangkan dengan ❤️ oleh CandraSP*
