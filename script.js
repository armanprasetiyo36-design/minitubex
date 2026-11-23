// =========================================
// 1. KONFIGURASI ALAMAT SERVER PENYIMPANAN
// =========================================
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("server")) {
  // Simpan alamat server HTTPS dari parameter ?server=...
  const alamatBaru = urlParams.get("server").trim().replace(/\/+$/, "");
  localStorage.setItem("mtx_server_url", alamatBaru);
}

// Jika dibuka di localhost, otomatis kosong (pakai server lokal).
// Jika dibuka di GitHub Pages, pakai alamat HTTPS tunnel yang tersimpan.
const isLokal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
let SERVER_URL = isLokal ? "" : (localStorage.getItem("mtx_server_url") || "");

let tabAktif = "feed";
let observerShorts = null;
let daftarPostingan = [];

// =========================================
// 2. KONTROL UI (BUKA FORM & GANTI TAB)
// =========================================
function toggleFormUpload() {
  const panel = document.getElementById("panelUpload");
  panel.classList.toggle("hidden");
}

function gantiTab(namaTab) {
  tabAktif = namaTab;

  ["feed", "video", "short"].forEach(function (t) {
    document.getElementById("tab-" + t).classList.toggle("active", t === namaTab);
    document.getElementById("view-" + t).classList.toggle("hidden", t !== namaTab);
  });

  document.querySelectorAll("#wadahShorts video").forEach(function (v) {
    v.pause();
  });
  if (namaTab !== "video") {
    document.getElementById("videoPemutarUtama").pause();
  }

  renderSemuaTab();
}

// =========================================
// 3. HELPER WAKTU & ENCODING TEKS
// =========================================
function hitungSisaWaktu(waktuBuatDetik) {
  const sekarang = Math.floor(Date.now() / 1000);
  const batas24Jam = 86400;
  const sisa = batas24Jam - (sekarang - waktuBuatDetik);

  if (sisa <= 0) return "Segera terhapus";
  const jam = Math.floor(sisa / 3600);
  const menit = Math.floor((sisa % 3600) / 60);
  return "Sisa " + jam + "j " + menit + "m";
}

function teksKeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let biner = "";
  bytes.forEach(function (b) {
    biner += String.fromCharCode(b);
  });
  return btoa(biner);
}

// =========================================
// 4. KOMUNIKASI DENGAN SERVER HTTPS
// =========================================
async function muatPostingan() {
  if (!isLokal && !SERVER_URL) {
    document.getElementById("view-feed").innerHTML =
      '<div class="win7-window"><div class="win7-window-body">' +
      '<strong>Server penyimpanan belum terhubung.</strong><br>' +
      'Buka website ini menggunakan link lengkap yang berakhiran <code>?server=https://alamat-tunnel-kamu</code>.' +
      '</div></div>';
    return;
  }

  try {
    const respon = await fetch(SERVER_URL + "/api/posts");
    const data = await respon.json();
    daftarPostingan = Array.isArray(data) ? data : [data];
    renderSemuaTab();
  } catch (err) {
    document.getElementById("view-feed").innerHTML =
      '<div class="win7-window"><div class="win7-window-body">' +
      '<strong>Tidak dapat terhubung ke server laptop.</strong><br>' +
      'Pastikan laptop server sedang menyala dan alamat HTTPS tunnel sudah benar.' +
      '</div></div>';
  }
}

async function kirimPostingan() {
  if (!isLokal && !SERVER_URL) {
    alert("Alamat server belum diatur! Buka web lewat link ?server=https://...");
    return;
  }

  const nama = (document.getElementById("inputNama").value.trim() || "Anon").slice(0, 24);
  const tipe = document.getElementById("inputTipe").value;
  const teks = document.getElementById("inputTeks").value.trim();
  const inputFile = document.getElementById("inputFile");
  const file = inputFile.files[0];
  const status = document.getElementById("pesanStatus");

  if (tipe === "feed" && !teks && !file) {
    status.textContent = "Isi tulisan atau pilih gambar/video terlebih dahulu!";
    return;
  }
  if ((tipe === "video" || tipe === "short") && !file) {
    status.textContent = "Untuk tab Video & Shorts, wajib memilih file video!";
    return;
  }
  if (file && file.size > 100 * 1024 * 1024) {
    status.textContent = "Ukuran file terlalu besar! Maksimal 100 MB.";
    return;
  }

  status.textContent = "Mengupload lewat HTTPS ke server penyimpanan...";

  const metaBase64 = teksKeBase64(JSON.stringify({
    penulis: nama,
    tipe: tipe,
    teks: teks
  }));
  const fileBase64 = file ? teksKeBase64(file.name) : "";

  try {
    const respon = await fetch(SERVER_URL + "/api/post", {
      method: "POST",
      headers: {
        "X-Meta": metaBase64,
        "X-Filename": fileBase64
      },
      body: file || ""
    });

    if (!respon.ok) {
      throw new Error(await respon.text());
    }

    document.getElementById("inputTeks").value = "";
    inputFile.value = "";
    status.textContent = "Berhasil diupload! Otomatis terhapus dalam 24 jam.";
    document.getElementById("panelUpload").classList.add("hidden");

    await muatPostingan();
    gantiTab(tipe);
  } catch (err) {
    status.textContent = "Upload gagal: " + err.message;
  }
}

// =========================================
// 5. RENDER TAMPILAN KE LAYAR
// =========================================
function renderSemuaTab() {
  document.getElementById("tab-feed").textContent =
    "Feed (" + daftarPostingan.filter(p => p.tipe === "feed").length + ")";
  document.getElementById("tab-video").textContent =
    "Video (" + daftarPostingan.filter(p => p.tipe === "video").length + ")";
  document.getElementById("tab-short").textContent =
    "Shorts (" + daftarPostingan.filter(p => p.tipe === "short").length + ")";

  if (tabAktif === "feed") renderFeed();
  if (tabAktif === "video") renderVideo();
  if (tabAktif === "short") renderShorts();
}

function renderFeed() {
  const wadah = document.getElementById("view-feed");
  const dataFeed = daftarPostingan.filter(p => p.tipe === "feed");
  wadah.innerHTML = "";

  if (dataFeed.length === 0) {
    wadah.innerHTML = '<div class="win7-window"><div class="win7-window-body">Belum ada postingan aktif. Klik <strong>+ Upload Baru</strong> untuk mencoba!</div></div>';
    return;
  }

  dataFeed.forEach(function (post) {
    const card = document.createElement("article");
    card.className = "win7-window";

    const bar = document.createElement("div");
    bar.className = "win7-titlebar";
    bar.innerHTML =
      "<span>@" + bersihkanTeks(post.penulis) + "</span>" +
      '<span class="ttl-pill">⏳ ' + hitungSisaWaktu(post.dibuatPada) + "</span>";
    card.appendChild(bar);

    const body = document.createElement("div");
    body.className = "win7-window-body";

    if (post.teks) {
      const p = document.createElement("p");
      p.className = "post-text";
      p.textContent = post.teks;
      body.appendChild(p);
    }

    if (post.file) {
      const urlMedia = SERVER_URL + "/media/" + encodeURIComponent(post.file);
      const media = document.createElement(post.jenisMedia === "video" ? "video" : "img");
      media.className = "post-media";
      media.src = urlMedia;
      if (post.jenisMedia === "video") {
        media.controls = true;
        media.preload = "metadata";
      } else {
        media.loading = "lazy";
      }
      body.appendChild(media);
    }

    card.appendChild(body);
    wadah.appendChild(card);
  });
}

function renderVideo() {
  const grid = document.getElementById("gridVideo");
  const dataVideo = daftarPostingan.filter(p => p.tipe === "video");
  grid.innerHTML = "";

  if (dataVideo.length === 0) {
    grid.innerHTML = '<div class="win7-window"><div class="win7-window-body">Belum ada video aktif.</div></div>';
    return;
  }

  dataVideo.forEach(function (post) {
    const card = document.createElement("div");
    card.className = "win7-window yt-card";
    const urlMedia = SERVER_URL + "/media/" + encodeURIComponent(post.file);

    const thumb = document.createElement("video");
    thumb.className = "yt-thumb";
    thumb.src = urlMedia + "#t=0.5";
    thumb.preload = "metadata";
    card.appendChild(thumb);

    const body = document.createElement("div");
    body.className = "win7-window-body";
    body.innerHTML =
      "<strong>" + bersihkanTeks(post.teks || "Video Tanpa Judul") + "</strong>" +
      '<p class="meta-text">@' + bersihkanTeks(post.penulis) + " • " + hitungSisaWaktu(post.dibuatPada) + "</p>";
    card.appendChild(body);

    card.onclick = function () {
      const box = document.getElementById("boxPemutarUtama");
      const player = document.getElementById("videoPemutarUtama");
      box.classList.remove("hidden");
      player.src = urlMedia;
      player.play();
      document.getElementById("judulPemutarUtama").textContent = post.teks || "Video Tanpa Judul";
      document.getElementById("infoPemutarUtama").textContent =
        "Diupload oleh @" + post.penulis + " • " + hitungSisaWaktu(post.dibuatPada);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    grid.appendChild(card);
  });
}

function renderShorts() {
  const wadah = document.getElementById("wadahShorts");
  const dataShorts = daftarPostingan.filter(p => p.tipe === "short");
  wadah.innerHTML = "";

  if (dataShorts.length === 0) {
    wadah.innerHTML = '<p style="color:#fff; text-align:center; padding:24px;">Belum ada video Shorts aktif.</p>';
    return;
  }

  if (observerShorts) observerShorts.disconnect();
  observerShorts = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        const vid = entry.target.querySelector("video");
        if (!vid) return;
        if (entry.isIntersecting) {
          vid.play().catch(function () {});
        } else {
          vid.pause();
        }
      });
    },
    { root: wadah, threshold: 0.7 }
  );

  dataShorts.forEach(function (post) {
    const slide = document.createElement("div");
    slide.className = "short-slide";

    const vid = document.createElement("video");
    vid.src = SERVER_URL + "/media/" + encodeURIComponent(post.file);
    vid.loop = true;
    vid.controls = true;
    vid.playsInline = true;
    vid.preload = "metadata";
    slide.appendChild(vid);

    const caption = document.createElement("div");
    caption.className = "short-caption";
    caption.innerHTML =
      "<strong>@" + bersihkanTeks(post.penulis) + "</strong> " +
      '<span class="ttl-pill">' + hitungSisaWaktu(post.dibuatPada) + "</span>" +
      '<div style="margin-top:4px; font-size:0.88rem;">' + bersihkanTeks(post.teks || "") + "</div>";
    slide.appendChild(caption);

    wadah.appendChild(slide);
    observerShorts.observe(slide);
  });
}

function bersihkanTeks(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

muatPostingan();

// === AUTO-REFRESH POSTINGAN BARU TIAP 4 DETIK ===
let jejakPostTerakhir = "";

async function cekPostinganBaruOtomatis() {
  try {
    const params = new URLSearchParams(window.location.search);
    const serverUrl = params.get("server");
    if (!serverUrl) return;

    const res = await fetch(serverUrl + "/api/posts?t=" + Date.now(), {
      cache: "no-store"
    });
    if (!res.ok) return;

    const daftarPost = await res.json();
    const jejakBaru = daftarPost.map(p => p.id || p.file || p.filename || p.url).join(",");

    if (jejakPostTerakhir === "") {
      jejakPostTerakhir = jejakBaru;
      return;
    }

    if (jejakBaru !== jejakPostTerakhir) {
      const modalBuka = Array.from(document.querySelectorAll(".modal, [id*='modal' i]"))
        .some(el => getComputedStyle(el).display !== "none" && el.offsetParent !== null);
      const sedangNonton = Array.from(document.querySelectorAll("video"))
        .some(v => !v.paused && !v.ended);

      if (!modalBuka && !sedangNonton) {
        jejakPostTerakhir = jejakBaru;
        if (typeof loadPosts === "function") {
          loadPosts();
        } else if (typeof muatPostingan === "function") {
          muatPostingan();
        } else {
          window.location.reload();
        }
      }
    }
  } catch (e) {}
}

setInterval(cekPostinganBaruOtomatis, 4000);

// === FITUR KOMPRESI VIDEO BROWSER & PENGAMAN UPLOAD (MAX 90 MB) ===
(function () {
  const BATAS_MB = 90;
  const BATAS_BYTE = BATAS_MB * 1024 * 1024;

  let hasilKompresUrl = null;
  let recorderAktif = null;
  let sedangKompres = false;
  let dibatalkan = false;

  // 1. Suntikkan CSS gaya Frutiger Aero untuk panel kompresi & notifikasi upload
  const style = document.createElement("style");
  style.textContent = `
    .mtx-btn-kompres {
      background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(210,240,255,0.75) 100%);
      border: 1px solid rgba(255,255,255,0.9);
      border-radius: 20px;
      padding: 7px 14px;
      font-weight: 600;
      font-size: 13px;
      color: #0b4f71;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 85, 140, 0.15);
      backdrop-filter: blur(8px);
      transition: transform 0.15s, box-shadow 0.15s;
      margin-right: 6px;
    }
    .mtx-btn-kompres:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 110, 180, 0.25);
    }
    #mtx-kompres-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(8, 35, 58, 0.55);
      backdrop-filter: blur(6px);
      z-index: 9998;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .mtx-kompres-box {
      width: 100%;
      max-width: 460px;
      background: linear-gradient(180deg, rgba(240,250,255,0.95) 0%, rgba(215,238,252,0.92) 100%);
      border: 1.5px solid #ffffff;
      border-radius: 18px;
      padding: 18px 20px;
      box-shadow: 0 12px 32px rgba(0, 45, 85, 0.35);
      color: #0c3b58;
      font-family: inherit;
    }
    .mtx-rules {
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(130, 195, 235, 0.7);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 12.5px;
      margin: 10px 0 14px;
      line-height: 1.5;
    }
    .mtx-progress-wrap {
      width: 100%;
      height: 14px;
      background: rgba(255,255,255,0.8);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #8ecae6;
      margin: 10px 0;
    }
    .mtx-progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #2ec4b6, #0096c7);
      transition: width 0.2s;
    }
    #mtx-upload-toast {
      display: none;
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(180deg, #ffffff 0%, #d8f3ff 100%);
      border: 1.5px solid #ffffff;
      color: #084163;
      padding: 12px 18px;
      border-radius: 14px;
      font-weight: 600;
      font-size: 13.5px;
      box-shadow: 0 8px 24px rgba(0, 50, 90, 0.28);
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);

  // 2. Buat Modal Kompresi & Toast Status Upload
  const overlay = document.createElement("div");
  overlay.id = "mtx-kompres-overlay";
  overlay.innerHTML = `
    <div class="mtx-kompres-box">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; font-size:17px;">Kompres Video (Hemat Ukuran)</h3>
        <button id="mtx-tutup-kompres" style="border:none; background:rgba(255,255,255,0.8); border-radius:50%; width:28px; height:28px; cursor:pointer; font-weight:bold; color:#0c3b58;">✕</button>
      </div>
      <div class="mtx-rules">
        <strong>Ketentuan Website MiniTube X:</strong><br>
        • Maksimal ukuran upload: <strong>${BATAS_MB} MB</strong> (video besar wajib dikompres dulu).<br>
        • Otomatis diubah ke resolusi hemat <strong>480p</strong> agar lancar diputar.<br>
        • <strong>Auto-Hapus:</strong> Video di sini langsung hilang begitu pindah tab (Feed/Video/Shorts) atau tutup jendela ini.
      </div>
      <input type="file" id="mtx-input-kompres" accept="video/*" style="width:100%; margin-bottom:10px; font-size:13px;">
      <div id="mtx-info-file" style="font-size:12.5px; margin-bottom:8px; color:#145374;"></div>
      <button id="mtx-mulai-kompres" disabled style="width:100%; padding:9px; border-radius:12px; border:none; background:linear-gradient(180deg,#38b6ff,#0077b6); color:#fff; font-weight:bold; cursor:pointer; opacity:0.6;">Mulai Kompres Video</button>
      <div id="mtx-area-proses" style="display:none; margin-top:10px;">
        <div class="mtx-progress-wrap"><div id="mtx-bar" class="mtx-progress-bar"></div></div>
        <div id="mtx-status-kompres" style="font-size:12.5px; text-align:center;">Memproses...</div>
      </div>
      <div id="mtx-area-hasil" style="display:none; margin-top:12px; text-align:center;">
        <video id="mtx-preview-hasil" controls style="width:100%; max-height:190px; border-radius:10px; background:#000; margin-bottom:8px;"></video>
        <div id="mtx-ukuran-hasil" style="font-size:12.5px; font-weight:600; margin-bottom:8px; color:#0a6847;"></div>
        <a id="mtx-link-download" download="video-kompres-minitubex.mp4" style="display:inline-block; width:100%; box-sizing:border-box; padding:9px; border-radius:12px; background:linear-gradient(180deg,#2ec4b6,#1b9aaa); color:#fff; text-decoration:none; font-weight:bold; font-size:13.5px;">⬇ Download Hasil Kompresi</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const toast = document.createElement("div");
  toast.id = "mtx-upload-toast";
  toast.textContent = "⏳ Sedang mengupload ke server... Tunggu sebentar ya!";
  document.body.appendChild(toast);

  // 3. Pasang tombol "Kompres Video" di sebelah "+ Upload Baru"
  function pasangTombolHeader() {
    const semuaTombol = Array.from(document.querySelectorAll("button"));
    const btnUpload = semuaTombol.find(b => b.textContent && b.textContent.includes("Upload"));
    if (btnUpload && !document.getElementById("mtx-btn-buka-kompres")) {
      const btnKompres = document.createElement("button");
      btnKompres.id = "mtx-btn-buka-kompres";
      btnKompres.type = "button";
      btnKompres.className = "mtx-btn-kompres";
      btnKompres.textContent = "Kompres Video";
      btnKompres.onclick = () => {
        bersihkanMemoriKompres();
        overlay.style.display = "flex";
      };
      btnUpload.parentNode.insertBefore(btnKompres, btnUpload);
    }
  }
  pasangTombolHeader();

  // 4. Fungsi pembersih memori otomatis (saat tutup modal atau klik tab Feed/Video/Shorts)
  function bersihkanMemoriKompres() {
    dibatalkan = true;
    if (recorderAktif && recorderAktif.state !== "inactive") {
      try { recorderAktif.stop(); } catch (e) {}
    }
    recorderAktif = null;
    sedangKompres = false;

    const preview = document.getElementById("mtx-preview-hasil");
    if (preview) {
      preview.pause();
      preview.removeAttribute("src");
      preview.load();
    }
    if (hasilKompresUrl) {
      URL.revokeObjectURL(hasilKompresUrl);
      hasilKompresUrl = null;
    }

    const inputEl = document.getElementById("mtx-input-kompres");
    const btnMulai = document.getElementById("mtx-mulai-kompres");
    if (inputEl) inputEl.value = "";
    if (btnMulai) {
      btnMulai.disabled = true;
      btnMulai.style.opacity = "0.6";
    }
    document.getElementById("mtx-info-file").textContent = "";
    document.getElementById("mtx-area-proses").style.display = "none";
    document.getElementById("mtx-area-hasil").style.display = "none";
    document.getElementById("mtx-bar").style.width = "0%";
  }

  document.getElementById("mtx-tutup-kompres").onclick = () => {
    bersihkanMemoriKompres();
    overlay.style.display = "none";
  };

  // Langsung hapus video kompresi jika user klik tab Feed, Video, Shorts, atau Refresh
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const teks = (btn.textContent || "").trim();
    if (["Feed", "Video", "Shorts", "Refresh"].includes(teks)) {
      bersihkanMemoriKompres();
      overlay.style.display = "none";
    }
  });

  // 5. Logika pilihan file & proses kompresi di browser
  const inputKompres = document.getElementById("mtx-input-kompres");
  const btnMulai = document.getElementById("mtx-mulai-kompres");

  inputKompres.onchange = () => {
    if (hasilKompresUrl) {
      URL.revokeObjectURL(hasilKompresUrl);
      hasilKompresUrl = null;
    }
    document.getElementById("mtx-area-hasil").style.display = "none";
    const file = inputKompres.files[0];
    if (!file) return;
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    document.getElementById("mtx-info-file").textContent = `File dipilih: ${file.name} (${mb} MB)`;
    btnMulai.disabled = false;
    btnMulai.style.opacity = "1";
  };

  btnMulai.onclick = async () => {
    const file = inputKompres.files[0];
    if (!file || sedangKompres) return;

    sedangKompres = true;
    dibatalkan = false;
    btnMulai.disabled = true;
    btnMulai.style.opacity = "0.6";
    document.getElementById("mtx-area-proses").style.display = "block";
    document.getElementById("mtx-area-hasil").style.display = "none";

    const bar = document.getElementById("mtx-bar");
    const statusTxt = document.getElementById("mtx-status-kompres");
    bar.style.width = "2%";
    statusTxt.textContent = "Menyiapkan video (berjalan sesuai durasi video)...";

    const srcUrl = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.src = srcUrl;
    vid.playsInline = true;
    vid.muted = false;
    vid.volume = 1.0;

    await new Promise((resolve) => {
      vid.onloadedmetadata = resolve;
    });

    if (dibatalkan) {
      URL.revokeObjectURL(srcUrl);
      return;
    }

    // Skala ke maksimal 480p (sisi terpanjang max 854px)
    const maxSisi = 854;
    let w = vid.videoWidth;
    let h = vid.videoHeight;
    if (w > maxSisi || h > maxSisi) {
      if (w >= h) {
        h = Math.round((h * maxSisi) / w);
        w = maxSisi;
      } else {
        w = Math.round((w * maxSisi) / h);
        h = maxSisi;
      }
    }
    w = w % 2 === 0 ? w : w - 1;
    h = h % 2 === 0 ? h : h - 1;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Tangkap audio tanpa membunyikan speaker
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sourceNode = audioCtx.createMediaElementSource(vid);
    const destNode = audioCtx.createMediaStreamDestination();
    sourceNode.connect(destNode);

    const canvasStream = canvas.captureStream(24);
    const gabunganStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destNode.stream.getAudioTracks()
    ]);

    let mime = "video/webm";
    let ext = "webm";
    if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
      mime = "video/mp4;codecs=avc1";
      ext = "mp4";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mime = "video/mp4";
      ext = "mp4";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      mime = "video/webm;codecs=vp9,opus";
    }

    const chunks = [];
    recorderAktif = new MediaRecorder(gabunganStream, {
      mimeType: mime,
      videoBitsPerSecond: 1100000, // ~1.1 Mbps (~8 MB per menit)
      audioBitsPerSecond: 96000
    });

    recorderAktif.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorderAktif.onstop = () => {
      URL.revokeObjectURL(srcUrl);
      audioCtx.close().catch(() => {});
      sedangKompres = false;

      if (dibatalkan) return;

      const blobHasil = new Blob(chunks, { type: mime });
      hasilKompresUrl = URL.createObjectURL(blobHasil);
      const mbHasil = (blobHasil.size / (1024 * 1024)).toFixed(1);

      bar.style.width = "100%";
      statusTxt.textContent = "Kompresi selesai!";

      const preview = document.getElementById("mtx-preview-hasil");
      preview.src = hasilKompresUrl;
      document.getElementById("mtx-ukuran-hasil").textContent = `Ukuran baru: ${mbHasil} MB (Siap di-download & upload!)`;

      const linkDl = document.getElementById("mtx-link-download");
      linkDl.href = hasilKompresUrl;
      linkDl.download = `kompres-minitubex.${ext}`;
      document.getElementById("mtx-area-hasil").style.display = "block";
    };

    recorderAktif.start(500);
    await vid.play();

    function gambarFrame() {
      if (dibatalkan || vid.paused || vid.ended) return;
      ctx.drawImage(vid, 0, 0, w, h);
      if (vid.duration) {
        const persen = Math.min(99, Math.round((vid.currentTime / vid.duration) * 100));
        bar.style.width = persen + "%";
        statusTxt.textContent = `Mengompres... ${persen}% (Jangan pindah tab dulu)`;
      }
      requestAnimationFrame(gambarFrame);
    }
    gambarFrame();

    vid.onended = () => {
      if (recorderAktif && recorderAktif.state !== "inactive") {
        recorderAktif.stop();
      }
    };
  };

  // 6. Cegat otomatis jika user memilih file > 90 MB di form Upload biasa
  document.addEventListener("change", (e) => {
    const target = e.target;
    if (!target || target.type !== "file" || target.id === "mtx-input-kompres") return;
    const file = target.files && target.files[0];
    if (!file) return;

    if (file.size > BATAS_BYTE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      target.value = "";
      const bukaSekarang = confirm(
        `Ukuran file kamu ${mb} MB (batas maksimal website ${BATAS_MB} MB).\n\nKlik OK untuk langsung membuka tempat Kompres Video!`
      );
      if (bukaSekarang) {
        bersihkanMemoriKompres();
        overlay.style.display = "flex";
      }
    }
  }, true);

  // 7. Tampilkan indikator loading otomatis saat proses POST upload berjalan
  const asliFetch = window.fetch;
  window.fetch = async function (...args) {
    const opsi = args[1] || {};
    const isPost = (opsi.method || "GET").toUpperCase() === "POST";
    if (isPost) toast.style.display = "block";
    try {
      const res = await asliFetch.apply(this, args);
      if (isPost && !res.ok) {
        alert("Upload gagal ditolak server. Pastikan ukuran file di bawah 90 MB.");
      }
      return res;
    } catch (err) {
      if (isPost) {
        alert("Koneksi upload terputus atau file terlalu besar (maksimal 90 MB).");
      }
      throw err;
    } finally {
      if (isPost) toast.style.display = "none";
    }
  };
})();