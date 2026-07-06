const { invoke } = window.__TAURI__.core;

document.addEventListener("DOMContentLoaded", () => {
  // Custom Context Menu Logic
  const customCtx = document.getElementById("custom-context-menu");
  let activeInput = null;

  document.addEventListener("contextmenu", (e) => {
    const isInput = e.target.closest("input") || e.target.closest("textarea") || e.target.isContentEditable;
    
    if (isInput) {
      e.preventDefault();
      activeInput = e.target.closest("input") || e.target.closest("textarea");
      
      const x = e.clientX;
      const y = e.clientY;
      
      customCtx.style.left = `${x}px`;
      customCtx.style.top = `${y}px`;
      customCtx.classList.remove("hidden");
    } else {
      customCtx.classList.add("hidden");
      e.preventDefault();
    }
  });

  document.addEventListener("click", () => {
    customCtx.classList.add("hidden");
  });

  document.getElementById("ctx-paste").addEventListener("click", async () => {
    if (activeInput) {
      try {
        const text = await window.__TAURI__.clipboardManager.readText();
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        activeInput.value = activeInput.value.substring(0, start) + text + activeInput.value.substring(end);
        activeInput.dispatchEvent(new Event("input"));
        activeInput.focus();
        checkUrlStatus();
      } catch (err) {
        console.error("Failed to read clipboard:", err);
      }
    }
  });

  document.getElementById("ctx-copy").addEventListener("click", async () => {
    if (activeInput) {
      const text = activeInput.value.substring(activeInput.selectionStart, activeInput.selectionEnd) || activeInput.value;
      await window.__TAURI__.clipboardManager.writeText(text);
    }
  });

  document.getElementById("ctx-select-all").addEventListener("click", () => {
    if (activeInput) {
      activeInput.select();
      activeInput.focus();
    }
  });

  // Disable developer shortcuts (F12, Ctrl+Shift+I, etc.)
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
      (e.ctrlKey && e.key === "U")
    ) {
      e.preventDefault();
    }
  });

  // ─── Elements ────────────────────────────────
  const urlInput = document.getElementById("url-input");
  const urlClear = document.getElementById("url-clear");
  const locationInput = document.getElementById("location-input");
  const btnBrowse = document.getElementById("btn-browse");
  const videoInfo = document.getElementById("video-info");
  const videoTitle = document.getElementById("video-title");
  const videoDuration = document.getElementById("video-duration");
  const videoSource = document.getElementById("video-source");
  const sourceLogo = document.getElementById("source-logo");
  const formatSection = document.getElementById("format-section");
  const tabVideo = document.getElementById("tab-video");
  const tabAudio = document.getElementById("tab-audio");
  const panelVideo = document.getElementById("panel-video");
  const panelAudio = document.getElementById("panel-audio");
  const qualityGrid = document.getElementById("quality-grid");
  const originalQualityContainer = document.getElementById("original-quality-container");
  const optOriginal = document.getElementById("opt-original");
  const btnDownload = document.getElementById("btn-download");
  const btnCancel = document.getElementById("btn-cancel");
  const themeToggle = document.getElementById("theme-toggle");
  const progressFill = document.getElementById("progress-fill");
  const progressPercent = document.getElementById("progress-percent");
  const progressTitle = document.getElementById("progress-title");
  const progressDetail = document.getElementById("progress-detail");
  const progressFooter = document.getElementById("progress-footer");
  const btnReload = document.getElementById("btn-reload");
  const btnCancelProgress = document.getElementById("btn-cancel-progress");
  const progressSection = document.getElementById("progress-section");
  const toast = document.getElementById("toast");
  const toastIcon = document.getElementById("toast-icon");
  const toastTitle = document.getElementById("toast-title");
  const toastMessage = document.getElementById("toast-message");
  const urlError = document.getElementById("url-error");
  const urlWrapper = document.querySelector(".url-input-wrapper");

  const navItems = document.querySelectorAll(".nav-item");
  const viewPages = document.querySelectorAll(".view-page");

  let currentTab = "video";
  let isDownloading = false;
  let isConverting = false;
  let conversionInterval = null;
  let selectedPath = localStorage.getItem("kenvano-save-path") || "";
  let currentThumbnail = "";
  let currentDuration = "";
  let rawDurationSeconds = 0;
  if (selectedPath) {
    locationInput.value = selectedPath;
  }

  // ─── i18n (Internationalization) ─────────────
  const i18n = {
    id: {
      url_label: "Tempel URL video",
      url_hint: "Mendukung YouTube, TikTok, Instagram, Twitter & lainnya",
      save_label: "Simpan ke",
      btn_browse: "Telusuri",
      tab_video: "Video",
      tab_audio: "Audio",
      opt_original: "Kualitas Asli",
      opt_original_desc: "Terbaik dari sumber",
      out_mp4: "Format: MP4",
      out_mp3: "Format: MP3",
      btn_cancel: "Batal",
      btn_download: "Unduh",
      btn_reload: "Muat Ulang",
      history_title: "Riwayat Unduhan",
      history_empty: "Belum ada riwayat unduhan",
      help_title: "Bantuan & Dukungan",
      help_how_title: "Cara Mengunduh",
      help_how_desc: "Salin URL video, tempel di kotak input, lalu tekan Unduh.",
      help_format_title: "Format & Kualitas",
      help_format_desc: "Pilih tab Video untuk MP4 atau tab Audio untuk MP3.",
      help_update_title: "Update Engine",
      help_update_desc: "Perbarui mesin downloader untuk mendukung algoritma terbaru.",
      btn_update: "Cek Pembaruan",
      help_about_title: "Tentang KenVano",
      help_about_desc: "KenVano Premium Downloader v1.1.2<br>Dikembangkan oleh <strong>CandraSP</strong>",
      help_cookie_title: "Bypass Login (Cookie)",
      help_cookie_desc: "Gunakan cookie browser untuk unduh video private.",
      modal_cookie_title: "Gunakan Login Browser",
      modal_cookie_desc1: "Pilih browser yang Anda gunakan untuk login di",
      modal_cookie_desc2: "agar sistem bisa meminjam izin akses (cookie) dari sana untuk proses unduhan tanpa error.<br><br><strong>Catatan:</strong> Jika browser sedang terbuka, silakan tutup dan buka kembali agar data sinkron.",
      nav_home: "Beranda",
      nav_history: "Riwayat",
      nav_settings: "Pengaturan",
      nav_help: "Bantuan",
      settings_lang: "Bahasa",
      settings_theme: "Tema",
      settings_relaunch_btn: "Restart Aplikasi",
      settings_relaunch_hint: "Gunakan jika aplikasi terasa lambat atau loading terus menerus.",
      ctx_paste: "Tempel",
      ctx_copy: "Salin",
      ctx_select_all: "Pilih Semua",
      url_invalid: "URL tidak valid. Pastikan alamat dimulai dengan http:// atau https://",
      url_unsupported: "Situs ini tidak didukung atau bukan penyedia video.",
      converting: "Mengonversi..."
    },
    en: {
      url_label: "Paste video URL",
      url_hint: "Supports YouTube, TikTok, Instagram, Twitter & more",
      save_label: "Save to",
      btn_browse: "Browse",
      tab_video: "Video",
      tab_audio: "Audio",
      opt_original: "Original Quality",
      opt_original_desc: "Best from source",
      out_mp4: "Format: MP4",
      out_mp3: "Format: MP3",
      btn_cancel: "Cancel",
      btn_download: "Download",
      btn_reload: "Reload",
      history_title: "Download History",
      history_empty: "No download history yet",
      help_title: "Help & Support",
      help_how_title: "How to Download",
      help_how_desc: "Copy video URL, paste into the input box, then press Download.",
      help_format_title: "Format & Quality",
      help_format_desc: "Select Video tab for MP4 or Audio tab for MP3.",
      help_update_title: "Engine Update",
      help_update_desc: "Update the downloader engine to support the latest algorithms.",
      btn_update: "Check for Updates",
      help_about_title: "About KenVano",
      help_about_desc: "KenVano Premium Downloader v1.1.2<br>Developed by <strong>CandraSP</strong>",
      help_cookie_title: "Bypass Login (Cookies)",
      help_cookie_desc: "Use browser cookies to download private videos.",
      modal_cookie_title: "Use Browser Login",
      modal_cookie_desc1: "Select the browser you use to log in to",
      modal_cookie_desc2: "so the system can use its access permission (cookies) for a smooth download without errors.<br><br><strong>Note:</strong> If the browser is currently open, please close and reopen it to sync data.",
      nav_home: "Home",
      nav_history: "History",
      nav_settings: "Settings",
      nav_help: "Help",
      settings_lang: "Language",
      settings_theme: "Theme",
      settings_relaunch_btn: "Restart Application",
      settings_relaunch_hint: "Use if the app feels slow or keeps loading.",
      ctx_paste: "Paste",
      ctx_copy: "Copy",
      ctx_select_all: "Select All",
      url_invalid: "Invalid URL. Please make sure it starts with http:// or https://",
      url_unsupported: "This site is not supported or is not a video provider.",
      converting: "Converting..."
    }
  };

  let currentLang = localStorage.getItem("kenvano-lang") || "id";
  const toggleLang = document.getElementById("toggle-lang");
  const toggleTheme = document.getElementById("toggle-theme");
  const toggleBrowser = document.getElementById("toggle-browser");

  // ─── Settings Logic ─────────────────────────
  let selectedBrowser = localStorage.getItem("kenvano-browser-cookie") || "";

  function updateToggleGroup(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    const buttons = group.querySelectorAll("button");
    buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.value === value);
    });
  }

  if (toggleBrowser) {
    updateToggleGroup("toggle-browser", selectedBrowser);
    toggleBrowser.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedBrowser = btn.dataset.value;
        localStorage.setItem("kenvano-browser-cookie", selectedBrowser);
        updateToggleGroup("toggle-browser", selectedBrowser);
      });
    });
  }

  if (toggleLang) {
    updateToggleGroup("toggle-lang", currentLang);
    toggleLang.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        setLanguage(btn.dataset.value);
      });
    });
  }

  if (toggleTheme) {
    const savedTheme = document.documentElement.getAttribute("data-theme") || "dark";
    updateToggleGroup("toggle-theme", savedTheme);
    toggleTheme.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const theme = btn.dataset.value;
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("kenvano-theme", theme);
        updateToggleGroup("toggle-theme", theme);
      });
    });
  }

  const btnRelaunch = document.getElementById("btn-relaunch");
  if (btnRelaunch) {
    btnRelaunch.addEventListener("click", async () => {
      await invoke("relaunch_app");
    });
  }

  // Theme init
  const savedTheme = localStorage.getItem("kenvano-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateToggleGroup("toggle-theme", savedTheme);

  // ─── Cookie Modal Logic ──────────────────────
  const cookieModal = document.getElementById("cookie-modal");
  const modalSiteName = document.getElementById("modal-site-name");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnSkipCookie = document.getElementById("btn-skip-cookie");
  const browserBtns = document.querySelectorAll(".browser-btn");

  let modalCallback = null;

  function showCookieModal(siteName, callback) {
    if (modalSiteName) modalSiteName.textContent = siteName;
    if (cookieModal) cookieModal.classList.remove("hidden");
    modalCallback = callback;
  }

  function hideCookieModal() {
    if (cookieModal) cookieModal.classList.add("hidden");
    modalCallback = null;
  }

  if (btnCloseModal) btnCloseModal.addEventListener("click", hideCookieModal);
  if (btnSkipCookie) {
    btnSkipCookie.addEventListener("click", () => {
      hideCookieModal();
      if (modalCallback) modalCallback("");
    });
  }

  browserBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const browser = btn.dataset.browser;
      selectedBrowser = browser;
      updateToggleGroup("toggle-browser", browser);
      localStorage.setItem("kenvano-browser-cookie", browser);
      hideCookieModal();
      if (modalCallback) modalCallback(browser);
    });
  });

  function getSiteName(url) {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YouTube";
      if (hostname.includes("tiktok.com")) return "TikTok";
      if (hostname.includes("instagram.com")) return "Instagram";
      if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "Twitter/X";
      if (hostname.includes("facebook.com")) return "Facebook";
      return hostname.replace("www.", "");
    } catch {
      return "Situs ini";
    }
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("kenvano-lang", lang);

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (i18n[lang] && i18n[lang][key]) {
        el.innerHTML = i18n[lang][key]; // innerHTML digunakan untuk mendukung tag <br> dan <strong>
      }
    });

    updateToggleGroup("toggle-lang", lang);
  }

  // Init language
  setLanguage(currentLang);

  // ─── Silent Auto-Update ─────────────────────
  setTimeout(async () => {
    console.log("[KenVano] Memulai pengecekan update otomatis di latar belakang...");
    try {
      const result = await invoke("update_engine");
      console.log("[KenVano] Hasil pengecekan update:", result);

      if (!result.toLowerCase().includes("up to date")) {
        console.log("[KenVano] Engine berhasil diperbarui!");
        showToast("success", "Engine Diperbarui", "Mesin pengunduh otomatis diperbarui ke versi terbaru di latar belakang.");
      } else {
        console.log("[KenVano] Engine sudah versi terbaru. Tidak ada tindakan lanjutan.");
      }
    } catch (e) {
      // Abaikan error secara diam-diam jika offline atau gagal
      console.warn("[KenVano] Pengecekan update gagal (mungkin karena offline atau izin akses):", e);
    }
  }, 2000); // Delay 2 detik agar tidak memperberat loading awal aplikasi

  // ─── View Navigation ────────────────────────
  function switchView(viewId) {
    // Update nav items
    navItems.forEach(item => {
      item.classList.toggle("active", item.dataset.view === viewId);
    });

    // Update view pages
    viewPages.forEach(page => {
      if (page.id === `view-${viewId}`) {
        page.style.display = "flex";
        setTimeout(() => page.classList.add("active"), 10);
      } else {
        page.classList.remove("active");
        setTimeout(() => page.style.display = "none", 300);
      }
    });

    if (viewId === "history") {
      renderHistory();
    }
  }

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      if (isDownloading && item.dataset.view !== "home") {
        showToast("info", "Download sedang berjalan", "Kembali ke tab Home untuk melihat progress.");
      }
      switchView(item.dataset.view);
    });
  });

  if (window.__TAURI__) {
    try {
      const { listen } = window.__TAURI__.event;

      listen("download-progress", (event) => {
        // payload could be a number or string depending on serde
        const pct = parseFloat(event.payload);
        if (isNaN(pct)) return;

        console.log("[KenVano] Progress diterima:", pct + "%");

        // Force transition to Converting if we hit 100% and it's a format that needs conversion
        if (pct >= 100 && !isConverting) {
          isConverting = true;
          progressTitle.textContent = currentTab === "video" ? "Converting to mp4..." : "Converting to mp3...";

          const fill = document.getElementById("progress-fill");
          const percent = document.getElementById("progress-percent");
          if (fill) fill.classList.remove("indeterminate");

          let convPct = 0;
          if (fill) fill.style.width = "0%";
          if (percent) percent.textContent = "0%";

          clearInterval(conversionInterval);
          conversionInterval = setInterval(() => {
            if (convPct < 99) {
              const durationFactor = Math.max(300, rawDurationSeconds);
              const increment = 100 / (durationFactor / 15);
              convPct += Math.max(0.1, Math.min(2, increment));

              if (convPct > 99) convPct = 99;
              if (fill) fill.style.width = `${convPct}%`;
              if (percent) percent.textContent = `${Math.round(convPct)}%`;
            }
          }, 1000);
          return; // Skip normal progress update
        }

        // Force update regardless of state flags just to debug
        const fill = document.getElementById("progress-fill");
        const percent = document.getElementById("progress-percent");

        if (fill) {
          fill.classList.remove("indeterminate");
          fill.style.width = `${pct}%`;
        }
        if (percent) {
          percent.textContent = `${Math.round(pct)}%`;
        }
      }).catch(e => console.error("Listen err:", e));

      listen("download-status", (event) => {
        if (isDownloading && event.payload === "Converting...") {
          if (isConverting) return;
          isConverting = true;
          progressTitle.textContent = currentTab === "video" ? "converting to mp4..." : "converting to mp3...";

          progressFill.classList.remove("indeterminate");
          let convPct = 0;
          progressFill.style.width = "0%";
          progressPercent.textContent = "0%";

          clearInterval(conversionInterval);
          conversionInterval = setInterval(() => {
            if (convPct < 99) {
              const durationFactor = Math.max(300, rawDurationSeconds);
              const increment = 100 / (durationFactor / 15);
              convPct += Math.max(0.1, Math.min(2, increment));

              if (convPct > 99) convPct = 99;
              progressFill.style.width = `${convPct}%`;
              progressPercent.textContent = `${Math.round(convPct)}%`;
            }
          }, 1000);
        }
      });
    } catch (err) {
      console.error("[KenVano] Gagal meregistrasi listener:", err);
    }
  }

  // ─── Source Icons Logic ───────────────────────
  const SOURCE_ICONS = {
    youtube: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    tiktok: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-1.13-.31-2.34-.25-3.41.33-.71.38-1.25 1.03-1.51 1.8-.31.82-.28 1.73.08 2.51.32.78.96 1.43 1.76 1.73.72.27 1.51.29 2.24.11 1.17-.27 2.15-1.13 2.59-2.22.13-.37.19-.77.2-1.17l-.01-13.61z"/></svg>`,
    instagram: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
    default: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`
  };

  function getSourceIcon(url) {
    const lowUrl = url.toLowerCase();
    if (lowUrl.includes("youtube.com") || lowUrl.includes("youtu.be")) return "youtube";
    if (lowUrl.includes("tiktok.com")) return "tiktok";
    if (lowUrl.includes("instagram.com")) return "instagram";
    return "default";
  }

  function formatDuration(seconds) {
    if (!seconds) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // ─── Folder Picker ────────────────────────────
  btnBrowse.addEventListener("click", async () => {
    try {
      const { open } = window.__TAURI__.dialog;
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select Download Folder"
      });

      if (result) {
        selectedPath = result;
        locationInput.value = result;
        localStorage.setItem("kenvano-save-path", result);
      }
    } catch (err) {
      console.error("Dialog error:", err);
      showToast("error", "Dialog Error", "Could not open folder picker.");
    }
  });

  // ─── URL Input Logic ─────────────────────────
  function isValidUrl(str) {
    if (!str) return false;
    try {
      const url = new URL(str.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function isSupportedUrl(str) {
    if (!str) return false;
    const commonVideoPatterns = [
      'youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 
      'facebook.com', 'fb.watch', 'x.com', 'twitter.com', 'pin.it',
      'vimeo.com', 'dailymotion.com', 'twitch.tv', 'reddit.com', 
      'pinterest.com', 'soundcloud.com', 'capcut.com', 'threads.net'
    ];
    const urlLower = str.toLowerCase();
    return commonVideoPatterns.some(p => urlLower.includes(p));
  }

  function checkUrlStatus() {
    const val = urlInput.value.trim();
    if (!val) {
      urlWrapper.classList.remove("error");
      urlError.classList.add("hidden");
      return;
    }

    if (!isValidUrl(val)) {
      urlWrapper.classList.add("error");
      urlError.textContent = i18n[currentLang].url_invalid;
      urlError.classList.remove("hidden");
    } else if (!isSupportedUrl(val)) {
      urlWrapper.classList.add("error");
      urlError.textContent = i18n[currentLang].url_unsupported;
      urlError.classList.remove("hidden");
    } else {
      urlWrapper.classList.remove("error");
      urlError.classList.add("hidden");
    }
  }

  // Debounce & stale-request guard
  let urlDebounceTimer = null;
  let currentFetchId = 0;

  async function onUrlChange() {
    const val = urlInput.value.trim();
    const videoCard = document.querySelector(".video-card");

    // Update visual error state
    checkUrlStatus();

    // Show/hide clear button
    if (val.length > 0) {
      urlClear.classList.add("visible");
    } else {
      urlClear.classList.remove("visible");
    }

    // Hide everything if URL is invalid or unsupported
    if (!isValidUrl(val) || !isSupportedUrl(val)) {
      formatSection.classList.add("hidden");
      if (progressSection) progressSection.classList.add("hidden");
      videoInfo.classList.add("hidden");
      return;
    }

    // Tag this request so we can discard stale ones
    const myId = ++currentFetchId;

    // Show loading skeleton
    videoInfo.classList.remove("hidden");
    videoCard.classList.add("loading");
    videoTitle.textContent = "Loading info...";
    videoDuration.textContent = "--:--";
    videoSource.textContent = "Detecting...";
    sourceLogo.innerHTML = "";
    formatSection.classList.add("hidden");
    if (progressSection) progressSection.classList.add("hidden");

    try {
      // Reset all quality options
      qualityGrid.classList.remove("hidden");
      originalQualityContainer.classList.add("hidden");
      document.querySelectorAll('.quality-option input').forEach(input => {
        input.disabled = false;
        const card = input.parentElement.querySelector('.quality-card');
        if (card) { card.style.opacity = "1"; card.style.pointerEvents = "auto"; }
      });
      const v1080_init = document.querySelector('input[name="video-quality"][value="1080"]');
      if (v1080_init) { v1080_init.checked = true; v1080_init.parentElement.style.display = "block"; }

      // Logic to show cookie modal if not set
      if (!selectedBrowser) {
        const siteName = getSiteName(val);
        showCookieModal(siteName, (browser) => {
          // If we are still on the same URL request, proceed
          if (myId === currentFetchId) {
            fetchVideoInfoInternal(val, browser, myId);
          }
        });
        return;
      }

      fetchVideoInfoInternal(val, selectedBrowser, myId);
    } catch (err) {
      if (myId !== currentFetchId) return;
      console.error("Fetch info outer error:", err);
    }
  }

  async function fetchVideoInfoInternal(val, browser, myId) {
    console.log("[KenVano] Mengambil info dengan browser cookie:", browser || "none");
    const videoCard = document.querySelector(".video-card");
    try {
      const info = await invoke("get_video_info", { url: val, browser: browser });

      // Discard if a newer request has started
      if (myId !== currentFetchId) return;

      videoCard.classList.remove("loading");
      videoTitle.textContent = info.title || "Unknown Title";
      rawDurationSeconds = info.duration || 0;
      currentDuration = formatDuration(rawDurationSeconds);
      videoDuration.textContent = currentDuration;

      // Thumbnail via Rust proxy
      currentThumbnail = info.thumbnail || "";
      if (currentThumbnail && currentThumbnail.startsWith("http")) {
        try { currentThumbnail = await invoke("get_thumbnail_base64", { url: currentThumbnail }); }
        catch (e) { console.error("Thumbnail error:", e); }
      }

      const sourceKey = getSourceIcon(val);
      videoSource.textContent = info.extractor_key || info.webpage_url_domain || "Web Content";
      sourceLogo.innerHTML = SOURCE_ICONS[sourceKey] || SOURCE_ICONS.default;
      formatSection.classList.remove("hidden");

      // ── Quality logic ──────────────────────────────────────
      function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      }
      function getEstimatedVideoSize(formats, targetHeight) {
        if (!formats) return '';
        const vFormat = formats.slice().reverse().find(f => f.height === targetHeight && f.vcodec !== 'none');
        if (!vFormat) return '';
        let size = vFormat.filesize || vFormat.filesize_approx || 0;
        if (vFormat.acodec === 'none' && size > 0) {
          const bestAudio = formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none').sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
          if (bestAudio) size += (bestAudio.filesize || bestAudio.filesize_approx || 0);
        }
        return size > 0 ? formatBytes(size) : '';
      }
      function getAudioSize(formats, targetAbr) {
        if (!formats) return '';
        const af = formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none');
        if (!af.length) return '';
        const closest = af.sort((a, b) => Math.abs((a.abr || 0) - targetAbr) - Math.abs((b.abr || 0) - targetAbr))[0];
        const size = closest ? (closest.filesize || closest.filesize_approx || 0) : 0;
        return size > 0 ? formatBytes(size) : '';
      }

      const size64 = document.getElementById('size-64');
      const size128 = document.getElementById('size-128');
      const size192 = document.getElementById('size-192');
      if (size64) size64.textContent = getAudioSize(info.formats, 64);
      if (size128) size128.textContent = getAudioSize(info.formats, 128);
      if (size192) size192.textContent = getAudioSize(info.formats, 192);

      if (info.formats && Array.isArray(info.formats)) {
        let maxHeight = 0, minHeight = 9999, hasAudio = false;
        const uniqueHeights = new Set();
        info.formats.forEach(f => {
          if (f.height) { maxHeight = Math.max(maxHeight, f.height); minHeight = Math.min(minHeight, f.height); uniqueHeights.add(f.height); }
          if (f.acodec !== 'none') hasAudio = true;
        });

        const isYoutube = val.toLowerCase().includes("youtube.com") || val.toLowerCase().includes("youtu.be");

        if (uniqueHeights.size <= 1 || (!isYoutube && maxHeight < 360)) {
          qualityGrid.classList.add("hidden");
          originalQualityContainer.classList.remove("hidden");
          optOriginal.checked = true;
          const originalSizeEl = originalQualityContainer.querySelector('.quality-size');
          if (originalSizeEl) {
            const bestFormat = info.formats.slice().reverse().find(f => (f.filesize || f.filesize_approx) > 0);
            const size = bestFormat ? (bestFormat.filesize || bestFormat.filesize_approx) : 0;
            originalSizeEl.textContent = size > 0 ? formatBytes(size) : '';
          }
        } else {
          qualityGrid.classList.remove("hidden");
          originalQualityContainer.classList.add("hidden");
          const size1080 = document.getElementById('size-1080');
          const size720 = document.getElementById('size-720');
          const size480 = document.getElementById('size-480');
          const size360 = document.getElementById('size-360');
          if (size1080) size1080.textContent = getEstimatedVideoSize(info.formats, 1080);
          if (size720) size720.textContent = getEstimatedVideoSize(info.formats, 720);
          if (size480) size480.textContent = getEstimatedVideoSize(info.formats, 480);
          if (size360) size360.textContent = getEstimatedVideoSize(info.formats, 360);

          const v1080 = document.querySelector('input[name="video-quality"][value="1080"]');
          const v720 = document.querySelector('input[name="video-quality"][value="720"]');
          const v480 = document.querySelector('input[name="video-quality"][value="480"]');
          const v360 = document.querySelector('input[name="video-quality"][value="360"]');

          if (v1080) {
            if (isYoutube) {
              v1080.parentElement.style.display = "block";
              if (maxHeight < 1080) { v1080.disabled = true; const c = v1080.parentElement.querySelector('.quality-card'); if (c) { c.style.opacity = "0.4"; c.style.pointerEvents = "none"; } }
            } else { v1080.parentElement.style.display = "none"; v1080.disabled = true; }
          }
          if (maxHeight < 720) { v720.disabled = true; const c = v720.parentElement.querySelector('.quality-card'); if (c) { c.style.opacity = "0.4"; c.style.pointerEvents = "none"; } }
          if (maxHeight < 480) { v480.disabled = true; const c = v480.parentElement.querySelector('.quality-card'); if (c) { c.style.opacity = "0.4"; c.style.pointerEvents = "none"; } }
          if (minHeight > 360) { v360.disabled = true; const c = v360.parentElement.querySelector('.quality-card'); if (c) { c.style.opacity = "0.4"; c.style.pointerEvents = "none"; } }
          if (minHeight > 480) { v480.disabled = true; const c = v480.parentElement.querySelector('.quality-card'); if (c) { c.style.opacity = "0.4"; c.style.pointerEvents = "none"; } }

          if (v1080 && !v1080.disabled) v1080.checked = true;
          else if (v720 && !v720.disabled) v720.checked = true;
          else if (v480 && !v480.disabled) v480.checked = true;
          else if (v360 && !v360.disabled) v360.checked = true;
        }

        tabVideo.style.display = "flex";
        tabAudio.style.display = hasAudio ? "flex" : "none";
        if (!hasAudio) switchTab("video");
      } else {
        tabVideo.style.display = "flex";
        tabAudio.style.display = "flex";
      }

    } catch (err) {
      if (myId !== currentFetchId) return;
      const errStr = String(err).toLowerCase();

      // If error is related to cookies/dpapi and we haven't tried "none" yet
      if (browser !== "" && (errStr.includes("cookie") || errStr.includes("dpapi"))) {
        console.warn("[KenVano] Gagal mengambil cookie, mencoba tanpa browser...");
        fetchVideoInfoInternal(val, "", myId);
        return;
      }

      console.error("Fetch info error:", err);
      videoCard.classList.remove("loading");
      videoTitle.textContent = "Tidak dapat membaca metadata";
      videoSource.textContent = "Coba unduh langsung atau periksa URL";
      sourceLogo.innerHTML = SOURCE_ICONS[getSourceIcon(val)] || SOURCE_ICONS.default;
      // Still show format section so user can attempt download
      formatSection.classList.remove("hidden");
      qualityGrid.classList.add("hidden");
      originalQualityContainer.classList.remove("hidden");
      optOriginal.checked = true;
      tabVideo.style.display = "flex";
      tabAudio.style.display = "flex";
      switchTab("video");
    }
  }

  // Debounced listeners — prevents double-fire from input+paste events
  urlInput.addEventListener("input", () => {
    clearTimeout(urlDebounceTimer);
    urlDebounceTimer = setTimeout(onUrlChange, 400);
  });
  urlInput.addEventListener("paste", () => {
    clearTimeout(urlDebounceTimer);
    urlDebounceTimer = setTimeout(onUrlChange, 150);
  });

  urlClear.addEventListener("click", () => {
    urlInput.value = "";
    urlClear.classList.remove("visible");
    formatSection.classList.add("hidden");
    progressSection.classList.add("hidden");
    videoInfo.classList.add("hidden"); // Hide source form as requested

    // Reset radio checked ke default (paling tinggi)
    const v720 = document.querySelector('input[name="video-quality"][value="720"]');
    if (v720) v720.checked = true;

    urlInput.focus();
  });

  // ─── Tab Switching ───────────────────────────
  function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    tabVideo.classList.toggle("active", tab === "video");
    tabAudio.classList.toggle("active", tab === "audio");

    // Update panels
    panelVideo.classList.toggle("active", tab === "video");
    panelAudio.classList.toggle("active", tab === "audio");
  }

  tabVideo.addEventListener("click", () => switchTab("video"));
  tabAudio.addEventListener("click", () => switchTab("audio"));

  // ─── Cancel ──────────────────────────────────
  btnCancel.addEventListener("click", async () => {
    if (isDownloading) {
      try {
        await invoke("cancel_download");
      } catch (err) {
        console.error("Cancel error:", err);
      }
      isDownloading = false;
      progressSection.classList.add("hidden");
      formatSection.classList.remove("hidden");
    } else {
      // If not downloading, just reset
      urlInput.value = "";
      urlClear.classList.remove("visible");
      formatSection.classList.add("hidden");
      progressSection.classList.add("hidden");
      videoInfo.classList.add("hidden");
      urlInput.focus();
    }
  });

  function translateError(err) {
    const errorStr = String(err).toLowerCase();
    if (errorStr.includes("format is not available")) {
      return "Format/Kualitas yang Anda pilih tidak tersedia untuk video ini.";
    }
    if (errorStr.includes("unsupported url")) {
      return "URL tidak didukung atau platform tidak dikenali.";
    }
    if (errorStr.includes("private video") || errorStr.includes("login")) {
      return "Video bersifat pribadi atau memerlukan login.";
    }
    if (errorStr.includes("dpapi")) {
      return "Gagal mendekripsi cookie. Mohon tutup browser (Brave/Chrome/Edge) Anda sepenuhnya lalu coba lagi.";
    }
    if (errorStr.includes("exited with code some(1)") || errorStr.includes("exited with code 1")) {
      return "Gagal mengunduh. Silakan coba kualitas lain atau cek koneksi Anda.";
    }
    return err;
  }

  // ─── Download ────────────────────────────────
  btnDownload.addEventListener("click", async () => {
    if (isDownloading) return;

    const url = urlInput.value.trim();
    if (!isValidUrl(url)) return;

    if (!selectedPath) {
      showToast("error", "Folder belum dipilih", "Silakan pilih folder penyimpanan terlebih dahulu.");
      return;
    }

    if (!selectedBrowser) {
      const siteName = getSiteName(url);
      showCookieModal(siteName, (browser) => {
        performDownload(url, browser);
      });
      return;
    }

    performDownload(url, selectedBrowser);
  });

  async function performDownload(url, browser) {
    console.log("[KenVano] Memulai download dengan browser cookie:", browser || "none");
    if (isDownloading) return;
    isDownloading = true;
    isConverting = false;

    // Determine format & quality
    let format, quality;
    if (currentTab === "video") {
      format = "mp4";
      quality = document.querySelector('input[name="video-quality"]:checked')?.value || "720";
    } else {
      format = "mp3";
      quality = document.querySelector('input[name="audio-quality"]:checked')?.value || "128";
    }

    // Show progress section, hide format section
    formatSection.classList.add("hidden");
    progressSection.classList.remove("hidden");
    
    // Original display logic
    const pFooter = document.getElementById("progress-footer");
    const pBtnReload = document.getElementById("btn-reload");
    
    if (pFooter) {
      pFooter.classList.remove("hidden");
      pFooter.style.display = "flex";
    }
    if (pBtnReload) {
      pBtnReload.classList.add("hidden");
      pBtnReload.style.display = "none";
    }
    // Ensure the static cancel button is visible (it might have been hidden by a previous finished download)
    const pBtnCancelProgress = document.getElementById("btn-cancel-progress");
    if (pBtnCancelProgress) {
      pBtnCancelProgress.style.display = "block";
    }

    progressFill.style.width = "0%";
    progressFill.classList.add("indeterminate");
    progressPercent.textContent = "0%";
    progressTitle.textContent = "Downloading...";
    progressDetail.textContent = `Format: ${format.toUpperCase()} | Quality: ${currentTab === "video" ? quality + "p" : quality + "kbps"}`;

    try {
      const title = videoTitle.textContent || "Unknown Video";
      console.log("[KenVano] Menjalankan download_video dengan browser:", browser || "none");
      const result = await invoke("download_video", {
        url,
        title,
        format,
        quality,
        outputDir: selectedPath,
        browser: browser
      });

      // Hentikan interval konversi segera setelah proses selesai
      clearInterval(conversionInterval);

      // Success
      progressFill.classList.remove("indeterminate");
      progressFill.style.width = "100%";
      progressPercent.textContent = "100%";
      progressTitle.textContent = "Complete!";
      progressDetail.textContent = `Saved to: ${result}`;

      // Get actual file size from disk
      let fileSizeStr = "";
      try {
        const bytes = await invoke("get_file_size", { path: result });
        if (bytes > 0) {
          const k = 1024;
          if (bytes < k * k) {
            fileSizeStr = (bytes / k).toFixed(1) + " KB";
          } else {
            fileSizeStr = (bytes / (k * k)).toFixed(1) + " MB";
          }
        }
      } catch (e) { console.error("get_file_size error:", e); }

      // Save to History
      saveToHistory({
        id: Date.now().toString(),
        title: videoTitle.textContent,
        source: videoSource.textContent,
        format: format.toUpperCase(), // Store format separately
        size: currentTab === "video" ? `${quality}p` : `${quality}kbps`,
        fileSize: fileSizeStr,
        duration: currentDuration,
        thumbnail: currentThumbnail,
        path: result,
        timestamp: Date.now()
      });

      showToast("success", "Download Selesai!", "File Anda telah berhasil disimpan.");
      isDownloading = false;
      
      // Hide cancel button on success
      const pBtnCancelProgress = document.getElementById("btn-cancel-progress");
      if (pBtnCancelProgress) pBtnCancelProgress.style.display = "none";

    } catch (error) {
      const errStr = String(error).toLowerCase();
      
      // If the process was canceled, don't show an error toast
      if (errStr === "canceled") {
        isDownloading = false;
        return;
      }

      // Fallback: if download fails due to cookies, retry once without
      if (browser !== "" && (errStr.includes("cookie") || errStr.includes("dpapi"))) {
        console.warn("[KenVano] Download gagal karena cookie, mencoba ulang tanpa cookie...");
        progressTitle.textContent = "Retrying without cookies...";
        progressDetail.textContent = "Mengabaikan cookie dan mencoba ulang...";
        isDownloading = false; // Reset flag to allow retry
        isConverting = false;
        performDownload(url, "");
        return; // Finally will still run, but we must NOT hide the button here
      }

      // Error
      const friendlyError = translateError(error);
      progressFill.classList.remove("indeterminate");
      progressFill.style.width = "0%";
      progressPercent.textContent = "";
      progressTitle.textContent = "Gagal Mengunduh";
      progressDetail.textContent = friendlyError;

      const pFooter = document.getElementById("progress-footer");
      const pBtnReload = document.getElementById("btn-reload");
      if (pFooter) {
        pFooter.classList.remove("hidden");
        pFooter.style.display = "flex";
      }
      if (pBtnReload) {
        pBtnReload.classList.remove("hidden");
        pBtnReload.style.display = "block";
      }

      showToast("error", "Oops!", friendlyError);
      isDownloading = false;

      // Hide cancel button on final error
      const pBtnCancelProgress = document.getElementById("btn-cancel-progress");
      if (pBtnCancelProgress) pBtnCancelProgress.style.display = "none";

    } finally {
      // ONLY reset flags if NOT retrying (though we already returned above)
      // Note: isDownloading was set to false at line 846 for retry
      
      isConverting = false;
      clearInterval(conversionInterval);
      btnDownload.disabled = false;
    }
  }

  // ─── Reload Metadata ────────────────────────
  btnReload.addEventListener("click", () => {
    progressSection.classList.add("hidden");
    onUrlChange(); // Trigger metadata reload
  });

  if (btnCancelProgress) {
    btnCancelProgress.addEventListener("click", async () => {
      if (isDownloading) {
        try {
          await invoke("cancel_download");
        } catch (err) {
          console.error("Cancel progress error:", err);
        }
        isDownloading = false;
        progressSection.classList.add("hidden");
        formatSection.classList.remove("hidden");
        showToast("info", "Download Dibatalkan", "Proses pengunduhan telah dihentikan.");
      }
    });
  }

  // ─── Update Engine ────────────────────────
  const btnUpdateEngine = document.getElementById("btn-update-engine");
  if (btnUpdateEngine) {
    btnUpdateEngine.addEventListener("click", async () => {
      btnUpdateEngine.disabled = true;
      const originalText = btnUpdateEngine.textContent;
      btnUpdateEngine.textContent = "Updating...";

      try {
        const result = await invoke("update_engine");
        // Often yt-dlp returns "yt-dlp is up to date" or "Updated yt-dlp to version..."
        if (result.toLowerCase().includes("up to date")) {
          showToast("info", "Up to Date", "Mesin pengunduh sudah menggunakan versi terbaru.");
        } else {
          showToast("success", "Engine Updated", "Mesin pengunduh berhasil diperbarui.");
        }
      } catch (e) {
        const err = e.toString().toLowerCase();
        if (err.includes("connection") || err.includes("network") || err.includes("offline") || err.includes("establish")) {
          showToast("error", "Koneksi Gagal", "Mohon periksa koneksi internet Anda.");
        } else {
          showToast("error", "Update Gagal", "Gagal memperbarui mesin. Coba jalankan sebagai Admin atau cek Firewall.");
        }
      } finally {
        btnUpdateEngine.disabled = false;
        btnUpdateEngine.textContent = originalText;
      }
    });
  }

  // ─── History Management ──────────────────────
  const HISTORY_KEY = "kenvano-history";

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveToHistory(item) {
    let history = getHistory();
    history.unshift(item);
    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  async function deleteHistoryItem(id, path) {
    if (!confirm("Hapus item ini dari histori?")) return;
    const physicalDelete = confirm("Apakah Anda juga ingin menghapus file fisiknya dari disk?");

    let history = getHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    if (physicalDelete) {
      try {
        await invoke("delete_file", { path });
        showToast("success", "File Dihapus", "File berhasil dihapus dari penyimpanan.");
      } catch (e) {
        showToast("error", "Gagal Menghapus", "File mungkin sudah tidak ada atau sedang digunakan.");
      }
    }
    renderHistory();
  }

  async function openHistoryFolder(path) {
    try {
      await invoke("open_folder", { path });
    } catch (e) {
      showToast("error", "Error", "Tidak dapat membuka folder.");
    }
  }

  function renderHistory() {
    const list = document.getElementById("history-list");
    const empty = document.getElementById("history-empty");
    const history = getHistory();

    if (history.length === 0) {
      list.style.display = "none";
      empty.style.display = "flex";
      return;
    }

    list.style.display = "block";
    empty.style.display = "none";

    list.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-thumb-container" style="position: relative; width: 64px; height: 48px; flex-shrink: 0;">
          ${item.thumbnail ?
        `<img src="${item.thumbnail}" class="history-thumb" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` :
        ''
      }
          <div class="history-thumb-fallback" style="display: ${item.thumbnail ? 'none' : 'flex'}; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--bg-elevated); border-radius: var(--radius-sm); color: var(--text-tertiary);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
        </div>
        <div class="history-details">
          <div class="history-title" title="${item.title}">${item.title}</div>
          <div class="history-meta">
            <div class="history-meta-row">
              <span class="history-source">${item.source}</span>
              <span class="history-dot">•</span>
              ${item.format ? `<span>${item.format}</span><span class="history-dot">•</span>` : ''}
              <span>${item.size}</span>
            </div>
            <div class="history-meta-row history-meta-secondary">
              ${item.duration ? `<span>${item.duration}</span>` : ''}
              ${item.duration && item.fileSize ? `<span class="history-dot">•</span>` : ''}
              ${item.fileSize ? `<span>${item.fileSize}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="history-actions">
          <button class="btn-history-action action-open" title="Open Folder" data-path="${item.path}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <button class="btn-history-action delete action-delete" title="Delete" data-id="${item.id}" data-path="${item.path}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  // Event delegation for history actions
  const historyList = document.getElementById("history-list");
  if (historyList) {
    historyList.addEventListener("click", (e) => {
      const openBtn = e.target.closest(".action-open");
      const deleteBtn = e.target.closest(".action-delete");

      if (openBtn) {
        const path = openBtn.dataset.path;
        openHistoryFolder(path);
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const path = deleteBtn.dataset.path;
        deleteHistoryItem(id, path);
      }
    });
  }

  // ─── Toast Notification ──────────────────────
  function showToast(type, title, message) {
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    if (type === "error") {
      toastIcon.classList.add("error");
      toastIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    } else {
      toastIcon.classList.remove("error");
      toastIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    }

    toast.classList.remove("hidden");
    // Force reflow for animation
    void toast.offsetWidth;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 400);
    }, 4000);
  }
});
