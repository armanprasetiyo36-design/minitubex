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

  function getServerUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("server") || "";
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function decodeSafe(str) {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      return str;
    }
  }

  function normText(str) {
    return String(str || "").replace(/\s+/g, " ").trim();
  }

  function resolveAvatarUrl(foto, nama) {
    const serverUrl = getServerUrl();
    if (foto) {
      if (foto.startsWith("http://") || foto.startsWith("https://")) return foto;
      if (serverUrl) return `${serverUrl}/media/${encodeURIComponent(foto)}`;
    }
    const inisial = encodeURIComponent((nama || "U").slice(0, 2).toUpperCase());
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%2338b6ff"/><stop offset="100%" stop-color="%230077b6"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(%23g)"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold" font-size="30">${inisial}</text></svg>`;
  }

  // 1. CSS Frutiger Aero untuk Auth, Feed, Pemutar Video Utama, & Shorts Dock
  const style = document.createElement("style");
  style.textContent = `
    #mtx-auth-gate {
      position: fixed; inset: 0; z-index: 10000;
      background: linear-gradient(135deg, rgba(12, 65, 110, 0.88), rgba(20, 125, 165, 0.85));
      backdrop-filter: blur(14px);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .mtx-auth-card {
      width: 100%; max-width: 420px;
      background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(218,242,255,0.94) 100%);
      border: 1.5px solid #ffffff; border-radius: 20px; padding: 22px 24px;
      box-shadow: 0 14px 36px rgba(0, 35, 70, 0.45);
      color: #0b3c5d; text-align: center;
    }
    .mtx-auth-input {
      width: 100%; box-sizing: border-box; padding: 10px 12px; margin-bottom: 10px;
      border-radius: 11px; border: 1px solid #8ecae6;
      background: rgba(255,255,255,0.92); font-size: 13.5px; outline: none;
    }
    .mtx-btn-google {
      width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #b5e2fa;
      background: linear-gradient(180deg, #ffffff 0%, #e6f5ff 100%);
      color: #083d63; font-weight: 700; font-size: 14px; cursor: pointer;
      box-shadow: 0 3px 10px rgba(0, 75, 130, 0.15); margin-bottom: 12px;
    }
    .mtx-btn-email {
      width: 100%; padding: 10px; border-radius: 12px; border: none;
      background: linear-gradient(180deg, #38b6ff 0%, #0077b6 100%);
      color: #fff; font-weight: 700; font-size: 13.5px; cursor: pointer;
    }
    .mtx-user-pill {
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,0.82); border: 1px solid #ffffff;
      border-radius: 22px; padding: 4px 12px 4px 5px;
      font-size: 12px; font-weight: 700; color: #093b5c; cursor: pointer;
    }
    .mtx-user-pill img {
      width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1px solid #fff;
    }
    .mtx-admin-tag {
      background: linear-gradient(180deg, #ffd166, #f77f00);
      color: #fff; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 800;
    }
    .mtx-creator-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.95);
      border-radius: 12px; padding: 6px 10px; margin-bottom: 8px;
    }
    .mtx-creator-info {
      display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left;
    }
    .mtx-creator-info img {
      width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid #fff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    }
    .mtx-btn-follow {
      background: linear-gradient(180deg, #48cae4 0%, #0077b6 100%);
      color: #fff; border: 1px solid #fff; border-radius: 14px;
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
      background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(225,245,255,0.88) 100%);
      border: 1px solid #b5e2fa; border-radius: 11px; padding: 5px 10px;
      font-size: 12px; font-weight: 700; color: #0a466b; cursor: pointer;
    }
    .mtx-act-btn.liked {
      background: linear-gradient(180deg, #ff8fa3 0%, #e63946 100%);
      color: #fff; border-color: #fff;
    }
    .mtx-act-btn.saved {
      background: linear-gradient(180deg, #ffd166 0%, #f4a261 100%);
      color: #fff; border-color: #fff;
    }
    .mtx-btn-hapus-card {
      background: linear-gradient(180deg, #ff6b6b, #c9184a);
      color: #fff; border: 1px solid #fff; border-radius: 11px;
      padding: 5px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer;
    }
    .mtx-comment-box {
      margin-top: 8px; background: rgba(255,255,255,0.82);
      border: 1px solid #bce3fa; border-radius: 12px; padding: 8px 10px; text-align: left;
    }
    .mtx-comment-item {
      display: flex; gap: 7px; align-items: flex-start;
      padding: 5px 0; border-bottom: 1px solid rgba(142,202,230,0.4); font-size: 12px;
    }
    .mtx-comment-item:last-child { border-bottom: none; }
    .mtx-comment-item img {
      width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-top: 2px;
    }
    .mtx-channel-banner {
      background: linear-gradient(135deg, rgba(240,250,255,0.92), rgba(205,238,255,0.88));
      border: 1.5px solid #ffffff; border-radius: 18px; padding: 18px;
      box-shadow: 0 8px 24px rgba(0, 65, 115, 0.18); margin-bottom: 16px; color: #093b5c;
    }
    .mtx-stat-chip {
      background: rgba(255,255,255,0.85); border: 1px solid #90e0ef;
      border-radius: 12px; padding: 6px 12px; font-size: 12px; font-weight: 700;
    }

    /* Floating Dock khusus tampilan Shorts agar video tidak terjepit */
    .mtx-shorts-dock {
      position: absolute;
      right: 12px;
      bottom: 76px;
      z-index: 25;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    }
    .mtx-short-avatar-wrap {
      position: relative;
      cursor: pointer;
      margin-bottom: 4px;
    }
    .mtx-short-avatar-wrap img {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #ffffff;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45);
    }
    .mtx-short-follow-badge {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(180deg, #38b6ff, #0077b6);
      color: #fff;
      border: 1.5px solid #fff;
      border-radius: 10px;
      padding: 0 6px;
      font-size: 10.5px;
      font-weight: 800;
      cursor: pointer;
      line-height: 15px;
    }
    .mtx-short-follow-badge.following {
      background: #2ec4b6;
    }
    .mtx-short-pill-btn {
      width: 44px;
      min-height: 44px;
      border-radius: 16px;
      border: 1.5px solid rgba(255, 255, 255, 0.9);
      background: linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(195,235,255,0.75) 100%);
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 30, 60, 0.35);
      color: #073759;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4px 2px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 800;
      line-height: 1.1;
    }
    .mtx-short-pill-btn span {
      font-size: 10.5px;
      margin-top: 2px;
    }
    .mtx-short-pill-btn.liked {
      background: linear-gradient(180deg, #ff8fa3, #e63946);
      color: #fff;
    }
    .mtx-short-pill-btn.saved {
      background: linear-gradient(180deg, #ffd166, #f4a261);
      color: #fff;
    }
    .mtx-short-pill-btn.del {
      background: linear-gradient(180deg, #ff6b6b, #c9184a);
      color: #fff;
    }
    .mtx-shorts-drawer {
      position: absolute;
      left: 10px;
      right: 64px;
      bottom: 14px;
      z-index: 30;
      background: linear-gradient(180deg, rgba(245,252,255,0.96), rgba(215,240,255,0.95));
      border: 1.5px solid #ffffff;
      border-radius: 16px;
      padding: 10px;
      box-shadow: 0 10px 26px rgba(0, 25, 55, 0.45);
      color: #093b5c;
      text-align: left;
    }
  `;
  document.head.appendChild(style);

  // 2. Layar Login Wajib
  const gate = document.createElement("div");
  gate.id = "mtx-auth-gate";
  gate.innerHTML = `
    <div class="mtx-auth-card">
      <h2 style="margin:0 0 4px; font-size:21px;">MiniTube X</h2>
      <p style="margin:0 0 14px; font-size:12.5px; color:#1d5b79;">
        Masuk dengan Google atau Email untuk membuat Channel & berinteraksi.
      </p>

      <div id="mtx-form-login">
        <button type="button" id="mtx-login-google" class="mtx-btn-google">
          Masuk Cepat dengan Google
        </button>

        <div style="font-size:11.5px; color:#4a7c9b; margin:8px 0;">— atau pakai email apapun —</div>

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
      saved: []
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

  // 3. Tambahkan Tab "Disimpan" dan "Channel Saya"
  function pasangTabSosial() {
    const navTabs = document.querySelector(".aero-tabs");
    const mainEl  = document.querySelector(".main-container");
    if (!navTabs || !mainEl) return;

    if (!document.getElementById("tab-saved")) {
      const btnSaved = document.createElement("button");
      btnSaved.className = "tab-btn";
      btnSaved.id = "tab-saved";
      btnSaved.textContent = "🔖 Disimpan";
      btnSaved.onclick = () => bukaTabKhusus("saved");
      navTabs.appendChild(btnSaved);
    }

    if (!document.getElementById("tab-channel")) {
      const btnCh = document.createElement("button");
      btnCh.className = "tab-btn";
      btnCh.id = "tab-channel";
      btnCh.textContent = "👤 Channel Saya";
      btnCh.onclick = () => {
        channelSedangDilihat = userAktif ? userAktif.email.toLowerCase() : null;
        bukaTabKhusus("channel");
      };
      navTabs.appendChild(btnCh);
    }

    if (!document.getElementById("view-saved")) {
      const secSaved = document.createElement("section");
      secSaved.id = "view-saved";
      secSaved.className = "feed-container hidden";
      mainEl.appendChild(secSaved);
    }

    if (!document.getElementById("view-channel")) {
      const secCh = document.createElement("section");
      secCh.id = "view-channel";
      secCh.className = "hidden";
      mainEl.appendChild(secCh);
    }
  }
  pasangTabSosial();

  function bukaTabKhusus(namaTab) {
    ["view-feed", "view-video", "view-short", "view-saved", "view-channel"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));

    if (namaTab === "saved") {
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
      document.getElementById("view-saved")?.classList.add("hidden");
      document.getElementById("view-channel")?.classList.add("hidden");
      document.getElementById("tab-saved")?.classList.remove("active");
      document.getElementById("tab-channel")?.classList.remove("active");
      setTimeout(() => {
        pasangKontrolSemua(true);
        updatePemutarUtamaSocial(true);
      }, 80);
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
    pill.innerHTML = `<img src="${resolveAvatarUrl(p.foto, p.nama)}"> <span>${esc(p.nama)}</span> ${isAdmin() ? '<span class="mtx-admin-tag">ADMIN</span>' : ""}`;
    pill.onclick = () => {
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
          if (!document.getElementById("view-channel")?.classList.contains("hidden")) {
            renderHalamanChannel(channelSedangDilihat || userAktif.email.toLowerCase());
          }
          if (!document.getElementById("view-saved")?.classList.contains("hidden")) {
            renderHalamanDisimpan();
          }
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

  // 5. Interceptor Fetch
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
      response.clone().json().then((data) => {
        if (Array.isArray(data)) {
          daftarPostCache = data;
          setTimeout(() => {
            pasangKontrolSemua(true);
            updatePemutarUtamaSocial(true);
          }, 120);
        }
      }).catch(() => {});
    }

    return response;
  };

  // 6. Aksi Sosial API
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

  async function segarkanSosial() {
    const serverUrl = getServerUrl();
    if (!serverUrl) return;
    await muatDataChannel();
    try {
      const res = await nativeFetch(`${serverUrl}/api/posts?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        daftarPostCache = await res.json();
        pasangKontrolSemua(true);
        updatePemutarUtamaSocial(true);
        if (!document.getElementById("view-saved")?.classList.contains("hidden")) renderHalamanDisimpan();
        if (!document.getElementById("view-channel")?.classList.contains("hidden")) {
          renderHalamanChannel(channelSedangDilihat || userAktif.email.toLowerCase());
        }
      }
    } catch (e) {}
  }

  // Pencocok kartu DOM dengan data post (mendukung HTML encoded & semua tag container)
  function cariPostUntukElemen(el, filterTipe) {
    if (!el || !daftarPostCache.length) return null;
    const rawHtml = el.innerHTML || "";
    const decHtml = decodeSafe(rawHtml);
    const txtNorm = normText(el.textContent || "");

    const kandidatList = filterTipe
      ? daftarPostCache.filter((p) => (p.tipe || "feed") === filterTipe)
      : daftarPostCache;

    // 1. Cocokkan berdasarkan nama file media
    let ketemu = kandidatList.find((p) => p.file && (rawHtml.includes(p.file) || decHtml.includes(p.file)));
    if (ketemu) return ketemu;

    // 2. Cocokkan berdasarkan penulis + caption (untuk postingan teks tanpa file)
    ketemu = kandidatList.find((p) => {
      const penulisNorm = normText(p.penulis);
      const teksNorm = normText(p.teks);
      if (penulisNorm && teksNorm) {
        return txtNorm.includes(penulisNorm) && txtNorm.includes(teksNorm.slice(0, 30));
      }
      if (teksNorm && teksNorm.length >= 4) {
        return txtNorm.includes(teksNorm);
      }
      return false;
    });
    return ketemu || null;
  }

  function buatDrawerKomentar(post, isShortsOverlay) {
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const box = document.createElement("div");
    box.className = isShortsOverlay ? "mtx-shorts-drawer" : "mtx-comment-box";
    box.onclick = (e) => e.stopPropagation();

    const headerHtml = isShortsOverlay
      ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:12px;font-weight:700;">
           <span>💬 Komentar (${comments.length})</span>
           <button type="button" class="mtx-close-short-komen" style="border:none;background:rgba(255,255,255,0.85);border-radius:50%;width:22px;height:22px;cursor:pointer;font-weight:bold;">✕</button>
         </div>`
      : "";

    const listKomenHtml = comments.length === 0
      ? `<div style="font-size:11.5px;color:#5c7a89;margin-bottom:6px;">Belum ada komentar. Jadilah yang pertama!</div>`
      : comments.map((c) => {
          const cProf = daftarChannelCache.find((u) => u.email === (c.email || "").toLowerCase());
          const cNama = cProf ? cProf.nama : c.nama;
          const cFoto = cProf ? cProf.foto : c.foto;
          return `
            <div class="mtx-comment-item">
              <img src="${resolveAvatarUrl(cFoto, cNama)}">
              <div>
                <strong style="color:#083d63;">${esc(cNama)}</strong><br>
                <span style="color:#1b3b4d;">${esc(c.teks)}</span>
              </div>
            </div>
          `;
        }).join("");

    box.innerHTML = `
      ${headerHtml}
      <div style="max-height:145px;overflow-y:auto;margin-bottom:6px;">${listKomenHtml}</div>
      <div style="display:flex;gap:6px;">
        <input type="text" class="aero-input mtx-input-komen" placeholder="Tulis komentar..." maxlength="280" style="margin:0;padding:6px 10px;font-size:12px;">
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

    const kirimHandler = async () => {
      const isi = inp.value.trim();
      if (!isi) return;
      drafKomen[post.id] = "";
      if (await kirimAksiApi("/api/comment", { id: post.id, teks: isi })) {
        await segarkanSosial();
      }
    };

    box.querySelector(".mtx-send-komen").onclick = kirimHandler;
    inp.onkeydown = (ev) => {
      if (ev.key === "Enter") kirimHandler();
    };

    return box;
  }

  // 7A. Pasang kontrol standar pada Feed & Grid Video
  function pasangKartuStandar(containerId, filterTipe, paksaUpdate) {
    const container = document.getElementById(containerId);
    if (!container || !userAktif || !daftarPostCache.length) return;

    const myEmail = userAktif.email.toLowerCase();
    const profilSaya = getProfilSaya();
    const daftarSaved = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];

    Array.from(container.children).forEach((kartu) => {
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
          <img src="${resolveAvatarUrl(chFoto, chNama)}">
          <div>
            <div style="font-size:12.5px;font-weight:700;color:#083d63;">${esc(chNama)}</div>
            <div style="font-size:11px;color:#3d6e8c;">${chFollowers.length} Pengikut</div>
          </div>
        </div>
      `;
      topBar.querySelector(".mtx-creator-info").onclick = (e) => {
        e.stopPropagation();
        if (post.email) {
          channelSedangDilihat = post.email.toLowerCase();
          bukaTabKhusus("channel");
        }
      };

      if (bukanMilikSendiri) {
        const btnFollow = document.createElement("button");
        btnFollow.type = "button";
        btnFollow.className = "mtx-btn-follow" + (sudahFollow ? " following" : "");
        btnFollow.textContent = sudahFollow ? "✓ Mengikuti" : "+ Ikuti";
        btnFollow.onclick = async (e) => {
          e.stopPropagation();
          if (await kirimAksiApi("/api/follow", { targetEmail: post.email })) {
            await segarkanSosial();
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
      btnLike.textContent = `${sudahLike ? "❤️" : "🤍"} Suka (${likes.length})`;
      btnLike.onclick = async (e) => {
        e.stopPropagation();
        if (await kirimAksiApi("/api/like", { id: post.id })) {
          await segarkanSosial();
        }
      };
      bar.appendChild(btnLike);

      const btnKomen = document.createElement("button");
      btnKomen.type = "button";
      btnKomen.className = "mtx-act-btn";
      btnKomen.textContent = `💬 Komentar (${comments.length})`;
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

      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
      btnSave.textContent = sudahSave ? "✅ Tersimpan" : "🔖 Simpan";
      btnSave.onclick = async (e) => {
        e.stopPropagation();
        if (await kirimAksiApi("/api/save", { id: post.id })) {
          await segarkanSosial();
        }
      };
      bar.appendChild(btnSave);

      if (isAdmin()) {
        const btnHapus = document.createElement("button");
        btnHapus.type = "button";
        btnHapus.className = "mtx-btn-hapus-card";
        btnHapus.textContent = "🗑 Hapus";
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

  // 7B. Pasang Floating Dock khusus Shorts agar video tidak terjepit
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

      // Avatar + Follow Mini Badge
      const avWrap = document.createElement("div");
      avWrap.className = "mtx-short-avatar-wrap";
      avWrap.title = `Channel ${chNama}`;
      avWrap.innerHTML = `<img src="${resolveAvatarUrl(chFoto, chNama)}">`;
      avWrap.onclick = (e) => {
        e.stopPropagation();
        if (post.email) {
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
          if (await kirimAksiApi("/api/follow", { targetEmail: post.email })) {
            await segarkanSosial();
          }
        };
        avWrap.appendChild(badge);
      }
      dock.appendChild(avWrap);

      // Like Button
      const btnLike = document.createElement("button");
      btnLike.type = "button";
      btnLike.className = "mtx-short-pill-btn" + (sudahLike ? " liked" : "");
      btnLike.innerHTML = `${sudahLike ? "❤️" : "🤍"}<span>${likes.length}</span>`;
      btnLike.onclick = async (e) => {
        e.stopPropagation();
        if (await kirimAksiApi("/api/like", { id: post.id })) {
          await segarkanSosial();
        }
      };
      dock.appendChild(btnLike);

      // Comment Button
      const btnKomen = document.createElement("button");
      btnKomen.type = "button";
      btnKomen.className = "mtx-short-pill-btn";
      btnKomen.innerHTML = `💬<span>${comments.length}</span>`;
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

      // Save Button
      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-short-pill-btn" + (sudahSave ? " saved" : "");
      btnSave.innerHTML = `${sudahSave ? "✅" : "🔖"}<span>Simpan</span>`;
      btnSave.onclick = async (e) => {
        e.stopPropagation();
        if (await kirimAksiApi("/api/save", { id: post.id })) {
          await segarkanSosial();
        }
      };
      dock.appendChild(btnSave);

      // Admin Delete Button
      if (isAdmin()) {
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "mtx-short-pill-btn del";
        btnDel.innerHTML = `🗑<span>Hapus</span>`;
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

  // 7C. Pasang Like, Follow, Simpan, & Komentar di Pemutar Video Utama (#boxPemutarUtama)
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

    // Bar Channel Kreator
    const topBar = document.createElement("div");
    topBar.className = "mtx-creator-bar";
    topBar.innerHTML = `
      <div class="mtx-creator-info" title="Lihat Channel ${esc(chNama)}">
        <img src="${resolveAvatarUrl(chFoto, chNama)}" style="width:38px;height:38px;">
        <div>
          <div style="font-size:13.5px;font-weight:800;color:#083d63;">${esc(chNama)}</div>
          <div style="font-size:11.5px;color:#3d6e8c;">${chFollowers.length} Pengikut</div>
        </div>
      </div>
    `;
    topBar.querySelector(".mtx-creator-info").onclick = () => {
      if (post.email) {
        channelSedangDilihat = post.email.toLowerCase();
        bukaTabKhusus("channel");
      }
    };
    if (bukanMilikSendiri) {
      const btnFollow = document.createElement("button");
      btnFollow.type = "button";
      btnFollow.className = "mtx-btn-follow" + (sudahFollow ? " following" : "");
      btnFollow.style.padding = "6px 14px";
      btnFollow.style.fontSize = "12.5px";
      btnFollow.textContent = sudahFollow ? "✓ Mengikuti" : "+ Ikuti Channel";
      btnFollow.onclick = async () => {
        if (await kirimAksiApi("/api/follow", { targetEmail: post.email })) {
          await segarkanSosial();
        }
      };
      topBar.appendChild(btnFollow);
    }
    wadah.appendChild(topBar);

    // Bar Suka, Simpan, Hapus Admin
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const sudahLike = likes.includes(myEmail);
    const sudahSave = daftarSaved.includes(post.id);

    const bar = document.createElement("div");
    bar.className = "mtx-social-bar";

    const btnLike = document.createElement("button");
    btnLike.type = "button";
    btnLike.className = "mtx-act-btn" + (sudahLike ? " liked" : "");
    btnLike.textContent = `${sudahLike ? "❤️" : "🤍"} Suka (${likes.length})`;
    btnLike.onclick = async () => {
      if (await kirimAksiApi("/api/like", { id: post.id })) {
        await segarkanSosial();
      }
    };
    bar.appendChild(btnLike);

    const btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
    btnSave.textContent = sudahSave ? "✅ Tersimpan" : "🔖 Simpan Video";
    btnSave.onclick = async () => {
      if (await kirimAksiApi("/api/save", { id: post.id })) {
        await segarkanSosial();
      }
    };
    bar.appendChild(btnSave);

    if (isAdmin()) {
      const btnHapus = document.createElement("button");
      btnHapus.type = "button";
      btnHapus.className = "mtx-btn-hapus-card";
      btnHapus.textContent = "🗑 Hapus Video (Admin)";
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

    // Kolom Komentar langsung terbuka di bawah pemutar video panjang
    const labelKomen = document.createElement("div");
    labelKomen.style.cssText = "font-size:12.5px;font-weight:700;color:#083d63;margin-top:10px;";
    labelKomen.textContent = `💬 Komentar (${comments.length})`;
    wadah.appendChild(labelKomen);
    wadah.appendChild(buatDrawerKomentar(post, false));
  }

  // Pantau klik pada gridVideo maupun perubahan src videoPemutarUtama secara instan
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
    const sedangKetik = document.activeElement && document.activeElement.classList.contains("mtx-input-komen");
    if (!sedangKetik) {
      pasangKontrolSemua(false);
      updatePemutarUtamaSocial(false);
    }
  }, 1500);

  // 8. Halaman Channel & Edit Profil
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
      ? `<button type="button" id="mtx-btn-edit-profil" class="win7-btn win7-btn-primary">✏️ Edit Channel & Foto Profil</button>`
      : `<button type="button" id="mtx-btn-follow-ch" class="mtx-btn-follow ${sudahFollow ? "following" : ""}" style="padding:7px 16px;font-size:13px;">${sudahFollow ? "✓ Mengikuti" : "+ Ikuti Channel"}</button>`;

    const kartuPostHtml = postinganCh.length === 0
      ? `<div class="mtx-channel-banner" style="text-align:center;">Belum ada video atau postingan di channel ini.</div>`
      : postinganCh.map((p) => {
          const mediaUrl = p.file && serverUrl ? `${serverUrl}/media/${encodeURIComponent(p.file)}` : "";
          const mediaTag = p.jenisMedia === "video" && mediaUrl
            ? `<video src="${mediaUrl}" controls style="width:100%;max-height:280px;border-radius:12px;background:#000;margin-top:8px;"></video>`
            : (p.jenisMedia === "image" && mediaUrl
              ? `<img src="${mediaUrl}" style="width:100%;max-height:320px;object-fit:contain;border-radius:12px;margin-top:8px;">`
              : "");
          return `
            <div class="mtx-channel-banner" style="padding:14px;">
              <div style="font-size:11.5px;color:#0077b6;font-weight:700;">[${(p.tipe || "feed").toUpperCase()}] • ❤️ ${(p.likes || []).length} Suka • 💬 ${(p.comments || []).length} Komentar</div>
              <div style="font-size:13.5px;margin-top:4px;">${esc(p.teks || "(Tanpa caption)")}</div>
              ${mediaTag}
            </div>
          `;
        }).join("");

    wadah.innerHTML = `
      <div class="mtx-channel-banner">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <img src="${resolveAvatarUrl(ch.foto, ch.nama)}" style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:2.5px solid #fff;box-shadow:0 4px 12px rgba(0,65,115,0.25);">
            <div>
              <h2 style="margin:0;font-size:20px;">${esc(ch.nama)}</h2>
              <div style="font-size:12px;color:#2b678a;">${esc(ch.email)}</div>
              <p style="margin:6px 0 0;font-size:13px;color:#0b3c5d;">${esc(ch.bio || "Belum ada bio channel.")}</p>
            </div>
          </div>
          <div>${tombolAksiHeader}</div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
          <span class="mtx-stat-chip">👥 ${followers.length} Pengikut</span>
          <span class="mtx-stat-chip">➕ ${followingCount} Mengikuti</span>
          <span class="mtx-stat-chip">🎬 ${postinganCh.length} Postingan</span>
          <span class="mtx-stat-chip">❤️ ${totalSuka} Total Suka</span>
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
    } else {
      document.getElementById("mtx-btn-follow-ch").onclick = async () => {
        if (await kirimAksiApi("/api/follow", { targetEmail: emailCh })) {
          await segarkanSosial();
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
        await segarkanSosial();
      }
    } catch (e) {
      alert("Error koneksi: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan Perubahan";
    }
  }

  // 9. Halaman Postingan Disimpan
  function renderHalamanDisimpan() {
    const wadah = document.getElementById("view-saved");
    if (!wadah || !userAktif) return;

    const profilSaya = getProfilSaya();
    const savedIds = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];
    const daftarTersimpan = daftarPostCache.filter((p) => savedIds.includes(p.id));
    const serverUrl = getServerUrl();

    if (daftarTersimpan.length === 0) {
      wadah.innerHTML = `<div class="mtx-channel-banner" style="text-align:center;">Belum ada video atau postingan yang kamu simpan. Klik tombol <strong>🔖 Simpan</strong> pada postingan mana saja!</div>`;
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
            <button type="button" data-unsave-id="${p.id}" class="mtx-act-btn saved">🗑 Hapus dari Simpanan</button>
          </div>
          <div style="font-size:13.5px;margin-top:6px;">${esc(p.teks || "(Tanpa caption)")}</div>
          ${mediaTag}
        </div>
      `;
    }).join("");

    wadah.querySelectorAll("[data-unsave-id]").forEach((btn) => {
      btn.onclick = async () => {
        if (await kirimAksiApi("/api/save", { id: btn.getAttribute("data-unsave-id") })) {
          await segarkanSosial();
        }
      };
    });
  }
})();