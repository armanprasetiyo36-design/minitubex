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