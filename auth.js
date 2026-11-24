(function () {
  const ADMIN_EMAIL = "armanprasetiyo36@gmail.com";

  const firebaseConfig = {
    apiKey: "AIzaSyCPq_mQo7uwXXi66grYAKjZWK7Rfqzcun4",
    authDomain: "minitubex-auth.firebaseapp.com",
    projectId: "minitubex-auth",
    storageBucket: "minitubex-auth.firebasestorage.app",
    messagingSenderId: "447723731065",
    appId: "1:447723731065:web:52bf7ab9e6d65cf6637ca8",
    measurementId: "G-YNVRCBQTPG"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();

  let userAktif = null;
  let daftarPostCache = [];
  let daftarChannelCache = [];
  let channelSedangDilihat = null;
  const komenTerbuka = new Set();
  const drafKomen = {};
  const targetBalasKomen = {}; // postId -> { parentId, email, nama }

  // State Pencarian, Algoritma, & Shared Post
  let kataKunciCari = "";
  let filterCari = "semua";
  let urutCari = "algoritma";
  let modeFeed = localStorage.getItem("mtx_feed_mode") || "algoritma"; // algoritma | mengikuti | terbaru
  let sharedPostHandled = false;

  const STOPWORDS = new Set([
    "yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk", "dengan", "pada", "adalah",
    "atau", "juga", "saya", "aku", "kamu", "dia", "mereka", "kita", "kami", "ada", "tidak",
    "gak", "nggak", "bisa", "mau", "sudah", "udah", "lagi", "aja", "saja", "kalau", "kalo",
    "the", "and", "for", "with", "this", "that", "from", "are", "was", "have", "you", "your",
    "test", "video", "short", "shorts", "foto", "post", "postingan", "baru", "buat", "cara"
  ]);

  function getServerUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("server") || "";
  }

  function getSharedPostParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("post") || "";
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightTeks(teks, query) {
    const raw = String(teks || "");
    const q = String(query || "").trim();
    if (!q) return esc(raw);
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQ})`, "gi");
    return raw.split(regex).map((part, idx) =>
      idx % 2 === 1 ? `<mark class="mtx-hl">${esc(part)}</mark>` : esc(part)
    ).join("");
  }

  function decodeSafe(str) {
    try { return decodeURIComponent(str); } catch (e) { return str; }
  }

  function normText(str) {
    return String(str || "").replace(/\s+/g, " ").trim();
  }

  function formatWaktuSingkat(unixSec) {
    if (!unixSec) return "";
    const diff = Math.max(0, Math.floor(Date.now() / 1000) - Number(unixSec));
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}h lalu`;
  }

  function buatSvgAvatar(nama) {
    const teksInisial = (nama || "U").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "U";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#48cae4"/><stop offset="100%" stop-color="#0077b6"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="40" y="43" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-weight="bold" font-size="28">${teksInisial}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function resolveAvatarUrl(foto, nama) {
    const serverUrl = getServerUrl();
    if (foto) {
      if (foto.startsWith("http://") || foto.startsWith("https://")) return foto;
      if (serverUrl) return `${serverUrl}/media/${encodeURIComponent(foto)}`;
    }
    return buatSvgAvatar(nama);
  }

  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el && el.tagName === "IMG" && el.dataset.fallbackNama && !el.dataset.fallbackDone) {
      el.dataset.fallbackDone = "1";
      el.src = buatSvgAvatar(el.dataset.fallbackNama);
    }
  }, true);

  // Toast Pemberitahuan Ringan (Aero)
  function tampilkanToast(pesan, labelAksi, callbackAksi) {
    const lama = document.getElementById("mtx-toast");
    if (lama) lama.remove();

    const toast = document.createElement("div");
    toast.id = "mtx-toast";
    toast.className = "mtx-toast";
    toast.innerHTML = `<span>${esc(pesan)}</span>`;

    if (labelAksi && typeof callbackAksi === "function") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mtx-toast-btn";
      btn.textContent = labelAksi;
      btn.onclick = () => {
        toast.remove();
        callbackAksi();
      };
      toast.appendChild(btn);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 5500);
  }

  // Ekstraksi Kata Kunci Topik untuk Algoritma & Blokir Konten Serupa
  function ekstrakKataKunciPost(post) {
    if (!post) return [];
    const sumberTeks = [
      post.teks || "",
      post.file ? post.file.replace(/^\d+_/, "").replace(/\.[^.]+$/, "") : ""
    ].join(" ").toLowerCase();

    const tokens = sumberTeks
      .replace(/[^a-z0-9\s_-]/g, " ")
      .split(/[\s_-]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

    return Array.from(new Set(tokens)).slice(0, 8);
  }

  // Manajemen Skor Minat Algoritma per User (localStorage)
  function getAffinityStore() {
    if (!userAktif) return { keywords: {}, creators: {} };
    const key = `mtx_algo_${userAktif.email.toLowerCase()}`;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      return {
        keywords: parsed.keywords || {},
        creators: parsed.creators || {}
      };
    } catch (e) {
      return { keywords: {}, creators: {} };
    }
  }

  function catatSinyalAlgoritma(post, bobot) {
    if (!userAktif || !post) return;
    const key = `mtx_algo_${userAktif.email.toLowerCase()}`;
    const store = getAffinityStore();

    if (post.email) {
      const em = post.email.toLowerCase();
      store.creators[em] = Math.max(-50, Math.min(200, (store.creators[em] || 0) + bobot * 1.5));
    }
    ekstrakKataKunciPost(post).forEach((kw) => {
      store.keywords[kw] = Math.max(-50, Math.min(200, (store.keywords[kw] || 0) + bobot));
    });

    try {
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) {}
  }

  function cekPostDiblokir(post, profilSaya) {
    if (!post || !profilSaya) return false;
    const blkPosts = Array.isArray(profilSaya.blockedPosts) ? profilSaya.blockedPosts : [];
    if (blkPosts.includes(post.id)) return true;

    const blkKeywords = Array.isArray(profilSaya.blockedKeywords) ? profilSaya.blockedKeywords : [];
    if (blkKeywords.length === 0) return false;

    const kwList = blkKeywords.map((item) => (typeof item === "string" ? item : item.keyword || "").toLowerCase()).filter(Boolean);
    const teksGabung = `${post.teks || ""} ${post.file || ""}`.toLowerCase();
    const postKws = ekstrakKataKunciPost(post);

    return kwList.some((kw) => postKws.includes(kw) || teksGabung.includes(kw));
  }

  function hitungSkorAlgoritma(post) {
    const myEmail = userAktif ? userAktif.email.toLowerCase() : "";
    const store = getAffinityStore();
    const chData = daftarChannelCache.find((c) => c.email === (post.email || "").toLowerCase());
    const isFollowing = chData && Array.isArray(chData.followers) && chData.followers.includes(myEmail);

    let skor = 0;
    // 1. Sinyal Follow
    if (isFollowing) skor += 35;

    // 2. Sinyal Afinitas Kreator & Kata Kunci dari Interaksi Pengguna
    const em = (post.email || "").toLowerCase();
    if (em && store.creators[em]) skor += store.creators[em];

    const postKws = ekstrakKataKunciPost(post);
    postKws.forEach((kw) => {
      if (store.keywords[kw]) skor += store.keywords[kw];
    });

    // 3. Popularitas Sosial (Like + Komentar)
    const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
    const commCount  = Array.isArray(post.comments) ? post.comments.length : 0;
    skor += likesCount * 3 + commCount * 5;

    // 4. Kesegaran Waktu (Freshness decay per jam)
    const umurJam = Math.max(0, (Date.now() / 1000 - (post.dibuatPada || 0)) / 3600);
    skor += Math.max(0, 30 - umurJam * 1.4);

    return skor;
  }

  function terapkanFilterDanAlgoritma(rawPosts) {
    if (!Array.isArray(rawPosts)) return [];
    const profilSaya = getProfilSaya();
    const myEmail = userAktif ? userAktif.email.toLowerCase() : "";

    // 1. Saring konten yang diblokir & konten serupa
    let hasil = rawPosts.filter((p) => !cekPostDiblokir(p, profilSaya));

    // 2. Mode Feed: Mengikuti vs Terbaru vs Algoritma
    if (modeFeed === "mengikuti" && myEmail) {
      hasil = hasil.filter((p) => {
        const em = (p.email || "").toLowerCase();
        if (em === myEmail) return true;
        const ch = daftarChannelCache.find((c) => c.email === em);
        return ch && Array.isArray(ch.followers) && ch.followers.includes(myEmail);
      });
      hasil.sort((a, b) => (b.dibuatPada || 0) - (a.dibuatPada || 0));
    } else if (modeFeed === "terbaru") {
      hasil.sort((a, b) => (b.dibuatPada || 0) - (a.dibuatPada || 0));
    } else {
      hasil.sort((a, b) => hitungSkorAlgoritma(b) - hitungSkorAlgoritma(a));
    }

    return hasil;
  }

  function sedangSibukInteraksi() {
    const aktif = document.activeElement;
    if (aktif && (aktif.tagName === "INPUT" || aktif.tagName === "TEXTAREA" || aktif.tagName === "SELECT")) {
      return true;
    }
    return komenTerbuka.size > 0;
  }

  function lindungiAutoRefresh() {
    if (typeof window.renderSemuaTab === "function" && !window.renderSemuaTab._mtxWrapped) {
      const asliRender = window.renderSemuaTab;
      const pembungkus = function (...args) {
        if (sedangSibukInteraksi()) return;
        return asliRender.apply(this, args);
      };
      pembungkus._mtxWrapped = true;
      window.renderSemuaTab = pembungkus;
    }
  }
  lindungiAutoRefresh();
  setInterval(lindungiAutoRefresh, 1000);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn && normText(btn.textContent) === "Refresh") {
      komenTerbuka.clear();
    }
  }, true);

  // 1. CSS Frutiger Aero Lengkap
  const style = document.createElement("style");
  style.textContent = `
    #mtx-auth-gate {
      position: fixed; inset: 0; z-index: 10000;
      background: linear-gradient(135deg, rgba(12, 65, 110, 0.88), rgba(20, 125, 165, 0.85));
      backdrop-filter: blur(14px);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .mtx-auth-card {
      width: 100%; max-width: 410px;
      background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(218,242,255,0.94) 100%);
      border: 1.5px solid #ffffff; border-radius: 18px; padding: 20px 22px;
      box-shadow: 0 14px 36px rgba(0, 35, 70, 0.45);
      color: #0b3c5d; text-align: center;
    }
    .mtx-auth-input {
      width: 100%; box-sizing: border-box; padding: 9px 12px; margin-bottom: 10px;
      border-radius: 10px; border: 1px solid #8ecae6;
      background: rgba(255,255,255,0.94); font-size: 13.5px; outline: none;
    }
    .mtx-btn-google {
      width: 100%; padding: 10px; border-radius: 11px; border: 1px solid #b5e2fa;
      background: linear-gradient(180deg, #ffffff 0%, #e6f5ff 100%);
      color: #083d63; font-weight: 700; font-size: 13.5px; cursor: pointer;
      box-shadow: 0 3px 10px rgba(0, 75, 130, 0.15); margin-bottom: 10px;
    }
    .mtx-btn-email {
      width: 100%; padding: 10px; border-radius: 11px; border: none;
      background: linear-gradient(180deg, #38b6ff 0%, #0077b6 100%);
      color: #fff; font-weight: 700; font-size: 13.5px; cursor: pointer;
    }
    .mtx-user-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.85); border: 1px solid #ffffff;
      border-radius: 20px; padding: 3px 10px 3px 4px;
      font-size: 12px; font-weight: 700; color: #093b5c; cursor: pointer;
    }
    .mtx-user-pill img {
      width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1px solid #fff;
    }
    .mtx-admin-tag {
      background: linear-gradient(180deg, #ffd166, #f77f00);
      color: #fff; padding: 1px 5px; border-radius: 6px; font-size: 9.5px; font-weight: 800;
    }
    .mtx-creator-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      background: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.95);
      border-radius: 11px; padding: 6px 10px; margin-bottom: 8px;
    }
    .mtx-creator-info {
      display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left; min-width: 0;
    }
    .mtx-creator-info img {
      width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid #fff; flex-shrink: 0;
    }
    .mtx-btn-follow {
      background: linear-gradient(180deg, #48cae4 0%, #0077b6 100%);
      color: #fff; border: 1px solid #fff; border-radius: 12px;
      padding: 4px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .mtx-btn-follow.following {
      background: linear-gradient(180deg, #ffffff 0%, #d8f3ff 100%);
      color: #084163; border-color: #90e0ef;
    }
    .mtx-social-bar {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center;
    }
    .mtx-act-btn {
      background: linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(225,245,255,0.9) 100%);
      border: 1px solid #b5e2fa; border-radius: 10px; padding: 5px 9px;
      font-size: 11.5px; font-weight: 700; color: #0a466b; cursor: pointer;
    }
    .mtx-act-btn.liked {
      background: linear-gradient(180deg, #ff758f 0%, #c9184a 100%);
      color: #fff; border-color: #fff;
    }
    .mtx-act-btn.saved {
      background: linear-gradient(180deg, #ffb703 0%, #fb8500 100%);
      color: #fff; border-color: #fff;
    }
    .mtx-act-btn.block-btn {
      color: #7b2cbf; border-color: #d8bbff;
    }
    .mtx-btn-hapus-card {
      background: linear-gradient(180deg, #ff6b6b, #c9184a);
      color: #fff; border: 1px solid #fff; border-radius: 10px;
      padding: 5px 9px; font-size: 11.5px; font-weight: 700; cursor: pointer;
    }
    .mtx-comment-box {
      margin-top: 8px; background: rgba(255,255,255,0.9);
      border: 1px solid #bce3fa; border-radius: 11px; padding: 8px 10px; text-align: left;
    }
    .mtx-comment-item {
      display: flex; gap: 8px; align-items: flex-start;
      padding: 6px 0; border-bottom: 1px solid rgba(142,202,230,0.45); font-size: 12px;
    }
    .mtx-comment-item.is-reply {
      margin-left: 18px; padding-left: 8px; border-left: 2px solid #90e0ef;
    }
    .mtx-comment-item:last-child { border-bottom: none; }
    .mtx-comment-item img {
      width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-top: 2px; flex-shrink: 0;
    }
    .mtx-reply-link {
      background: none; border: none; color: #0077b6; font-size: 11px; font-weight: 700;
      cursor: pointer; padding: 2px 0 0; margin-top: 2px;
    }
    .mtx-reply-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: #e0f4ff; border: 1px solid #90e0ef; border-radius: 8px;
      padding: 4px 8px; font-size: 11.5px; color: #064266; margin-bottom: 6px;
    }
    .mtx-channel-banner {
      background: linear-gradient(135deg, rgba(240,250,255,0.94), rgba(205,238,255,0.9));
      border: 1.5px solid #ffffff; border-radius: 16px; padding: 16px;
      box-shadow: 0 8px 24px rgba(0, 65, 115, 0.16); margin-bottom: 14px; color: #093b5c;
    }
    .mtx-stat-chip {
      background: rgba(255,255,255,0.88); border: 1px solid #90e0ef;
      border-radius: 10px; padding: 5px 10px; font-size: 12px; font-weight: 700;
    }

    /* Bar Algoritma & Kelola Blokir di Feed */
    .mtx-algo-bar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
      background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(215,242,255,0.84));
      border: 1.5px solid #ffffff; border-radius: 14px; padding: 8px 12px; margin-bottom: 12px;
      box-shadow: 0 4px 14px rgba(0, 55, 100, 0.14);
    }

    /* Pencarian */
    .mtx-search-box-wrap {
      display: flex; gap: 8px; align-items: center; margin-bottom: 10px;
    }
    .mtx-search-input {
      flex: 1; padding: 10px 14px; border-radius: 12px;
      border: 1.5px solid #8ecae6; background: rgba(255,255,255,0.96);
      font-size: 14px; color: #083d63; outline: none;
    }
    .mtx-filter-row {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between;
    }
    .mtx-filter-chips {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .mtx-chip-btn {
      padding: 5px 11px; border-radius: 13px; border: 1px solid #90e0ef;
      background: rgba(255,255,255,0.88); color: #09456b;
      font-size: 11.5px; font-weight: 700; cursor: pointer;
    }
    .mtx-chip-btn.active {
      background: linear-gradient(180deg, #38b6ff 0%, #0077b6 100%);
      color: #ffffff; border-color: #ffffff;
    }
    .mtx-sort-select {
      padding: 5px 10px; border-radius: 10px; border: 1px solid #90e0ef;
      background: rgba(255,255,255,0.92); color: #09456b;
      font-size: 12px; font-weight: 700; outline: none; cursor: pointer;
    }
    .mtx-badge-tipe {
      display: inline-block; padding: 2px 8px; border-radius: 8px;
      background: linear-gradient(180deg, #caf0f8, #90e0ef);
      color: #034066; font-size: 10.5px; font-weight: 800;
    }
    .mtx-hl {
      background: #fff3b0; color: #052c47; padding: 0 3px; border-radius: 4px;
    }
    .mtx-ch-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px; margin-bottom: 14px;
    }
    .mtx-ch-mini-card {
      background: rgba(255,255,255,0.88); border: 1px solid #bce3fa;
      border-radius: 14px; padding: 12px; display: flex; align-items: center;
      justify-content: space-between; gap: 10px;
    }

    /* Notifikasi */
    .mtx-notif-item {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: rgba(255,255,255,0.88); border: 1px solid #bce3fa;
      border-radius: 13px; padding: 11px 13px; margin-bottom: 8px; cursor: pointer;
      color: #083d63; text-align: left;
    }
    .mtx-notif-item.unread {
      background: linear-gradient(180deg, #ffffff 0%, #dff4ff 100%);
      border: 1.5px solid #38b6ff;
      box-shadow: 0 3px 10px rgba(0, 119, 182, 0.16);
    }
    .mtx-notif-dot {
      width: 9px; height: 9px; border-radius: 50%; background: #0096c7; flex-shrink: 0;
    }

    /* Modal Spotlight & Kelola Blokir */
    .mtx-modal-backdrop {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(8, 42, 74, 0.72); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; padding: 14px;
    }
    .mtx-modal-box {
      width: 100%; max-width: 560px; max-height: 86vh; overflow-y: auto;
      background: linear-gradient(180deg, rgba(248,253,255,0.98), rgba(216,241,255,0.96));
      border: 1.5px solid #ffffff; border-radius: 18px; padding: 16px;
      box-shadow: 0 14px 36px rgba(0, 25, 55, 0.45); color: #083d63;
    }

    /* Toast */
    .mtx-toast {
      position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
      z-index: 10001; display: flex; align-items: center; gap: 10px;
      background: linear-gradient(180deg, rgba(16, 78, 125, 0.96), rgba(9, 48, 82, 0.96));
      color: #ffffff; border: 1.5px solid #90e0ef; border-radius: 14px;
      padding: 9px 14px; font-size: 12.5px; font-weight: 700;
      box-shadow: 0 8px 24px rgba(0, 20, 45, 0.45); max-width: 92vw;
    }
    .mtx-toast-btn {
      background: #48cae4; color: #042a42; border: none; border-radius: 8px;
      padding: 4px 10px; font-size: 11.5px; font-weight: 800; cursor: pointer; white-space: nowrap;
    }

    /* Dock Shorts */
    .mtx-shorts-dock {
      position: absolute; right: 10px; bottom: 116px; z-index: 25;
      display: flex; flex-direction: column; align-items: center; gap: 7px; pointer-events: auto;
    }
    .mtx-short-avatar-wrap {
      position: relative; cursor: pointer; margin-bottom: 4px;
    }
    .mtx-short-avatar-wrap img {
      width: 38px; height: 38px; border-radius: 50%; object-fit: cover;
      border: 2px solid #ffffff; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45); display: block;
    }
    .mtx-short-follow-badge {
      position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(180deg, #38b6ff, #0077b6); color: #fff;
      border: 1.5px solid #fff; border-radius: 8px; padding: 0 5px;
      font-size: 10px; font-weight: 800; cursor: pointer; line-height: 14px;
    }
    .mtx-short-follow-badge.following { background: #2ec4b6; }
    .mtx-short-pill-btn {
      width: 46px; min-height: 36px; border-radius: 12px;
      border: 1.5px solid rgba(255, 255, 255, 0.92);
      background: linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(195,235,255,0.82) 100%);
      backdrop-filter: blur(8px); box-shadow: 0 3px 10px rgba(0, 30, 60, 0.35);
      color: #073759; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 3px 2px; cursor: pointer; font-size: 10.5px; font-weight: 800; line-height: 1.15;
    }
    .mtx-short-pill-btn span { font-size: 9.5px; font-weight: 700; }
    .mtx-short-pill-btn.liked { background: linear-gradient(180deg, #ff758f, #c9184a); color: #fff; }
    .mtx-short-pill-btn.saved { background: linear-gradient(180deg, #ffb703, #fb8500); color: #fff; }
    .mtx-short-pill-btn.del { background: linear-gradient(180deg, #ff6b6b, #c9184a); color: #fff; }
    .mtx-shorts-drawer {
      position: absolute; left: 10px; right: 64px; bottom: 54px; z-index: 35;
      background: linear-gradient(180deg, rgba(245,252,255,0.97), rgba(215,240,255,0.96));
      border: 1.5px solid #ffffff; border-radius: 14px; padding: 10px;
      box-shadow: 0 10px 26px rgba(0, 25, 55, 0.5); color: #093b5c; text-align: left;
    }

    @media (max-width: 640px) {
      .aero-navbar { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; padding: 10px 12px !important; }
      .brand-area { justify-content: space-between !important; }
      .nav-actions { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; justify-content: flex-start !important; }
      .nav-actions .win7-btn, .mtx-btn-kompres { padding: 5px 9px !important; font-size: 11.5px !important; margin-right: 0 !important; }
      .aero-tabs { display: flex !important; overflow-x: auto !important; white-space: nowrap !important; justify-content: flex-start !important; gap: 6px !important; padding: 6px 10px !important; -webkit-overflow-scrolling: touch; }
      .aero-tabs::-webkit-scrollbar { display: none; }
      .aero-tabs .tab-btn { flex: 0 0 auto !important; padding: 6px 11px !important; font-size: 12px !important; }
      .main-container { padding: 10px 8px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
      .form-row { flex-direction: column !important; gap: 8px !important; }
      .mtx-shorts-dock { right: 8px; bottom: 110px; gap: 5px; }
      .mtx-short-pill-btn { width: 42px; min-height: 33px; border-radius: 10px; font-size: 9.5px; }
      .mtx-shorts-drawer { left: 8px; right: 56px; bottom: 50px; }
    }
  `;
  document.head.appendChild(style);

  // 2. Layar Login Wajib
  const gate = document.createElement("div");
  gate.id = "mtx-auth-gate";
  gate.innerHTML = `
    <div class="mtx-auth-card">
      <h2 style="margin:0 0 4px; font-size:20px;">MiniTube X</h2>
      <p style="margin:0 0 14px; font-size:12.5px; color:#1d5b79;">
        Masuk dengan Google atau Email untuk membuat Channel & berinteraksi.
      </p>

      <div id="mtx-form-login">
        <button type="button" id="mtx-login-google" class="mtx-btn-google">Masuk Cepat dengan Google</button>
        <div style="font-size:11.5px; color:#4a7c9b; margin:8px 0;">atau pakai email apapun</div>
        <input type="text" id="mtx-reg-nama" class="mtx-auth-input" placeholder="Nama Channel kamu (khusus daftar baru)" style="display:none;">
        <input type="email" id="mtx-auth-email" class="mtx-auth-input" placeholder="Alamat email kamu (contoh: nama@gmail.com)">
        <input type="password" id="mtx-auth-pass" class="mtx-auth-input" placeholder="Password (minimal 6 karakter)">
        <button type="button" id="mtx-submit-email" class="mtx-btn-email">Masuk dengan Email</button>
        <p style="margin:10px 0 0; font-size:12px;">
          <span id="mtx-toggle-text">Belum punya akun email?</span>
          <a href="#" id="mtx-toggle-mode" style="color:#0077b6; font-weight:700;">Daftar Baru</a>
        </p>
      </div>

      <div id="mtx-box-verifikasi" style="display:none;">
        <p style="font-size:13px; line-height:1.5; margin:0 0 12px;">
          Link verifikasi sudah dikirim ke <strong id="mtx-verif-email"></strong>.<br>
          Buka inbox (atau folder Spam) email kamu lalu klik link-nya.
        </p>
        <button type="button" id="mtx-cek-verif" class="mtx-btn-email" style="margin-bottom:8px;">Saya Sudah Klik Link (Masuk)</button>
        <button type="button" id="mtx-kirim-ulang" class="mtx-btn-google" style="margin-bottom:8px; font-size:12.5px;">Kirim Ulang Link Verifikasi</button>
        <a href="#" id="mtx-logout-verif" style="font-size:12px; color:#c9184a; font-weight:600;">Ganti Akun / Keluar</a>
      </div>

      <div id="mtx-auth-err" style="margin-top:10px; font-size:12px; color:#c9184a; font-weight:600;"></div>
    </div>
  `;
  document.body.appendChild(gate);

  let modeDaftar = false;
  const errBox = document.getElementById("mtx-auth-err");

  document.getElementById("mtx-toggle-mode").onclick = (e) => {
    e.preventDefault();
    modeDaftar = !modeDaftar;
    errBox.textContent = "";
    document.getElementById("mtx-reg-nama").style.display = modeDaftar ? "block" : "none";
    document.getElementById("mtx-submit-email").textContent = modeDaftar ? "Daftar & Kirim Verifikasi Email" : "Masuk dengan Email";
    document.getElementById("mtx-toggle-text").textContent = modeDaftar ? "Sudah punya akun?" : "Belum punya akun email?";
    document.getElementById("mtx-toggle-mode").textContent = modeDaftar ? "Masuk di sini" : "Daftar Baru";
  };

  document.getElementById("mtx-login-google").onclick = async () => {
    errBox.textContent = "";
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (err) {
      if (err.code === "auth/popup-blocked") {
        await auth.signInWithRedirect(provider);
      } else {
        errBox.textContent = "Gagal login Google: " + err.message;
      }
    }
  };

  document.getElementById("mtx-submit-email").onclick = async () => {
    errBox.textContent = "";
    const email = document.getElementById("mtx-auth-email").value.trim();
    const pass  = document.getElementById("mtx-auth-pass").value;
    const nama  = document.getElementById("mtx-reg-nama").value.trim();
    if (!email || !pass) {
      errBox.textContent = "Isi email dan password terlebih dahulu.";
      return;
    }
    try {
      if (modeDaftar) {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        if (nama) await cred.user.updateProfile({ displayName: nama });
        await cred.user.sendEmailVerification();
      } else {
        await auth.signInWithEmailAndPassword(email, pass);
      }
    } catch (err) {
      errBox.textContent = err.message;
    }
  };

  document.getElementById("mtx-cek-verif").onclick = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      terapkanStatusUser(auth.currentUser);
    } else {
      errBox.textContent = "Email belum terverifikasi. Klik link di inbox email kamu dulu.";
    }
  };

  document.getElementById("mtx-kirim-ulang").onclick = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.sendEmailVerification();
      errBox.style.color = "#0a6847";
      errBox.textContent = "Link verifikasi baru berhasil dikirim ke email kamu!";
    } catch (err) {
      errBox.style.color = "#c9184a";
      errBox.textContent = err.message;
    }
  };

  document.getElementById("mtx-logout-verif").onclick = (e) => {
    e.preventDefault();
    auth.signOut();
  };

  function getProfilSaya() {
    if (!userAktif) return null;
    const myEmail = userAktif.email.toLowerCase();
    return daftarChannelCache.find((c) => c.email === myEmail) || {
      email: myEmail,
      nama: userAktif.displayName || myEmail.split("@")[0],
      bio: "Kreator di MiniTube X",
      foto: userAktif.photoURL || "",
      followers: [],
      saved: [],
      notifications: [],
      blockedPosts: [],
      blockedKeywords: []
    };
  }

  function kunciInputNama() {
    const inputNama = document.getElementById("inputNama");
    if (!inputNama || !userAktif) return;
    const p = getProfilSaya();
    inputNama.value = `${p.nama} (${p.email})`;
    inputNama.readOnly = true;
    inputNama.style.opacity = "0.85";
    inputNama.style.cursor = "not-allowed";
  }

  function isAdmin() {
    return userAktif && userAktif.email && userAktif.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }

  function updateBadgeNotif() {
    const btnNotif = document.getElementById("tab-notif");
    if (!btnNotif) return;
    const p = getProfilSaya();
    const notifs = Array.isArray(p?.notifications) ? p.notifications : [];
    const unread = notifs.filter((n) => !n.dibaca).length;
    btnNotif.textContent = unread > 0 ? `Notifikasi (${unread})` : "Notifikasi";
  }

  // 3. Tambahkan Tab "Cari", "Notifikasi", "Disimpan", dan "Channel"
  function pasangTabSosial() {
    const navTabs = document.querySelector(".aero-tabs");
    const mainEl  = document.querySelector(".main-container");
    if (!navTabs || !mainEl) return;

    const tabsBaru = [
      { id: "tab-search", label: "Cari", action: () => bukaTabKhusus("search") },
      { id: "tab-notif",  label: "Notifikasi", action: () => bukaTabKhusus("notif") },
      { id: "tab-saved",  label: "Disimpan", action: () => bukaTabKhusus("saved") },
      {
        id: "tab-channel",
        label: "Channel",
        action: () => {
          channelSedangDilihat = userAktif ? userAktif.email.toLowerCase() : null;
          bukaTabKhusus("channel");
        }
      }
    ];

    tabsBaru.forEach((t) => {
      if (!document.getElementById(t.id)) {
        const btn = document.createElement("button");
        btn.className = "tab-btn";
        btn.id = t.id;
        btn.textContent = t.label;
        btn.onclick = () => {
          komenTerbuka.clear();
          t.action();
        };
        navTabs.appendChild(btn);
      }
    });

    ["view-search", "view-notif", "view-saved", "view-channel"].forEach((vidId) => {
      if (!document.getElementById(vidId)) {
        const sec = document.createElement("section");
        sec.id = vidId;
        sec.className = vidId === "view-saved" ? "feed-container hidden" : "hidden";
        mainEl.appendChild(sec);
      }
    });
  }
  pasangTabSosial();

  function bukaTabKhusus(namaTab) {
    ["view-feed", "view-video", "view-short", "view-search", "view-notif", "view-saved", "view-channel"].forEach((id) => {
      document.getElementById(id)?.classList.add("hidden");
    });
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));

    if (namaTab === "search") {
      document.getElementById("view-search")?.classList.remove("hidden");
      document.getElementById("tab-search")?.classList.add("active");
      renderHalamanCari(false);
    } else if (namaTab === "notif") {
      document.getElementById("view-notif")?.classList.remove("hidden");
      document.getElementById("tab-notif")?.classList.add("active");
      renderHalamanNotifikasi();
    } else if (namaTab === "saved") {
      document.getElementById("view-saved")?.classList.remove("hidden");
      document.getElementById("tab-saved")?.classList.add("active");
      renderHalamanDisimpan();
    } else if (namaTab === "channel") {
      document.getElementById("view-channel")?.classList.remove("hidden");
      document.getElementById("tab-channel")?.classList.add("active");
      renderHalamanChannel(channelSedangDilihat || (userAktif && userAktif.email.toLowerCase()));
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    if (["tab-feed", "tab-video", "tab-short"].includes(btn.id)) {
      komenTerbuka.clear();
      ["view-search", "view-notif", "view-saved", "view-channel"].forEach((id) => document.getElementById(id)?.classList.add("hidden"));
      ["tab-search", "tab-notif", "tab-saved", "tab-channel"].forEach((id) => document.getElementById(id)?.classList.remove("active"));
      setTimeout(() => {
        pasangBarAlgoritmaFeed();
        pasangKontrolSemua(true);
        updatePemutarUtamaSocial(true);
      }, 80);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && userAktif) {
      const aktif = document.activeElement;
      if (!aktif || !["INPUT", "TEXTAREA", "SELECT"].includes(aktif.tagName)) {
        e.preventDefault();
        bukaTabKhusus("search");
        setTimeout(() => document.getElementById("mtx-search-input")?.focus(), 40);
      }
    }
  });

  // 4. Header Pill Profil & Tombol Keluar
  function pasangInfoHeader() {
    const nav = document.querySelector(".nav-actions");
    if (!nav || !userAktif) return;
    const lama = document.getElementById("mtx-user-controls");
    if (lama) lama.remove();

    const p = getProfilSaya();
    const wrap = document.createElement("span");
    wrap.id = "mtx-user-controls";
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;";

    const pill = document.createElement("span");
    pill.className = "mtx-user-pill";
    pill.title = "Buka Channel Saya";
    pill.innerHTML = `<img src="${resolveAvatarUrl(p.foto, p.nama)}" data-fallback-nama="${esc(p.nama)}"> <span>${esc(p.nama)}</span> ${isAdmin() ? '<span class="mtx-admin-tag">ADMIN</span>' : ""}`;
    pill.onclick = () => {
      komenTerbuka.clear();
      channelSedangDilihat = p.email;
      bukaTabKhusus("channel");
    };
    wrap.appendChild(pill);

    const btnOut = document.createElement("button");
    btnOut.type = "button";
    btnOut.className = "win7-btn";
    btnOut.textContent = "Keluar";
    btnOut.onclick = () => {
      if (confirm("Keluar dari akun MiniTube X?")) auth.signOut();
    };
    wrap.appendChild(btnOut);

    nav.insertBefore(wrap, nav.firstChild);
  }

  async function muatDataChannel() {
    const serverUrl = getServerUrl();
    if (!serverUrl || !userAktif) return;
    try {
      const res = await nativeFetch(`${serverUrl}/api/channels?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          daftarChannelCache = list;
          kunciInputNama();
          pasangInfoHeader();
          updateBadgeNotif();
          pasangBarAlgoritmaFeed();
          if (!document.getElementById("view-search")?.classList.contains("hidden")) renderHasilCariSaja();
          if (!document.getElementById("view-notif")?.classList.contains("hidden")) renderHalamanNotifikasi();
          if (!document.getElementById("view-channel")?.classList.contains("hidden")) {
            renderHalamanChannel(channelSedangDilihat || userAktif.email.toLowerCase());
          }
          if (!document.getElementById("view-saved")?.classList.contains("hidden")) renderHalamanDisimpan();
        }
      }
    } catch (e) {}
  }

  async function terapkanStatusUser(user) {
    errBox.textContent = "";
    if (!user) {
      userAktif = null;
      gate.style.display = "flex";
      document.getElementById("mtx-form-login").style.display = "block";
      document.getElementById("mtx-box-verifikasi").style.display = "none";
      return;
    }

    if (!user.emailVerified) {
      userAktif = null;
      gate.style.display = "flex";
      document.getElementById("mtx-form-login").style.display = "none";
      document.getElementById("mtx-box-verifikasi").style.display = "block";
      document.getElementById("mtx-verif-email").textContent = user.email;
      return;
    }

    userAktif = user;
    gate.style.display = "none";
    pasangTabSosial();
    kunciInputNama();
    pasangInfoHeader();
    await muatDataChannel();
    if (typeof renderSemuaTab === "function") renderSemuaTab();
  }

  auth.onAuthStateChanged(terapkanStatusUser);
  setInterval(() => { if (userAktif) kunciInputNama(); }, 2000);

  // 5. Interceptor Fetch (Menyuntikkan Auth + Filter Blokir + Algoritma Rekomendasi)
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function (resource, options) {
    const urlStr = typeof resource === "string" ? resource : (resource && resource.url) || "";
    const opts = Object.assign({}, options);

    if (urlStr.includes("/api/") && userAktif) {
      const token = await userAktif.getIdToken();
      opts.headers = Object.assign({}, opts.headers, {
        "Authorization": "Bearer " + token
      });
    }

    const response = await nativeFetch(resource, opts);

    if (urlStr.includes("/api/posts") && response.ok) {
      try {
        const rawData = await response.clone().json();
        if (Array.isArray(rawData)) {
          daftarPostCache = rawData;
          const hasilTampil = terapkanFilterDanAlgoritma(rawData);

          if (!sedangSibukInteraksi()) {
            setTimeout(() => {
              pasangBarAlgoritmaFeed();
              pasangKontrolSemua(true);
              updatePemutarUtamaSocial(true);
              cekBukaSharedPost();
              if (!document.getElementById("view-search")?.classList.contains("hidden")) renderHasilCariSaja();
            }, 120);
          }

          return new Response(JSON.stringify(hasilTampil), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {}
    }

    return response;
  };

  // 6. Aksi Sosial API (Like, Comment/Reply, Follow, Save, Block, Share)
  async function kirimAksiApi(endpoint, payload) {
    const serverUrl = getServerUrl();
    if (!serverUrl || !userAktif) return false;
    const token = await userAktif.getIdToken();
    const res = await nativeFetch(`${serverUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      alert(await res.text());
      return false;
    }
    return true;
  }

  async function segarkanSosial(reRenderFeed) {
    const serverUrl = getServerUrl();
    if (!serverUrl) return;
    await muatDataChannel();
    if (reRenderFeed && typeof renderSemuaTab === "function") {
      renderSemuaTab();
      return;
    }
    try {
      const res = await nativeFetch(`${serverUrl}/api/posts?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        daftarPostCache = await res.json();
        pasangBarAlgoritmaFeed();
        pasangKontrolSemua(true);
        updatePemutarUtamaSocial(true);
        if (!document.getElementById("view-search")?.classList.contains("hidden")) renderHasilCariSaja();
        if (!document.getElementById("view-saved")?.classList.contains("hidden")) renderHalamanDisimpan();
        if (!document.getElementById("view-channel")?.classList.contains("hidden")) {
          renderHalamanChannel(channelSedangDilihat || userAktif.email.toLowerCase());
        }
      }
    } catch (e) {}
  }

  function bagikanPostingan(post) {
    if (!post) return;
    const serverUrl = getServerUrl();
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareUrl = `${baseUrl}?server=${encodeURIComponent(serverUrl)}&post=${encodeURIComponent(post.id)}`;
    const judul = post.teks ? post.teks.slice(0, 80) : "Postingan di MiniTube X";

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        tampilkanToast("Link postingan berhasil disalin ke clipboard.");
      }).catch(() => {
        prompt("Salin link postingan ini:", shareUrl);
      });
    } else {
      prompt("Salin link postingan ini:", shareUrl);
    }

    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      navigator.share({ title: "MiniTube X", text: judul, url: shareUrl }).catch(() => {});
    }
  }

  async function blokirKontenSerupa(post) {
    if (!post) return;
    const keywords = ekstrakKataKunciPost(post);
    const title = post.teks ? post.teks.slice(0, 60) : (post.file || "Postingan tanpa judul");

    catatSinyalAlgoritma(post, -25);
    const ok = await kirimAksiApi("/api/block", {
      action: "block",
      postId: post.id,
      title,
      keywords
    });

    if (ok) {
      komenTerbuka.delete(post.id);
      await segarkanSosial(true);
      const infoKw = keywords.length > 0 ? ` (topik: ${keywords.slice(0, 3).join(", ")})` : "";
      tampilkanToast(
        `Konten ini & konten serupa diblokir${infoKw}.`,
        "Buka Blokir",
        async () => {
          await bukaBlokirVideo(post.id, keywords);
        }
      );
    }
  }

  async function bukaBlokirVideo(postId, keywords) {
    const ok = await kirimAksiApi("/api/block", {
      action: "unblock",
      postId,
      keywords: keywords || []
    });
    if (ok) {
      await segarkanSosial(true);
      tampilkanToast("Blokir dibuka. Konten & topik serupa kembali tampil.");
    }
  }

  // Modal Kelola Konten Diblokir
  function bukaModalBlokir() {
    const lama = document.getElementById("mtx-modal-blokir");
    if (lama) lama.remove();

    const profilSaya = getProfilSaya();
    const blkPosts = Array.isArray(profilSaya?.blockedPosts) ? profilSaya.blockedPosts : [];
    const blkKeywords = Array.isArray(profilSaya?.blockedKeywords) ? profilSaya.blockedKeywords : [];

    // Kelompokkan berdasarkan sourcePostId agar membuka 1 video otomatis membuka semua keyword terkait
    const daftarGrup = [];
    const sudahPostId = new Set();

    blkPosts.forEach((pid) => {
      sudahPostId.add(pid);
      const postAsli = daftarPostCache.find((p) => p.id === pid);
      const kwTerkait = blkKeywords
        .filter((k) => (typeof k === "object" && k.sourcePostId === pid))
        .map((k) => k.keyword);
      const judul = postAsli
        ? (postAsli.teks || postAsli.file || "Postingan")
        : ((blkKeywords.find((k) => k.sourcePostId === pid)?.sourceTitle) || `Postingan (${pid.slice(0, 6)})`);

      daftarGrup.push({ postId: pid, title: judul, keywords: kwTerkait });
    });

    blkKeywords.forEach((k) => {
      if (typeof k === "object" && k.sourcePostId && !sudahPostId.has(k.sourcePostId)) {
        sudahPostId.add(k.sourcePostId);
        daftarGrup.push({
          postId: k.sourcePostId,
          title: k.sourceTitle || k.keyword,
          keywords: [k.keyword]
        });
      }
    });

    const backdrop = document.createElement("div");
    backdrop.id = "mtx-modal-blokir";
    backdrop.className = "mtx-modal-backdrop";
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

    const isiList = daftarGrup.length === 0
      ? `<p style="font-size:13px;color:#3d6e8c;text-align:center;padding:16px 0;">Tidak ada video atau topik yang sedang diblokir.</p>`
      : daftarGrup.map((g, idx) => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(255,255,255,0.88);border:1px solid #bce3fa;border-radius:12px;padding:10px 12px;margin-bottom:8px;">
            <div style="min-width:0;">
              <div style="font-size:13px;font-weight:700;color:#083d63;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(g.title)}</div>
              <div style="font-size:11px;color:#4a7c9b;">Kata kunci serupa: ${g.keywords.length ? esc(g.keywords.join(", ")) : "Hanya item ini"}</div>
            </div>
            <button type="button" data-unblock-idx="${idx}" class="win7-btn win7-btn-primary" style="white-space:nowrap;">Buka Blokir</button>
          </div>
        `).join("");

    backdrop.innerHTML = `
      <div class="mtx-modal-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;font-size:16px;">Konten & Topik Serupa Diblokir (${daftarGrup.length})</h3>
          <button type="button" id="mtx-close-blokir" class="win7-btn">Tutup</button>
        </div>
        <p style="font-size:12px;color:#2b678a;margin:0 0 12px;">
          Membuka blokir pada salah satu video akan otomatis membuka blokir untuk konten serupa pada topik tersebut.
        </p>
        <div>${isiList}</div>
        ${daftarGrup.length > 0 ? `<button type="button" id="mtx-unblock-all" class="win7-btn" style="width:100%;margin-top:6px;">Buka Semua Blokir</button>` : ""}
      </div>
    `;

    document.body.appendChild(backdrop);
    document.getElementById("mtx-close-blokir").onclick = () => backdrop.remove();

    backdrop.querySelectorAll("[data-unblock-idx]").forEach((btn) => {
      btn.onclick = async () => {
        const g = daftarGrup[Number(btn.getAttribute("data-unblock-idx"))];
        backdrop.remove();
        if (g) await bukaBlokirVideo(g.postId, g.keywords);
      };
    });

    const btnAll = document.getElementById("mtx-unblock-all");
    if (btnAll) {
      btnAll.onclick = async () => {
        backdrop.remove();
        if (await kirimAksiApi("/api/block", { action: "unblock_all" })) {
          await segarkanSosial(true);
          tampilkanToast("Semua blokir konten telah dibuka.");
        }
      };
    }
  }

  // Bar Algoritma & Kelola Blokir di atas Feed
  function pasangBarAlgoritmaFeed() {
    const feedEl = document.getElementById("view-feed");
    if (!feedEl || !userAktif) return;

    let bar = document.getElementById("mtx-algo-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "mtx-algo-bar";
      bar.className = "mtx-algo-bar";
      feedEl.insertBefore(bar, feedEl.firstChild);
    } else if (feedEl.firstChild !== bar) {
      feedEl.insertBefore(bar, feedEl.firstChild);
    }

    const profilSaya = getProfilSaya();
    const jmlBlokir = Array.isArray(profilSaya?.blockedPosts) ? profilSaya.blockedPosts.length : 0;

    const modes = [
      { id: "algoritma", label: "Untuk Kamu" },
      { id: "mengikuti", label: "Mengikuti" },
      { id: "terbaru",   label: "Terbaru" }
    ];

    bar.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        ${modes.map((m) => `
          <button type="button" data-feed-mode="${m.id}" class="mtx-chip-btn ${modeFeed === m.id ? "active" : ""}">${m.label}</button>
        `).join("")}
      </div>
      <button type="button" id="mtx-open-blokir" class="mtx-chip-btn">Diblokir (${jmlBlokir})</button>
    `;

    bar.querySelectorAll("[data-feed-mode]").forEach((btn) => {
      btn.onclick = () => {
        modeFeed = btn.getAttribute("data-feed-mode");
        localStorage.setItem("mtx_feed_mode", modeFeed);
        pasangBarAlgoritmaFeed();
        if (typeof renderSemuaTab === "function") renderSemuaTab();
      };
    });

    document.getElementById("mtx-open-blokir").onclick = bukaModalBlokir;
  }

  // Modal Spotlight untuk Postingan dari Notifikasi / Link Share
  function bukaModalPost(postId) {
    const post = daftarPostCache.find((p) => p.id === postId);
    if (!post) {
      tampilkanToast("Postingan ini sudah kedaluwarsa (lewat 24 jam) atau dihapus.");
      return;
    }

    catatSinyalAlgoritma(post, 4);
    const lama = document.getElementById("mtx-modal-post");
    if (lama) lama.remove();

    const myEmail = userAktif.email.toLowerCase();
    const profilSaya = getProfilSaya();
    const daftarSaved = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];
    const serverUrl = getServerUrl();

    const chData = daftarChannelCache.find((c) => c.email === (post.email || "").toLowerCase());
    const chNama = chData ? chData.nama : (post.channelNama || post.penulis);
    const chFoto = chData ? chData.foto : (post.channelFoto || "");
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const sudahLike = likes.includes(myEmail);
    const sudahSave = daftarSaved.includes(post.id);

    const mediaUrl = post.file && serverUrl ? `${serverUrl}/media/${encodeURIComponent(post.file)}` : "";
    const mediaHtml = post.jenisMedia === "video" && mediaUrl
      ? `<video src="${mediaUrl}" controls autoplay style="width:100%;max-height:320px;border-radius:12px;background:#000;margin-top:8px;"></video>`
      : (post.jenisMedia === "image" && mediaUrl
        ? `<img src="${mediaUrl}" style="width:100%;max-height:360px;object-fit:contain;border-radius:12px;margin-top:8px;">`
        : "");

    const backdrop = document.createElement("div");
    backdrop.id = "mtx-modal-post";
    backdrop.className = "mtx-modal-backdrop";
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

    backdrop.innerHTML = `
      <div class="mtx-modal-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div class="mtx-creator-info" id="mtx-spot-creator">
            <img src="${resolveAvatarUrl(chFoto, chNama)}" data-fallback-nama="${esc(chNama)}">
            <div>
              <div style="font-size:13px;font-weight:800;">${esc(chNama)}</div>
              <div style="font-size:11px;color:#3d6e8c;">${formatWaktuSingkat(post.dibuatPada)}</div>
            </div>
          </div>
          <button type="button" id="mtx-close-spot" class="win7-btn">Tutup</button>
        </div>
        <div style="font-size:13.5px;line-height:1.45;">${esc(post.teks || "")}</div>
        ${mediaHtml}
        <div class="mtx-social-bar" style="margin-top:10px;">
          <button type="button" id="mtx-spot-like" class="mtx-act-btn ${sudahLike ? "liked" : ""}">${sudahLike ? "♥" : "♡"} Suka (${likes.length})</button>
          <button type="button" id="mtx-spot-save" class="mtx-act-btn ${sudahSave ? "saved" : ""}">${sudahSave ? "Tersimpan" : "Simpan"}</button>
          <button type="button" id="mtx-spot-share" class="mtx-act-btn">Bagikan</button>
        </div>
        <div id="mtx-spot-comments"></div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.getElementById("mtx-close-spot").onclick = () => backdrop.remove();
    document.getElementById("mtx-spot-creator").onclick = () => {
      backdrop.remove();
      if (post.email) {
        channelSedangDilihat = post.email.toLowerCase();
        bukaTabKhusus("channel");
      }
    };
    document.getElementById("mtx-spot-like").onclick = async () => {
      catatSinyalAlgoritma(post, 8);
      if (await kirimAksiApi("/api/like", { id: post.id })) {
        await segarkanSosial(false);
        bukaModalPost(post.id);
      }
    };
    document.getElementById("mtx-spot-save").onclick = async () => {
      catatSinyalAlgoritma(post, 10);
      if (await kirimAksiApi("/api/save", { id: post.id })) {
        await segarkanSosial(false);
        bukaModalPost(post.id);
      }
    };
    document.getElementById("mtx-spot-share").onclick = () => bagikanPostingan(post);

    const komenSlot = document.getElementById("mtx-spot-comments");
    komenSlot.appendChild(buatDrawerKomentar(post, false, () => bukaModalPost(post.id)));
  }

  function cekBukaSharedPost() {
    if (sharedPostHandled || !userAktif || !daftarPostCache.length) return;
    const sharedId = getSharedPostParam();
    if (!sharedId) return;
    sharedPostHandled = true;
    bukaModalPost(sharedId);
  }

  function cariPostUntukElemen(el, filterTipe) {
    if (!el || !daftarPostCache.length) return null;
    const rawHtml = el.innerHTML || "";
    const decHtml = decodeSafe(rawHtml);
    const txtNorm = normText(el.textContent || "");

    const kandidatList = filterTipe
      ? daftarPostCache.filter((p) => (p.tipe || "feed") === filterTipe)
      : daftarPostCache;

    let ketemu = kandidatList.find((p) => p.file && (rawHtml.includes(p.file) || decHtml.includes(p.file)));
    if (ketemu) return ketemu;

    ketemu = kandidatList.find((p) => {
      const penulisNorm = normText(p.penulis);
      const teksNorm = normText(p.teks);
      if (penulisNorm && teksNorm) {
        return txtNorm.includes(penulisNorm) && txtNorm.includes(teksNorm.slice(0, 30));
      }
      if (teksNorm && teksNorm.length >= 3) {
        return txtNorm.includes(teksNorm);
      }
      return false;
    });
    return ketemu || null;
  }

  // Komponen Kotak Komentar + Fitur Balas (Reply)
  function buatDrawerKomentar(post, isShortsOverlay, onAfterSubmit) {
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const box = document.createElement("div");
    box.className = isShortsOverlay ? "mtx-shorts-drawer" : "mtx-comment-box";
    box.onclick = (e) => e.stopPropagation();

    const headerHtml = isShortsOverlay
      ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:12px;font-weight:700;">
           <span>Komentar (${comments.length})</span>
           <button type="button" class="mtx-close-short-komen" style="border:none;background:rgba(255,255,255,0.85);border-radius:50%;width:22px;height:22px;cursor:pointer;font-weight:bold;">x</button>
         </div>`
      : "";

    const listKomenHtml = comments.length === 0
      ? `<div style="font-size:11.5px;color:#5c7a89;margin-bottom:6px;">Belum ada komentar.</div>`
      : comments.map((c, idx) => {
          const cProf = daftarChannelCache.find((u) => u.email === (c.email || "").toLowerCase());
          const cNama = cProf ? cProf.nama : c.nama;
          const cFoto = cProf ? cProf.foto : c.foto;
          const replyTag = c.replyToNama
            ? `<span style="font-size:10.5px;color:#0077b6;font-weight:700;">↳ membalas @${esc(c.replyToNama)}</span><br>`
            : "";
          return `
            <div class="mtx-comment-item ${c.replyToNama ? "is-reply" : ""}">
              <img src="${resolveAvatarUrl(cFoto, cNama)}" data-fallback-nama="${esc(cNama)}">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                  <strong style="color:#083d63;">${esc(cNama)}</strong>
                  <span style="font-size:10px;color:#62859c;">${formatWaktuSingkat(c.waktu)}</span>
                </div>
                ${replyTag}
                <span style="color:#1b3b4d;word-break:break-word;">${esc(c.teks)}</span><br>
                <button type="button" data-reply-idx="${idx}" class="mtx-reply-link">Balas</button>
              </div>
            </div>
          `;
        }).join("");

    const activeReply = targetBalasKomen[post.id];
    const replyBannerHtml = activeReply
      ? `<div class="mtx-reply-banner">
           <span>Membalas <strong>@${esc(activeReply.nama)}</strong></span>
           <button type="button" class="mtx-cancel-reply" style="border:none;background:none;color:#c9184a;font-weight:800;cursor:pointer;">Batal</button>
         </div>`
      : "";

    box.innerHTML = `
      ${headerHtml}
      <div style="max-height:150px;overflow-y:auto;margin-bottom:6px;">${listKomenHtml}</div>
      ${replyBannerHtml}
      <div style="display:flex;gap:6px;">
        <input type="text" class="aero-input mtx-input-komen" placeholder="${activeReply ? `Balas @${esc(activeReply.nama)}...` : "Tulis komentar..."}" maxlength="280" style="margin:0;padding:6px 10px;font-size:12px;">
        <button type="button" class="win7-btn win7-btn-primary mtx-send-komen" style="padding:5px 12px;font-size:12px;">Kirim</button>
      </div>
    `;

    if (isShortsOverlay) {
      box.querySelector(".mtx-close-short-komen").onclick = (e) => {
        e.stopPropagation();
        komenTerbuka.delete(post.id);
        pasangKontrolSemua(true);
      };
    }

    const inp = box.querySelector(".mtx-input-komen");
    inp.value = drafKomen[post.id] || "";
    inp.oninput = () => { drafKomen[post.id] = inp.value; };
    inp.onclick = (e) => e.stopPropagation();

    box.querySelectorAll("[data-reply-idx]").forEach((btnR) => {
      btnR.onclick = (e) => {
        e.stopPropagation();
        const cObj = comments[Number(btnR.getAttribute("data-reply-idx"))];
        if (!cObj) return;
        const cProf = daftarChannelCache.find((u) => u.email === (cObj.email || "").toLowerCase());
        targetBalasKomen[post.id] = {
          parentId: cObj.id || "",
          email: (cObj.email || "").toLowerCase(),
          nama: cProf ? cProf.nama : cObj.nama
        };
        if (typeof onAfterSubmit === "function") {
          onAfterSubmit();
        } else {
          pasangKontrolSemua(true);
          updatePemutarUtamaSocial(true);
          if (!document.getElementById("view-search")?.classList.contains("hidden")) renderHasilCariSaja();
        }
        setTimeout(() => {
          const baruInp = document.querySelector(".mtx-input-komen");
          if (baruInp) baruInp.focus();
        }, 40);
      };
    });

    const btnCancelReply = box.querySelector(".mtx-cancel-reply");
    if (btnCancelReply) {
      btnCancelReply.onclick = (e) => {
        e.stopPropagation();
        delete targetBalasKomen[post.id];
        if (typeof onAfterSubmit === "function") {
          onAfterSubmit();
        } else {
          pasangKontrolSemua(true);
          updatePemutarUtamaSocial(true);
          if (!document.getElementById("view-search")?.classList.contains("hidden")) renderHasilCariSaja();
        }
      };
    }

    const kirimHandler = async (e) => {
      if (e) e.stopPropagation();
      const isi = inp.value.trim();
      if (!isi) return;

      const rep = targetBalasKomen[post.id] || {};
      drafKomen[post.id] = "";
      delete targetBalasKomen[post.id];
      catatSinyalAlgoritma(post, 10);

      const ok = await kirimAksiApi("/api/comment", {
        id: post.id,
        teks: isi,
        replyToEmail: rep.email || "",
        replyToNama: rep.nama || "",
        parentId: rep.parentId || ""
      });

      if (ok) {
        await segarkanSosial(false);
        if (typeof onAfterSubmit === "function") onAfterSubmit();
      }
    };

    box.querySelector(".mtx-send-komen").onclick = kirimHandler;
    inp.onkeydown = (ev) => {
      if (ev.key === "Enter") kirimHandler(ev);
    };

    return box;
  }

  // 7A. Pasang Kontrol pada Kartu Feed & Grid Video
  function pasangKartuStandar(containerId, filterTipe, paksaUpdate) {
    const container = document.getElementById(containerId);
    if (!container || !userAktif || !daftarPostCache.length) return;

    const myEmail = userAktif.email.toLowerCase();
    const profilSaya = getProfilSaya();
    const daftarSaved = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];

    Array.from(container.children).forEach((kartu) => {
      if (kartu.id === "mtx-algo-bar") return;

      const lamaWrap = kartu.querySelector(".mtx-social-wrap");
      if (lamaWrap && !paksaUpdate) return;

      const post = cariPostUntukElemen(kartu, filterTipe);
      if (!post) return;

      if (lamaWrap) lamaWrap.remove();
      const lamaTop = kartu.querySelector(".mtx-creator-bar");
      if (lamaTop) lamaTop.remove();

      const chData = daftarChannelCache.find((c) => c.email === (post.email || "").toLowerCase());
      const chNama = chData ? chData.nama : (post.channelNama || post.penulis);
      const chFoto = chData ? chData.foto : (post.channelFoto || "");
      const chFollowers = chData && Array.isArray(chData.followers) ? chData.followers : [];
      const sudahFollow = chFollowers.includes(myEmail);
      const bukanMilikSendiri = post.email && post.email.toLowerCase() !== myEmail;

      const topBar = document.createElement("div");
      topBar.className = "mtx-creator-bar";
      topBar.innerHTML = `
        <div class="mtx-creator-info" title="Lihat Channel ${esc(chNama)}">
          <img src="${resolveAvatarUrl(chFoto, chNama)}" data-fallback-nama="${esc(chNama)}">
          <div>
            <div style="font-size:12.5px;font-weight:700;color:#083d63;">${esc(chNama)}</div>
            <div style="font-size:11px;color:#3d6e8c;">${chFollowers.length} Pengikut</div>
          </div>
        </div>
      `;
      topBar.querySelector(".mtx-creator-info").onclick = (e) => {
        e.stopPropagation();
        if (post.email) {
          komenTerbuka.clear();
          channelSedangDilihat = post.email.toLowerCase();
          bukaTabKhusus("channel");
        }
      };

      if (bukanMilikSendiri) {
        const btnFollow = document.createElement("button");
        btnFollow.type = "button";
        btnFollow.className = "mtx-btn-follow" + (sudahFollow ? " following" : "");
        btnFollow.textContent = sudahFollow ? "Mengikuti" : "+ Ikuti";
        btnFollow.onclick = async (e) => {
          e.stopPropagation();
          catatSinyalAlgoritma(post, 15);
          if (await kirimAksiApi("/api/follow", { targetEmail: post.email })) {
            await segarkanSosial(false);
          }
        };
        topBar.appendChild(btnFollow);
      }
      kartu.insertBefore(topBar, kartu.firstChild);

      const likes = Array.isArray(post.likes) ? post.likes : [];
      const comments = Array.isArray(post.comments) ? post.comments : [];
      const sudahLike = likes.includes(myEmail);
      const sudahSave = daftarSaved.includes(post.id);

      const socialWrap = document.createElement("div");
      socialWrap.className = "mtx-social-wrap";

      const bar = document.createElement("div");
      bar.className = "mtx-social-bar";

      const btnLike = document.createElement("button");
      btnLike.type = "button";
      btnLike.className = "mtx-act-btn" + (sudahLike ? " liked" : "");
      btnLike.textContent = `${sudahLike ? "♥" : "♡"} Suka (${likes.length})`;
      btnLike.onclick = async (e) => {
        e.stopPropagation();
        if (!sudahLike) catatSinyalAlgoritma(post, 8);
        if (await kirimAksiApi("/api/like", { id: post.id })) {
          await segarkanSosial(false);
        }
      };
      bar.appendChild(btnLike);

      const btnKomen = document.createElement("button");
      btnKomen.type = "button";
      btnKomen.className = "mtx-act-btn";
      btnKomen.textContent = `Komentar (${comments.length})`;
      btnKomen.onclick = (e) => {
        e.stopPropagation();
        if (komenTerbuka.has(post.id)) {
          komenTerbuka.delete(post.id);
        } else {
          komenTerbuka.add(post.id);
        }
        pasangKontrolSemua(true);
      };
      bar.appendChild(btnKomen);

      const btnShare = document.createElement("button");
      btnShare.type = "button";
      btnShare.className = "mtx-act-btn";
      btnShare.textContent = "Bagikan";
      btnShare.onclick = (e) => {
        e.stopPropagation();
        catatSinyalAlgoritma(post, 6);
        bagikanPostingan(post);
      };
      bar.appendChild(btnShare);

      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
      btnSave.textContent = sudahSave ? "Tersimpan" : "Simpan";
      btnSave.onclick = async (e) => {
        e.stopPropagation();
        if (!sudahSave) catatSinyalAlgoritma(post, 10);
        if (await kirimAksiApi("/api/save", { id: post.id })) {
          await segarkanSosial(false);
        }
      };
      bar.appendChild(btnSave);

      const btnBlock = document.createElement("button");
      btnBlock.type = "button";
      btnBlock.className = "mtx-act-btn block-btn";
      btnBlock.textContent = "Blokir Serupa";
      btnBlock.onclick = (e) => {
        e.stopPropagation();
        blokirKontenSerupa(post);
      };
      bar.appendChild(btnBlock);

      if (isAdmin()) {
        const btnHapus = document.createElement("button");
        btnHapus.type = "button";
        btnHapus.className = "mtx-btn-hapus-card";
        btnHapus.textContent = "Hapus";
        btnHapus.onclick = async (e) => {
          e.stopPropagation();
          if (!confirm(`Hapus permanen postingan dari ${chNama}?`)) return;
          if (await kirimAksiApi("/api/delete", { id: post.id })) {
            if (typeof renderSemuaTab === "function") renderSemuaTab();
          }
        };
        bar.appendChild(btnHapus);
      }

      socialWrap.appendChild(bar);
      if (komenTerbuka.has(post.id)) {
        socialWrap.appendChild(buatDrawerKomentar(post, false));
      }
      kartu.appendChild(socialWrap);
    });
  }

  // 7B. Floating Dock Shorts
  function pasangKartuShorts(paksaUpdate) {
    const wadah = document.getElementById("wadahShorts");
    if (!wadah || !userAktif || !daftarPostCache.length) return;

    const myEmail = userAktif.email.toLowerCase();
    const profilSaya = getProfilSaya();
    const daftarSaved = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];

    Array.from(wadah.children).forEach((slide) => {
      const lamaDock = slide.querySelector(".mtx-shorts-dock");
      if (lamaDock && !paksaUpdate) return;

      const post = cariPostUntukElemen(slide, "short");
      if (!post) return;

      if (lamaDock) lamaDock.remove();
      const lamaDrawer = slide.querySelector(".mtx-shorts-drawer");
      if (lamaDrawer) lamaDrawer.remove();

      if (getComputedStyle(slide).position === "static") {
        slide.style.position = "relative";
      }

      const chData = daftarChannelCache.find((c) => c.email === (post.email || "").toLowerCase());
      const chNama = chData ? chData.nama : (post.channelNama || post.penulis);
      const chFoto = chData ? chData.foto : (post.channelFoto || "");
      const chFollowers = chData && Array.isArray(chData.followers) ? chData.followers : [];
      const sudahFollow = chFollowers.includes(myEmail);
      const bukanMilikSendiri = post.email && post.email.toLowerCase() !== myEmail;

      const likes = Array.isArray(post.likes) ? post.likes : [];
      const comments = Array.isArray(post.comments) ? post.comments : [];
      const sudahLike = likes.includes(myEmail);
      const sudahSave = daftarSaved.includes(post.id);

      const dock = document.createElement("div");
      dock.className = "mtx-shorts-dock";

      const avWrap = document.createElement("div");
      avWrap.className = "mtx-short-avatar-wrap";
      avWrap.title = `Channel ${chNama}`;
      avWrap.innerHTML = `<img src="${resolveAvatarUrl(chFoto, chNama)}" data-fallback-nama="${esc(chNama)}">`;
      avWrap.onclick = (e) => {
        e.stopPropagation();
        if (post.email) {
          komenTerbuka.clear();
          channelSedangDilihat = post.email.toLowerCase();
          bukaTabKhusus("channel");
        }
      };
      if (bukanMilikSendiri) {
        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "mtx-short-follow-badge" + (sudahFollow ? " following" : "");
        badge.textContent = sudahFollow ? "✓" : "+";
        badge.onclick = async (e) => {
          e.stopPropagation();
          catatSinyalAlgoritma(post, 15);
          if (await kirimAksiApi("/api/follow", { targetEmail: post.email })) {
            await segarkanSosial(false);
          }
        };
        avWrap.appendChild(badge);
      }
      dock.appendChild(avWrap);

      const btnLike = document.createElement("button");
      btnLike.type = "button";
      btnLike.className = "mtx-short-pill-btn" + (sudahLike ? " liked" : "");
      btnLike.innerHTML = `${sudahLike ? "♥" : "♡"}<span>${likes.length}</span>`;
      btnLike.onclick = async (e) => {
        e.stopPropagation();
        if (!sudahLike) catatSinyalAlgoritma(post, 8);
        if (await kirimAksiApi("/api/like", { id: post.id })) {
          await segarkanSosial(false);
        }
      };
      dock.appendChild(btnLike);

      const btnKomen = document.createElement("button");
      btnKomen.type = "button";
      btnKomen.className = "mtx-short-pill-btn";
      btnKomen.innerHTML = `Chat<span>${comments.length}</span>`;
      btnKomen.onclick = (e) => {
        e.stopPropagation();
        if (komenTerbuka.has(post.id)) {
          komenTerbuka.delete(post.id);
        } else {
          komenTerbuka.add(post.id);
        }
        pasangKontrolSemua(true);
      };
      dock.appendChild(btnKomen);

      const btnShare = document.createElement("button");
      btnShare.type = "button";
      btnShare.className = "mtx-short-pill-btn";
      btnShare.innerHTML = `<span>Bagikan</span>`;
      btnShare.onclick = (e) => {
        e.stopPropagation();
        bagikanPostingan(post);
      };
      dock.appendChild(btnShare);

      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-short-pill-btn" + (sudahSave ? " saved" : "");
      btnSave.innerHTML = `<span>${sudahSave ? "Disimpan" : "Simpan"}</span>`;
      btnSave.onclick = async (e) => {
        e.stopPropagation();
        if (await kirimAksiApi("/api/save", { id: post.id })) {
          await segarkanSosial(false);
        }
      };
      dock.appendChild(btnSave);

      const btnBlock = document.createElement("button");
      btnBlock.type = "button";
      btnBlock.className = "mtx-short-pill-btn";
      btnBlock.innerHTML = `<span>Blokir</span>`;
      btnBlock.onclick = (e) => {
        e.stopPropagation();
        blokirKontenSerupa(post);
      };
      dock.appendChild(btnBlock);

      if (isAdmin()) {
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "mtx-short-pill-btn del";
        btnDel.innerHTML = `<span>Hapus</span>`;
        btnDel.onclick = async (e) => {
          e.stopPropagation();
          if (!confirm(`Hapus permanen Shorts dari ${chNama}?`)) return;
          if (await kirimAksiApi("/api/delete", { id: post.id })) {
            if (typeof renderSemuaTab === "function") renderSemuaTab();
          }
        };
        dock.appendChild(btnDel);
      }

      slide.appendChild(dock);

      if (komenTerbuka.has(post.id)) {
        slide.appendChild(buatDrawerKomentar(post, true));
      }
    });
  }

  function pasangKontrolSemua(paksaUpdate) {
    pasangKartuStandar("view-feed", null, paksaUpdate);
    pasangKartuStandar("gridVideo", "video", paksaUpdate);
    pasangKartuShorts(paksaUpdate);
  }

  // 7C. Pemutar Video Utama (#boxPemutarUtama)
  let lastPlayerPostId = "";
  function updatePemutarUtamaSocial(paksaUpdate) {
    const box = document.getElementById("boxPemutarUtama");
    const vid = document.getElementById("videoPemutarUtama");
    const bodyEl = box ? box.querySelector(".win7-window-body") : null;
    if (!box || !vid || !bodyEl || box.classList.contains("hidden") || !userAktif) return;

    const srcDec = decodeSafe(vid.currentSrc || vid.src || "");
    const judulTxt = normText(document.getElementById("judulPemutarUtama")?.textContent || "");
    const infoTxt  = normText(document.getElementById("infoPemutarUtama")?.textContent || "");

    const videoPosts = daftarPostCache.filter((p) => (p.tipe || "feed") === "video");
    let post = videoPosts.find((p) => p.file && srcDec.includes(p.file));
    if (!post && judulTxt) {
      post = videoPosts.find((p) => p.teks && judulTxt.includes(normText(p.teks).slice(0, 30)));
    }
    if (!post && infoTxt) {
      post = videoPosts.find((p) => p.penulis && infoTxt.includes(normText(p.penulis)));
    }

    let wadah = document.getElementById("mtx-player-social");
    if (!post) {
      if (wadah) wadah.remove();
      lastPlayerPostId = "";
      return;
    }

    if (wadah && !paksaUpdate && lastPlayerPostId === post.id) return;
    if (lastPlayerPostId !== post.id) {
      catatSinyalAlgoritma(post, 5); // Sinyal tontonan video untuk algoritma
    }
    lastPlayerPostId = post.id;

    if (!wadah) {
      wadah = document.createElement("div");
      wadah.id = "mtx-player-social";
      wadah.style.marginTop = "10px";
      bodyEl.appendChild(wadah);
    }
    wadah.innerHTML = "";

    const myEmail = userAktif.email.toLowerCase();
    const profilSaya = getProfilSaya();
    const daftarSaved = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];

    const chData = daftarChannelCache.find((c) => c.email === (post.email || "").toLowerCase());
    const chNama = chData ? chData.nama : (post.channelNama || post.penulis);
    const chFoto = chData ? chData.foto : (post.channelFoto || "");
    const chFollowers = chData && Array.isArray(chData.followers) ? chData.followers : [];
    const sudahFollow = chFollowers.includes(myEmail);
    const bukanMilikSendiri = post.email && post.email.toLowerCase() !== myEmail;

    const topBar = document.createElement("div");
    topBar.className = "mtx-creator-bar";
    topBar.innerHTML = `
      <div class="mtx-creator-info" title="Lihat Channel ${esc(chNama)}">
        <img src="${resolveAvatarUrl(chFoto, chNama)}" data-fallback-nama="${esc(chNama)}" style="width:36px;height:36px;">
        <div>
          <div style="font-size:13px;font-weight:800;color:#083d63;">${esc(chNama)}</div>
          <div style="font-size:11px;color:#3d6e8c;">${chFollowers.length} Pengikut</div>
        </div>
      </div>
    `;
    topBar.querySelector(".mtx-creator-info").onclick = () => {
      if (post.email) {
        komenTerbuka.clear();
        channelSedangDilihat = post.email.toLowerCase();
        bukaTabKhusus("channel");
      }
    };
    if (bukanMilikSendiri) {
      const btnFollow = document.createElement("button");
      btnFollow.type = "button";
      btnFollow.className = "mtx-btn-follow" + (sudahFollow ? " following" : "");
      btnFollow.style.padding = "5px 13px";
      btnFollow.style.fontSize = "12px";
      btnFollow.textContent = sudahFollow ? "Mengikuti" : "+ Ikuti Channel";
      btnFollow.onclick = async () => {
        catatSinyalAlgoritma(post, 15);
        if (await kirimAksiApi("/api/follow", { targetEmail: post.email })) {
          await segarkanSosial(false);
        }
      };
      topBar.appendChild(btnFollow);
    }
    wadah.appendChild(topBar);

    const likes = Array.isArray(post.likes) ? post.likes : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const sudahLike = likes.includes(myEmail);
    const sudahSave = daftarSaved.includes(post.id);

    const bar = document.createElement("div");
    bar.className = "mtx-social-bar";

    const btnLike = document.createElement("button");
    btnLike.type = "button";
    btnLike.className = "mtx-act-btn" + (sudahLike ? " liked" : "");
    btnLike.textContent = `${sudahLike ? "♥" : "♡"} Suka (${likes.length})`;
    btnLike.onclick = async () => {
      if (!sudahLike) catatSinyalAlgoritma(post, 8);
      if (await kirimAksiApi("/api/like", { id: post.id })) {
        await segarkanSosial(false);
      }
    };
    bar.appendChild(btnLike);

    const btnShare = document.createElement("button");
    btnShare.type = "button";
    btnShare.className = "mtx-act-btn";
    btnShare.textContent = "Bagikan";
    btnShare.onclick = () => bagikanPostingan(post);
    bar.appendChild(btnShare);

    const btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
    btnSave.textContent = sudahSave ? "Tersimpan" : "Simpan Video";
    btnSave.onclick = async () => {
      if (!sudahSave) catatSinyalAlgoritma(post, 10);
      if (await kirimAksiApi("/api/save", { id: post.id })) {
        await segarkanSosial(false);
      }
    };
    bar.appendChild(btnSave);

    const btnBlock = document.createElement("button");
    btnBlock.type = "button";
    btnBlock.className = "mtx-act-btn block-btn";
    btnBlock.textContent = "Blokir Serupa";
    btnBlock.onclick = () => {
      box.classList.add("hidden");
      vid.pause();
      blokirKontenSerupa(post);
    };
    bar.appendChild(btnBlock);

    if (isAdmin()) {
      const btnHapus = document.createElement("button");
      btnHapus.type = "button";
      btnHapus.className = "mtx-btn-hapus-card";
      btnHapus.textContent = "Hapus Video";
      btnHapus.onclick = async () => {
        if (!confirm(`Hapus permanen video dari ${chNama}?`)) return;
        if (await kirimAksiApi("/api/delete", { id: post.id })) {
          box.classList.add("hidden");
          vid.pause();
          if (typeof renderSemuaTab === "function") renderSemuaTab();
        }
      };
      bar.appendChild(btnHapus);
    }
    wadah.appendChild(bar);

    const labelKomen = document.createElement("div");
    labelKomen.style.cssText = "font-size:12px;font-weight:700;color:#083d63;margin-top:10px;";
    labelKomen.textContent = `Komentar (${comments.length})`;
    wadah.appendChild(labelKomen);
    wadah.appendChild(buatDrawerKomentar(post, false));
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#gridVideo")) {
      setTimeout(() => updatePemutarUtamaSocial(true), 80);
    }
  });
  const vidEl = document.getElementById("videoPemutarUtama");
  if (vidEl) {
    vidEl.addEventListener("loadedmetadata", () => updatePemutarUtamaSocial(true));
  }

  setInterval(() => {
    if (!sedangSibukInteraksi()) {
      pasangBarAlgoritmaFeed();
      pasangKontrolSemua(false);
      updatePemutarUtamaSocial(false);
    }
  }, 1500);

  // 8. Halaman Notifikasi
  function renderHalamanNotifikasi() {
    const wadah = document.getElementById("view-notif");
    if (!wadah || !userAktif) return;

    const profilSaya = getProfilSaya();
    const notifs = Array.isArray(profilSaya?.notifications) ? profilSaya.notifications : [];
    const unreadCount = notifs.filter((n) => !n.dibaca).length;

    const labelTipe = {
      follow: "mulai mengikuti channel kamu.",
      like: "menyukai postingan kamu:",
      comment: "mengomentari postingan kamu:",
      reply: "membalas komentar kamu:",
      new_post: "mengunggah konten baru:"
    };

    const listHtml = notifs.length === 0
      ? `<div class="mtx-channel-banner" style="text-align:center;">Belum ada notifikasi. Aktivitas pengikut, suka, komentar, dan balasan akan muncul di sini.</div>`
      : notifs.map((n, idx) => {
          const dariCh = daftarChannelCache.find((c) => c.email === (n.dariEmail || "").toLowerCase());
          const namaPengirim = dariCh ? dariCh.nama : (n.dariNama || "Pengguna");
          const fotoPengirim = dariCh ? dariCh.foto : (n.dariFoto || "");
          const ket = labelTipe[n.tipe] || "berinteraksi dengan kamu:";
          const isiPreview = n.tipe === "follow" ? "" : `<div style="font-size:12px;color:#2b678a;margin-top:2px;">"${esc(n.teks || "")}"</div>`;

          return `
            <div data-notif-idx="${idx}" class="mtx-notif-item ${n.dibaca ? "" : "unread"}">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                <img src="${resolveAvatarUrl(fotoPengirim, namaPengirim)}" data-fallback-nama="${esc(namaPengirim)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;flex-shrink:0;">
                <div style="min-width:0;">
                  <div style="font-size:13px;line-height:1.35;">
                    <strong>${esc(namaPengirim)}</strong> ${ket}
                  </div>
                  ${isiPreview}
                  <div style="font-size:11px;color:#5c7a89;margin-top:3px;">${formatWaktuSingkat(n.waktu)}</div>
                </div>
              </div>
              ${n.dibaca ? "" : `<span class="mtx-notif-dot" title="Belum dibaca"></span>`}
            </div>
          `;
        }).join("");

    wadah.innerHTML = `
      <div class="mtx-channel-banner" style="padding:14px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;">
        <div>
          <h3 style="margin:0;font-size:16px;">Pusat Notifikasi</h3>
          <div style="font-size:12px;color:#3d6e8c;">${unreadCount > 0 ? `${unreadCount} notifikasi baru belum dibaca` : "Semua notifikasi sudah dibaca"}</div>
        </div>
        ${unreadCount > 0 ? `<button type="button" id="mtx-notif-read-all" class="win7-btn win7-btn-primary">Tandai Semua Dibaca</button>` : ""}
      </div>
      <div>${listHtml}</div>
    `;

    const btnReadAll = document.getElementById("mtx-notif-read-all");
    if (btnReadAll) {
      btnReadAll.onclick = async () => {
        if (await kirimAksiApi("/api/notif/read", { all: true })) {
          await muatDataChannel();
        }
      };
    }

    wadah.querySelectorAll("[data-notif-idx]").forEach((el) => {
      el.onclick = async () => {
        const n = notifs[Number(el.getAttribute("data-notif-idx"))];
        if (!n) return;
        if (!n.dibaca && n.id) {
          await kirimAksiApi("/api/notif/read", { id: n.id });
          muatDataChannel();
        }
        if (n.tipe === "follow" && n.dariEmail) {
          channelSedangDilihat = n.dariEmail.toLowerCase();
          bukaTabKhusus("channel");
        } else if (n.postId) {
          bukaModalPost(n.postId);
        }
      };
    });
  }

  // 9. Halaman Pencarian Terpadu
  function renderHalamanCari(hanyaHasil) {
    const wadah = document.getElementById("view-search");
    if (!wadah || !userAktif) return;

    if (!hanyaHasil || !document.getElementById("mtx-search-input")) {
      const kategoriList = [
        { id: "semua",   label: "Semua" },
        { id: "video",   label: "Video" },
        { id: "short",   label: "Shorts" },
        { id: "foto",    label: "Foto" },
        { id: "teks",    label: "Teks" },
        { id: "channel", label: "Channel" }
      ];

      wadah.innerHTML = `
        <div class="mtx-channel-banner" style="padding:14px;">
          <div class="mtx-search-box-wrap">
            <input type="text" id="mtx-search-input" class="mtx-search-input" placeholder="Cari video, shorts, foto, status, atau nama channel..." value="${esc(kataKunciCari)}">
            <button type="button" id="mtx-search-clear" class="win7-btn" style="display:${kataKunciCari ? "inline-block" : "none"};">Reset</button>
          </div>
          <div class="mtx-filter-row">
            <div class="mtx-filter-chips" id="mtx-search-filters">
              ${kategoriList.map((k) => `
                <button type="button" data-filter="${k.id}" class="mtx-chip-btn ${filterCari === k.id ? "active" : ""}">${k.label}</button>
              `).join("")}
            </div>
            <select id="mtx-search-sort" class="mtx-sort-select" title="Urutkan hasil">
              <option value="algoritma" ${urutCari === "algoritma" ? "selected" : ""}>Relevan (Algoritma)</option>
              <option value="terbaru" ${urutCari === "terbaru" ? "selected" : ""}>Terbaru</option>
              <option value="populer" ${urutCari === "populer" ? "selected" : ""}>Terpopuler</option>
            </select>
          </div>
        </div>
        <div id="mtx-search-results"></div>
      `;

      const inp = document.getElementById("mtx-search-input");
      const btnClear = document.getElementById("mtx-search-clear");

      inp.oninput = () => {
        kataKunciCari = inp.value;
        btnClear.style.display = kataKunciCari ? "inline-block" : "none";
        renderHasilCariSaja();
      };

      btnClear.onclick = () => {
        kataKunciCari = "";
        inp.value = "";
        btnClear.style.display = "none";
        inp.focus();
        renderHasilCariSaja();
      };

      document.querySelectorAll("#mtx-search-filters .mtx-chip-btn").forEach((btn) => {
        btn.onclick = () => {
          filterCari = btn.getAttribute("data-filter");
          document.querySelectorAll("#mtx-search-filters .mtx-chip-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          renderHasilCariSaja();
        };
      });

      document.getElementById("mtx-search-sort").onchange = (e) => {
        urutCari = e.target.value;
        renderHasilCariSaja();
      };
    }

    renderHasilCariSaja();
  }

  function renderHasilCariSaja() {
    const hasilBox = document.getElementById("mtx-search-results");
    if (!hasilBox || !userAktif) return;

    const myEmail = userAktif.email.toLowerCase();
    const profilSaya = getProfilSaya();
    const daftarSaved = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];
    const serverUrl = getServerUrl();
    const q = kataKunciCari.trim().toLowerCase();

    const channelCocok = daftarChannelCache.filter((c) => {
      if (!q) return true;
      return (c.nama || "").toLowerCase().includes(q) ||
             (c.email || "").toLowerCase().includes(q) ||
             (c.bio || "").toLowerCase().includes(q);
    });

    let postCocok = daftarPostCache.filter((p) => {
      if (cekPostDiblokir(p, profilSaya)) return false;

      const tipe = (p.tipe || "feed").toLowerCase();
      const media = (p.jenisMedia || "none").toLowerCase();

      if (filterCari === "video" && tipe !== "video") return false;
      if (filterCari === "short" && tipe !== "short") return false;
      if (filterCari === "foto" && media !== "image") return false;
      if (filterCari === "teks" && (media !== "none" || tipe === "video" || tipe === "short")) return false;
      if (filterCari === "channel") return false;

      if (!q) return true;

      const chData = daftarChannelCache.find((c) => c.email === (p.email || "").toLowerCase());
      const chNama = chData ? chData.nama : (p.channelNama || p.penulis || "");
      const teksKomen = Array.isArray(p.comments)
        ? p.comments.map((c) => `${c.nama || ""} ${c.teks || ""}`).join(" ")
        : "";

      const gabungan = `${p.teks || ""} ${chNama} ${p.penulis || ""} ${p.email || ""} ${tipe} ${teksKomen}`.toLowerCase();
      return gabungan.includes(q);
    });

    if (urutCari === "populer") {
      postCocok = [...postCocok].sort((a, b) => {
        const skorA = (a.likes?.length || 0) * 2 + (a.comments?.length || 0);
        const skorB = (b.likes?.length || 0) * 2 + (b.comments?.length || 0);
        return skorB - skorA;
      });
    } else if (urutCari === "terbaru") {
      postCocok = [...postCocok].sort((a, b) => (b.dibuatPada || 0) - (a.dibuatPada || 0));
    } else {
      postCocok = [...postCocok].sort((a, b) => hitungSkorAlgoritma(b) - hitungSkorAlgoritma(a));
    }

    hasilBox.innerHTML = "";

    const infoBar = document.createElement("div");
    infoBar.style.cssText = "font-size:12px;font-weight:700;color:#ffffff;text-shadow:0 1px 3px rgba(0,40,80,0.45);margin-bottom:10px;padding:0 4px;";
    if (!q) {
      infoBar.textContent = filterCari === "channel"
        ? `Semua Channel Aktif (${channelCocok.length})`
        : `Jelajah Rekomendasi (${postCocok.length} tersedia)`;
    } else {
      const total = filterCari === "channel" ? channelCocok.length : postCocok.length + (filterCari === "semua" ? channelCocok.length : 0);
      infoBar.textContent = `Ditemukan ${total} hasil untuk "${kataKunciCari.trim()}"`;
    }
    hasilBox.appendChild(infoBar);

    if ((filterCari === "semua" || filterCari === "channel") && channelCocok.length > 0) {
      const listChTampil = filterCari === "channel" ? channelCocok : channelCocok.slice(0, 6);
      const gridCh = document.createElement("div");
      gridCh.className = "mtx-ch-grid";

      listChTampil.forEach((ch) => {
        const followers = Array.isArray(ch.followers) ? ch.followers : [];
        const sudahFollow = followers.includes(myEmail);
        const bukanSaya = ch.email !== myEmail;

        const card = document.createElement("div");
        card.className = "mtx-ch-mini-card";
        card.innerHTML = `
          <div class="mtx-creator-info" style="flex:1;">
            <img src="${resolveAvatarUrl(ch.foto, ch.nama)}" data-fallback-nama="${esc(ch.nama)}" style="width:40px;height:40px;">
            <div style="overflow:hidden;">
              <div style="font-size:13px;font-weight:800;color:#083d63;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightTeks(ch.nama, kataKunciCari)}</div>
              <div style="font-size:11px;color:#3d6e8c;">${followers.length} Pengikut</div>
              <div style="font-size:11px;color:#4f7994;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightTeks(ch.bio || "", kataKunciCari)}</div>
            </div>
          </div>
        `;
        card.querySelector(".mtx-creator-info").onclick = () => {
          komenTerbuka.clear();
          channelSedangDilihat = ch.email;
          bukaTabKhusus("channel");
        };

        if (bukanSaya) {
          const btnF = document.createElement("button");
          btnF.type = "button";
          btnF.className = "mtx-btn-follow" + (sudahFollow ? " following" : "");
          btnF.textContent = sudahFollow ? "Mengikuti" : "+ Ikuti";
          btnF.onclick = async () => {
            if (await kirimAksiApi("/api/follow", { targetEmail: ch.email })) {
              await segarkanSosial(false);
            }
          };
          card.appendChild(btnF);
        }
        gridCh.appendChild(card);
      });
      hasilBox.appendChild(gridCh);
    }

    if (filterCari === "channel") {
      if (channelCocok.length === 0) {
        hasilBox.innerHTML += `<div class="mtx-channel-banner" style="text-align:center;">Tidak ada channel yang cocok dengan "${esc(kataKunciCari)}".</div>`;
      }
      return;
    }

    if (postCocok.length === 0) {
      const kosong = document.createElement("div");
      kosong.className = "mtx-channel-banner";
      kosong.style.textAlign = "center";
      kosong.textContent = q
        ? `Tidak ditemukan postingan untuk kata kunci "${kataKunciCari.trim()}".`
        : "Belum ada konten pada kategori ini.";
      hasilBox.appendChild(kosong);
      return;
    }

    postCocok.forEach((p) => {
      const chData = daftarChannelCache.find((c) => c.email === (p.email || "").toLowerCase());
      const chNama = chData ? chData.nama : (p.channelNama || p.penulis);
      const chFoto = chData ? chData.foto : (p.channelFoto || "");
      const chFollowers = chData && Array.isArray(chData.followers) ? chData.followers : [];
      const sudahFollow = chFollowers.includes(myEmail);
      const bukanMilikSendiri = p.email && p.email.toLowerCase() !== myEmail;

      const likes = Array.isArray(p.likes) ? p.likes : [];
      const comments = Array.isArray(p.comments) ? p.comments : [];
      const sudahLike = likes.includes(myEmail);
      const sudahSave = daftarSaved.includes(p.id);

      const tipeLabel = p.tipe === "video"
        ? "VIDEO"
        : (p.tipe === "short" ? "SHORTS" : (p.jenisMedia === "image" ? "FOTO" : "TEKS"));

      const card = document.createElement("div");
      card.className = "mtx-channel-banner";
      card.style.padding = "14px";

      const topBar = document.createElement("div");
      topBar.className = "mtx-creator-bar";
      topBar.innerHTML = `
        <div class="mtx-creator-info">
          <img src="${resolveAvatarUrl(chFoto, chNama)}" data-fallback-nama="${esc(chNama)}">
          <div>
            <div style="font-size:12.5px;font-weight:700;color:#083d63;">${highlightTeks(chNama, kataKunciCari)}</div>
            <div style="font-size:11px;color:#3d6e8c;">${chFollowers.length} Pengikut • ${formatWaktuSingkat(p.dibuatPada)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="mtx-badge-tipe">${tipeLabel}</span>
        </div>
      `;
      topBar.querySelector(".mtx-creator-info").onclick = () => {
        if (p.email) {
          komenTerbuka.clear();
          channelSedangDilihat = p.email.toLowerCase();
          bukaTabKhusus("channel");
        }
      };
      if (bukanMilikSendiri) {
        const btnF = document.createElement("button");
        btnF.type = "button";
        btnF.className = "mtx-btn-follow" + (sudahFollow ? " following" : "");
        btnF.textContent = sudahFollow ? "Mengikuti" : "+ Ikuti";
        btnF.onclick = async () => {
          if (await kirimAksiApi("/api/follow", { targetEmail: p.email })) {
            await segarkanSosial(false);
          }
        };
        topBar.lastElementChild.appendChild(btnF);
      }
      card.appendChild(topBar);

      if (p.teks) {
        const captionEl = document.createElement("div");
        captionEl.style.cssText = "font-size:13.5px;line-height:1.45;margin:6px 0;color:#093b5c;";
        captionEl.innerHTML = highlightTeks(p.teks, kataKunciCari);
        card.appendChild(captionEl);
      }

      const mediaUrl = p.file && serverUrl ? `${serverUrl}/media/${encodeURIComponent(p.file)}` : "";
      if (p.jenisMedia === "video" && mediaUrl) {
        const vid = document.createElement("video");
        vid.src = mediaUrl;
        vid.controls = true;
        vid.preload = "metadata";
        vid.style.cssText = "width:100%;max-height:300px;border-radius:12px;background:#000;margin-top:6px;";
        card.appendChild(vid);
      } else if (p.jenisMedia === "image" && mediaUrl) {
        const img = document.createElement("img");
        img.src = mediaUrl;
        img.style.cssText = "width:100%;max-height:340px;object-fit:contain;border-radius:12px;margin-top:6px;background:rgba(255,255,255,0.5);";
        card.appendChild(img);
      }

      const bar = document.createElement("div");
      bar.className = "mtx-social-bar";

      const btnLike = document.createElement("button");
      btnLike.type = "button";
      btnLike.className = "mtx-act-btn" + (sudahLike ? " liked" : "");
      btnLike.textContent = `${sudahLike ? "♥" : "♡"} Suka (${likes.length})`;
      btnLike.onclick = async () => {
        if (!sudahLike) catatSinyalAlgoritma(p, 8);
        if (await kirimAksiApi("/api/like", { id: p.id })) {
          await segarkanSosial(false);
        }
      };
      bar.appendChild(btnLike);

      const btnKomen = document.createElement("button");
      btnKomen.type = "button";
      btnKomen.className = "mtx-act-btn";
      btnKomen.textContent = `Komentar (${comments.length})`;
      btnKomen.onclick = () => {
        if (komenTerbuka.has(p.id)) {
          komenTerbuka.delete(p.id);
        } else {
          komenTerbuka.add(p.id);
        }
        renderHasilCariSaja();
      };
      bar.appendChild(btnKomen);

      const btnShare = document.createElement("button");
      btnShare.type = "button";
      btnShare.className = "mtx-act-btn";
      btnShare.textContent = "Bagikan";
      btnShare.onclick = () => bagikanPostingan(p);
      bar.appendChild(btnShare);

      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
      btnSave.textContent = sudahSave ? "Tersimpan" : "Simpan";
      btnSave.onclick = async () => {
        if (await kirimAksiApi("/api/save", { id: p.id })) {
          await segarkanSosial(false);
        }
      };
      bar.appendChild(btnSave);

      const btnBlock = document.createElement("button");
      btnBlock.type = "button";
      btnBlock.className = "mtx-act-btn block-btn";
      btnBlock.textContent = "Blokir Serupa";
      btnBlock.onclick = () => blokirKontenSerupa(p);
      bar.appendChild(btnBlock);

      if (p.tipe === "video" && mediaUrl) {
        const btnBukaVid = document.createElement("button");
        btnBukaVid.type = "button";
        btnBukaVid.className = "mtx-act-btn";
        btnBukaVid.textContent = "Pemutar Utama";
        btnBukaVid.onclick = () => {
          document.getElementById("tab-video")?.click();
          setTimeout(() => {
            const box = document.getElementById("boxPemutarUtama");
            const vidMain = document.getElementById("videoPemutarUtama");
            const jdl = document.getElementById("judulPemutarUtama");
            const inf = document.getElementById("infoPemutarUtama");
            if (box && vidMain) {
              box.classList.remove("hidden");
              vidMain.src = mediaUrl;
              if (jdl) jdl.textContent = p.teks || "Video";
              if (inf) inf.textContent = `Diunggah oleh ${chNama}`;
              vidMain.play().catch(() => {});
              updatePemutarUtamaSocial(true);
              box.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 90);
        };
        bar.appendChild(btnBukaVid);
      }

      if (isAdmin()) {
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "mtx-btn-hapus-card";
        btnDel.textContent = "Hapus";
        btnDel.onclick = async () => {
          if (!confirm(`Hapus permanen postingan dari ${chNama}?`)) return;
          if (await kirimAksiApi("/api/delete", { id: p.id })) {
            await segarkanSosial(true);
          }
        };
        bar.appendChild(btnDel);
      }

      card.appendChild(bar);

      if (komenTerbuka.has(p.id)) {
        card.appendChild(buatDrawerKomentar(p, false));
      }

      hasilBox.appendChild(card);
    });
  }

  // 10. Halaman Channel & Edit Profil
  function renderHalamanChannel(targetEmail) {
    const wadah = document.getElementById("view-channel");
    if (!wadah || !userAktif) return;

    const myEmail = userAktif.email.toLowerCase();
    const emailCh = (targetEmail || myEmail).toLowerCase();
    const adalahMilikku = emailCh === myEmail;

    const ch = daftarChannelCache.find((c) => c.email === emailCh) || {
      email: emailCh,
      nama: emailCh.split("@")[0],
      bio: "Kreator di MiniTube X",
      foto: "",
      followers: []
    };

    const followers = Array.isArray(ch.followers) ? ch.followers : [];
    const followingCount = daftarChannelCache.filter((u) => Array.isArray(u.followers) && u.followers.includes(emailCh)).length;
    const postinganCh = daftarPostCache.filter((p) => (p.email || "").toLowerCase() === emailCh);
    const totalSuka = postinganCh.reduce((acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : 0), 0);
    const sudahFollow = followers.includes(myEmail);
    const serverUrl = getServerUrl();

    const tombolAksiHeader = adalahMilikku
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">
           <button type="button" id="mtx-btn-edit-profil" class="win7-btn win7-btn-primary">Edit Channel</button>
           <button type="button" id="mtx-ch-open-blokir" class="win7-btn">Konten Diblokir</button>
         </div>`
      : `<button type="button" id="mtx-btn-follow-ch" class="mtx-btn-follow ${sudahFollow ? "following" : ""}" style="padding:6px 14px;font-size:12.5px;">${sudahFollow ? "Mengikuti" : "+ Ikuti Channel"}</button>`;

    const kartuPostHtml = postinganCh.length === 0
      ? `<div class="mtx-channel-banner" style="text-align:center;">Belum ada postingan di channel ini.</div>`
      : postinganCh.map((p) => {
          const mediaUrl = p.file && serverUrl ? `${serverUrl}/media/${encodeURIComponent(p.file)}` : "";
          const mediaTag = p.jenisMedia === "video" && mediaUrl
            ? `<video src="${mediaUrl}" controls style="width:100%;max-height:280px;border-radius:12px;background:#000;margin-top:8px;"></video>`
            : (p.jenisMedia === "image" && mediaUrl
              ? `<img src="${mediaUrl}" style="width:100%;max-height:320px;object-fit:contain;border-radius:12px;margin-top:8px;">`
              : "");
          return `
            <div class="mtx-channel-banner" style="padding:14px;">
              <div style="font-size:11.5px;color:#0077b6;font-weight:700;">[${(p.tipe || "feed").toUpperCase()}] • ${(p.likes || []).length} Suka • ${(p.comments || []).length} Komentar</div>
              <div style="font-size:13.5px;margin-top:4px;">${esc(p.teks || "(Tanpa caption)")}</div>
              ${mediaTag}
            </div>
          `;
        }).join("");

    wadah.innerHTML = `
      <div class="mtx-channel-banner">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${resolveAvatarUrl(ch.foto, ch.nama)}" data-fallback-nama="${esc(ch.nama)}" style="width:68px;height:68px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,65,115,0.25);">
            <div>
              <h2 style="margin:0;font-size:18px;">${esc(ch.nama)}</h2>
              <div style="font-size:12px;color:#2b678a;">${esc(ch.email)}</div>
              <p style="margin:5px 0 0;font-size:12.5px;color:#0b3c5d;">${esc(ch.bio || "Belum ada bio channel.")}</p>
            </div>
          </div>
          <div>${tombolAksiHeader}</div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">
          <span class="mtx-stat-chip">${followers.length} Pengikut</span>
          <span class="mtx-stat-chip">${followingCount} Mengikuti</span>
          <span class="mtx-stat-chip">${postinganCh.length} Postingan</span>
          <span class="mtx-stat-chip">${totalSuka} Suka</span>
        </div>

        <div id="mtx-form-edit-profil" style="display:none;margin-top:14px;padding-top:14px;border-top:1px solid #90e0ef;">
          <h4 style="margin:0 0 8px;">Edit Profil Channel</h4>
          <input type="text" id="mtx-edit-nama" class="mtx-auth-input" maxlength="32" value="${esc(ch.nama)}" placeholder="Nama Channel">
          <input type="text" id="mtx-edit-bio" class="mtx-auth-input" maxlength="140" value="${esc(ch.bio || "")}" placeholder="Bio singkat channel kamu">
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Ganti Foto Profil (Otomatis dikompres ringan):</label>
          <input type="file" id="mtx-edit-foto" accept="image/*" style="margin-bottom:10px;font-size:12.5px;">
          <div style="display:flex;gap:8px;">
            <button type="button" id="mtx-simpan-profil" class="win7-btn win7-btn-primary">Simpan Perubahan</button>
            <button type="button" id="mtx-batal-profil" class="win7-btn">Batal</button>
          </div>
        </div>
      </div>
      ${kartuPostHtml}
    `;

    if (adalahMilikku) {
      document.getElementById("mtx-btn-edit-profil").onclick = () => {
        document.getElementById("mtx-form-edit-profil").style.display = "block";
      };
      document.getElementById("mtx-batal-profil").onclick = () => {
        document.getElementById("mtx-form-edit-profil").style.display = "none";
      };
      document.getElementById("mtx-simpan-profil").onclick = simpanEditProfil;
      document.getElementById("mtx-ch-open-blokir").onclick = bukaModalBlokir;
    } else {
      document.getElementById("mtx-btn-follow-ch").onclick = async () => {
        if (await kirimAksiApi("/api/follow", { targetEmail: emailCh })) {
          await segarkanSosial(false);
        }
      };
    }
  }

  function kompresAvatar200px(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext("2d");
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 200, 200);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
      };
      img.src = url;
    });
  }

  async function simpanEditProfil() {
    const serverUrl = getServerUrl();
    if (!serverUrl || !userAktif) return;

    const nama = document.getElementById("mtx-edit-nama").value.trim();
    const bio  = document.getElementById("mtx-edit-bio").value.trim();
    const fileFoto = document.getElementById("mtx-edit-foto").files[0];

    const btn = document.getElementById("mtx-simpan-profil");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";

    try {
      const token = await userAktif.getIdToken();
      const metaJson = JSON.stringify({ nama, bio });
      const metaB64  = btoa(unescape(encodeURIComponent(metaJson)));

      const headers = {
        "Authorization": "Bearer " + token,
        "X-Meta": metaB64
      };

      let bodyBlob = null;
      if (fileFoto) {
        bodyBlob = await kompresAvatar200px(fileFoto);
        headers["X-Filename"] = btoa(unescape(encodeURIComponent("avatar.jpg")));
        headers["Content-Type"] = "image/jpeg";
      }

      const res = await nativeFetch(`${serverUrl}/api/profile`, {
        method: "POST",
        headers,
        body: bodyBlob
      });

      if (!res.ok) {
        alert("Gagal menyimpan profil: " + (await res.text()));
      } else {
        await segarkanSosial(false);
      }
    } catch (e) {
      alert("Error koneksi: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan Perubahan";
    }
  }

  // 11. Halaman Postingan Disimpan
  function renderHalamanDisimpan() {
    const wadah = document.getElementById("view-saved");
    if (!wadah || !userAktif) return;

    const profilSaya = getProfilSaya();
    const savedIds = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];
    const daftarTersimpan = daftarPostCache.filter((p) => savedIds.includes(p.id));
    const serverUrl = getServerUrl();

    if (daftarTersimpan.length === 0) {
      wadah.innerHTML = `<div class="mtx-channel-banner" style="text-align:center;">Belum ada postingan yang kamu simpan. Klik tombol <strong>Simpan</strong> pada postingan mana saja.</div>`;
      return;
    }

    wadah.innerHTML = daftarTersimpan.map((p) => {
      const mediaUrl = p.file && serverUrl ? `${serverUrl}/media/${encodeURIComponent(p.file)}` : "";
      const mediaTag = p.jenisMedia === "video" && mediaUrl
        ? `<video src="${mediaUrl}" controls style="width:100%;max-height:300px;border-radius:12px;background:#000;margin-top:8px;"></video>`
        : (p.jenisMedia === "image" && mediaUrl
          ? `<img src="${mediaUrl}" style="width:100%;max-height:340px;object-fit:contain;border-radius:12px;margin-top:8px;">`
          : "");
      return `
        <div class="mtx-channel-banner" style="padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <strong style="font-size:13px;color:#083d63;">${esc(p.channelNama || p.penulis)}</strong>
            <button type="button" data-unsave-id="${p.id}" class="mtx-act-btn saved">Hapus Simpanan</button>
          </div>
          <div style="font-size:13.5px;margin-top:6px;">${esc(p.teks || "(Tanpa caption)")}</div>
          ${mediaTag}
        </div>
      `;
    }).join("");

    wadah.querySelectorAll("[data-unsave-id]").forEach((btn) => {
      btn.onclick = async () => {
        if (await kirimAksiApi("/api/save", { id: btn.getAttribute("data-unsave-id") })) {
          await segarkanSosial(false);
        }
      };
    });
  }
})();