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

  const style = document.createElement("style");
  style.textContent = `
    #mtx-auth-gate {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: linear-gradient(135deg, rgba(12, 65, 110, 0.88), rgba(20, 125, 165, 0.85));
      backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .mtx-auth-card {
      width: 100%;
      max-width: 400px;
      background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(218,242,255,0.92) 100%);
      border: 1.5px solid #ffffff;
      border-radius: 20px;
      padding: 22px 24px;
      box-shadow: 0 14px 36px rgba(0, 35, 70, 0.45);
      color: #0b3c5d;
      text-align: center;
    }
    .mtx-auth-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      margin-bottom: 10px;
      border-radius: 11px;
      border: 1px solid #8ecae6;
      background: rgba(255,255,255,0.9);
      font-size: 13.5px;
      outline: none;
    }
    .mtx-btn-google {
      width: 100%;
      padding: 10px;
      border-radius: 12px;
      border: 1px solid #b5e2fa;
      background: linear-gradient(180deg, #ffffff 0%, #e6f5ff 100%);
      color: #083d63;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(0, 75, 130, 0.15);
      margin-bottom: 12px;
    }
    .mtx-btn-email {
      width: 100%;
      padding: 10px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(180deg, #38b6ff 0%, #0077b6 100%);
      color: #fff;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
    }
    .mtx-user-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.75);
      border: 1px solid rgba(255,255,255,0.95);
      border-radius: 20px;
      padding: 5px 11px;
      font-size: 12px;
      font-weight: 600;
      color: #093b5c;
      margin-right: 6px;
    }
    .mtx-admin-tag {
      background: linear-gradient(180deg, #ffd166, #f77f00);
      color: #fff;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
    }
    .mtx-btn-hapus-card {
      background: linear-gradient(180deg, #ff6b6b, #c9184a);
      color: #fff;
      border: 1px solid #fff;
      border-radius: 10px;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 6px;
      box-shadow: 0 2px 6px rgba(180, 0, 40, 0.25);
    }
  `;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.id = "mtx-auth-gate";
  gate.innerHTML = `
    <div class="mtx-auth-card">
      <h2 style="margin:0 0 4px; font-size:21px;">MiniTube X</h2>
      <p style="margin:0 0 14px; font-size:12.5px; color:#1d5b79;">
        Wajib login dengan Akun Google atau Email asli agar tidak ada penyamaran nama.
      </p>

      <div id="mtx-form-login">
        <button type="button" id="mtx-login-google" class="mtx-btn-google">
          Masuk Cepat dengan Google
        </button>

        <div style="font-size:11.5px; color:#4a7c9b; margin:8px 0;">— atau pakai email apapun —</div>

        <input type="text" id="mtx-reg-nama" class="mtx-auth-input" placeholder="Nama lengkap kamu (khusus daftar baru)" style="display:none;">
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

  function kunciInputNama(user) {
    const inputNama = document.getElementById("inputNama");
    if (!inputNama || !user) return;
    const label = user.displayName ? `${user.displayName} (${user.email})` : user.email;
    inputNama.value = label;
    inputNama.readOnly = true;
    inputNama.style.opacity = "0.85";
    inputNama.style.cursor = "not-allowed";
  }

  function terapkanStatusUser(user) {
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
    kunciInputNama(user);
    pasangInfoHeader(user);
    if (isAdmin()) pasangTombolHapusPadaKartu();
  }

  auth.onAuthStateChanged(terapkanStatusUser);
  setInterval(() => {
    if (userAktif) kunciInputNama(userAktif);
  }, 1500);

  function isAdmin() {
    return userAktif && userAktif.email && userAktif.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }

  function pasangInfoHeader(user) {
    const nav = document.querySelector(".nav-actions");
    if (!nav) return;
    const lama = document.getElementById("mtx-user-controls");
    if (lama) lama.remove();

    const wrap = document.createElement("span");
    wrap.id = "mtx-user-controls";
    wrap.style.display = "inline-flex";
    wrap.style.alignItems = "center";

    const pill = document.createElement("span");
    pill.className = "mtx-user-pill";
    pill.innerHTML = `${user.displayName || user.email} ${isAdmin() ? '<span class="mtx-admin-tag">ADMIN</span>' : ""}`;
    wrap.appendChild(pill);

    if (isAdmin()) {
      const btnPanel = document.createElement("button");
      btnPanel.type = "button";
      btnPanel.className = "win7-btn";
      btnPanel.style.marginRight = "6px";
      btnPanel.textContent = "Kelola Hapus";
      btnPanel.onclick = bukaModalAdmin;
      wrap.appendChild(btnPanel);
    }

    const btnOut = document.createElement("button");
    btnOut.type = "button";
    btnOut.className = "win7-btn";
    btnOut.style.marginRight = "6px";
    btnOut.textContent = "Keluar";
    btnOut.onclick = () => {
      if (confirm("Keluar dari akun MiniTube X?")) auth.signOut();
    };
    wrap.appendChild(btnOut);

    nav.insertBefore(wrap, nav.firstChild);
  }

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
          if (isAdmin()) setTimeout(pasangTombolHapusPadaKartu, 150);
        }
      }).catch(() => {});
    }

    return response;
  };

  async function hapusPostAdmin(postId, infoLabel) {
    if (!isAdmin()) return;
    if (!confirm(`Hapus permanen postingan dari:\n${infoLabel}?`)) return;

    const params = new URLSearchParams(window.location.search);
    const serverUrl = params.get("server");
    if (!serverUrl) return;

    try {
      const token = await userAktif.getIdToken();
      const res = await nativeFetch(serverUrl + "/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ id: postId })
      });
      if (!res.ok) {
        const msg = await res.text();
        alert("Gagal menghapus: " + msg);
        return;
      }
      if (typeof renderSemuaTab === "function") {
        renderSemuaTab();
      } else {
        window.location.reload();
      }
    } catch (e) {
      alert("Error koneksi saat menghapus: " + e.message);
    }
  }

  function pasangTombolHapusPadaKartu() {
    if (!isAdmin() || !daftarPostCache.length) return;
    const kandidat = document.querySelectorAll("#view-feed > div, #gridVideo > div, #wadahShorts > div");
    kandidat.forEach((kartu) => {
      if (kartu.querySelector(".mtx-btn-hapus-card")) return;
      const html = kartu.innerHTML || "";
      const cocok = daftarPostCache.find((p) =>
        (p.file && html.includes(p.file)) ||
        (p.penulis && p.teks && html.includes(p.penulis) && html.includes(p.teks))
      );
      if (cocok) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mtx-btn-hapus-card";
        btn.textContent = "🗑 Hapus (Admin)";
        btn.onclick = (e) => {
          e.stopPropagation();
          hapusPostAdmin(cocok.id, cocok.penulis);
        };
        kartu.appendChild(btn);
      }
    });
  }
  setInterval(pasangTombolHapusPadaKartu, 1500);

  function bukaModalAdmin() {
    if (!isAdmin()) return;
    const lama = document.getElementById("mtx-admin-modal");
    if (lama) lama.remove();

    const mod = document.createElement("div");
    mod.id = "mtx-admin-modal";
    mod.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(8,35,58,0.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;";

    const itemHtml = daftarPostCache.length === 0
      ? "<p style='text-align:center;'>Belum ada postingan aktif.</p>"
      : daftarPostCache.map((p) => `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(255,255,255,0.85);padding:8px 12px;border-radius:10px;margin-bottom:8px;border:1px solid #90e0ef;">
            <div style="font-size:12px;text-align:left;overflow:hidden;">
              <strong>[${(p.tipe || "feed").toUpperCase()}] ${p.penulis}</strong><br>
              <span style="color:#333;">${(p.teks || "(Tanpa caption)").slice(0, 60)}</span>
            </div>
            <button type="button" data-del-id="${p.id}" data-del-user="${p.penulis}" class="mtx-btn-hapus-card" style="margin:0;white-space:nowrap;">Hapus</button>
          </div>
        `).join("");

    mod.innerHTML = `
      <div class="mtx-auth-card" style="max-width:520px;max-height:80vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:16px;">Panel Hapus Postingan (Admin)</h3>
          <button type="button" id="mtx-tutup-admin" style="border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-weight:bold;">✕</button>
        </div>
        ${itemHtml}
      </div>
    `;
    document.body.appendChild(mod);

    document.getElementById("mtx-tutup-admin").onclick = () => mod.remove();
    mod.querySelectorAll("[data-del-id]").forEach((btn) => {
      btn.onclick = async () => {
        await hapusPostAdmin(btn.getAttribute("data-del-id"), btn.getAttribute("data-del-user"));
        mod.remove();
      };
    });
  }
})();