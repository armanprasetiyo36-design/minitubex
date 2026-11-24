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
  const targetBalasKomen = {};

  // State Pencarian, Algoritma, Tema, Bahasa, & Onboarding Gate
  let kataKunciCari = "";
  let filterCari = "semua";
  let urutCari = "algoritma";
  let modeFeed = localStorage.getItem("mtx_feed_mode") || "algoritma";
  let temaAktif = localStorage.getItem("mtx_theme") || "aero";
  let bahasaAktif = localStorage.getItem("mtx_lang") || "id";
  let cariBahasaQuery = "";
  let gateLangQuery = "";
  let gateStep = "lang"; // "lang" -> "login" -> "verif" -> "theme"
  let sharedPostHandled = false;

  // Daftar 6 Tema MiniTube X
  const DAFTAR_TEMA = [
    {
      id: "aero",
      nama: "Frutiger Aero (Default)",
      desc: "Kaca transparan biru langit glossy khas Windows 7.",
      preview: "linear-gradient(135deg, #48cae4, #0077b6)"
    },
    {
      id: "win7-dark",
      nama: "Windows 7 Aero Dark",
      desc: "Kaca gelap transparan malam dengan aksen neon cyan.",
      preview: "linear-gradient(135deg, #0d2137, #1c4e75)"
    },
    {
      id: "frutiger-eco",
      nama: "Frutiger Eco (Alam & Air)",
      desc: "Nuansa hijau zamrud segar & tetesan air.",
      preview: "linear-gradient(135deg, #2ec4b6, #2b9348)"
    },
    {
      id: "retro-classic",
      nama: "Retro Classic (XP / 98 Tahoma)",
      desc: "Tampilan klasik Luna/Windows 98 dengan font Tahoma.",
      preview: "linear-gradient(135deg, #0054e3, #ece9d8)"
    },
    {
      id: "pyroland",
      nama: "Pyroland Sunset",
      desc: "Gradasi pastel magenta, persik, dan emas glossy.",
      preview: "linear-gradient(135deg, #ff758f, #ffb703)"
    },
    {
      id: "oled-black",
      nama: "OLED Pitch Black",
      desc: "Hitam pekat hemat baterai & nyaman di ruangan gelap.",
      preview: "linear-gradient(135deg, #050505, #22262e)"
    }
  ];

  // Daftar 135+ Bahasa di Dunia
  const SEMUA_BAHASA_DUNIA = [
    ["id", "Bahasa Indonesia"],
    ["en", "English (Inggris)"],
    ["jv", "Basa Jawa (Javanese)"],
    ["su", "Basa Sunda (Sundanese)"],
    ["ms", "Bahasa Melayu (Malay)"],
    ["ja", "日本語 (Japanese / Jepang)"],
    ["ko", "한국어 (Korean / Korea)"],
    ["zh-CN", "中文 简体 (Chinese Simplified / Mandarin)"],
    ["zh-TW", "中文 繁體 (Chinese Traditional)"],
    ["ar", "العربية (Arabic / Arab)"],
    ["es", "Español (Spanish / Spanyol)"],
    ["fr", "Français (French / Prancis)"],
    ["de", "Deutsch (German / Jerman)"],
    ["ru", "Русский (Russian / Rusia)"],
    ["pt", "Português (Portuguese / Portugis)"],
    ["hi", "हिन्दी (Hindi / India)"],
    ["th", "ภาษาไทย (Thai / Thailand)"],
    ["vi", "Tiếng Việt (Vietnamese / Vietnam)"],
    ["af", "Afrikaans"],
    ["sq", "Shqip (Albanian)"],
    ["am", "አማርኛ (Amharic)"],
    ["hy", "Հայերեն (Armenian)"],
    ["as", "অসমীয়া (Assamese)"],
    ["ay", "Aymar aru (Aymara)"],
    ["az", "Azərbaycan (Azerbaijani)"],
    ["bm", "Bamanankan (Bambara)"],
    ["eu", "Euskara (Basque)"],
    ["be", "Беларуская (Belarusian)"],
    ["bn", "বাংলা (Bengali)"],
    ["bho", "भोजपुरी (Bhojpuri)"],
    ["bs", "Bosanski (Bosnian)"],
    ["bg", "Български (Bulgarian)"],
    ["my", "မြန်မာ (Burmese / Myanmar)"],
    ["ca", "Català (Catalan)"],
    ["ceb", "Cebuano"],
    ["ny", "Chichewa"],
    ["co", "Corsu (Corsican)"],
    ["hr", "Hrvatski (Croatian)"],
    ["cs", "Čeština (Czech)"],
    ["da", "Dansk (Danish)"],
    ["dv", "ދިވެހި (Dhivehi)"],
    ["doi", "डोगरी (Dogri)"],
    ["nl", "Nederlands (Dutch / Belanda)"],
    ["eo", "Esperanto"],
    ["et", "Eesti (Estonian)"],
    ["ee", "Eʋegbe (Ewe)"],
    ["tl", "Filipino (Tagalog)"],
    ["fi", "Suomi (Finnish)"],
    ["fy", "Frysk (Frisian)"],
    ["gl", "Galego (Galician)"],
    ["ka", "ქართული (Georgian)"],
    ["el", "Ελληνικά (Greek / Yunani)"],
    ["gn", "Avañe'ẽ (Guarani)"],
    ["gu", "ગુજરાતી (Gujarati)"],
    ["ht", "Kreyòl Ayisyen (Haitian Creole)"],
    ["ha", "Hausa"],
    ["haw", "ʻŌlelo Hawaiʻi (Hawaiian)"],
    ["iw", "עברית (Hebrew / Ibrani)"],
    ["hmn", "Hmoob (Hmong)"],
    ["hu", "Magyar (Hungarian)"],
    ["is", "Íslenska (Icelandic)"],
    ["ig", "Igbo"],
    ["ilo", "Ilokano"],
    ["ga", "Gaeilge (Irish)"],
    ["it", "Italiano (Italian / Italia)"],
    ["kn", "ಕನ್ನಡ (Kannada)"],
    ["kk", "Қазақ тілі (Kazakh)"],
    ["km", "ខ្មែរ (Khmer / Kamboja)"],
    ["rw", "Kinyarwanda"],
    ["gom", "कोंकणी (Konkani)"],
    ["kri", "Krio"],
    ["ku", "Kurdî (Kurdish)"],
    ["ky", "Кыргызча (Kyrgyz)"],
    ["lo", "ລາວ (Lao / Laos)"],
    ["la", "Latina (Latin)"],
    ["lv", "Latviešu (Latvian)"],
    ["ln", "Lingála (Lingala)"],
    ["lt", "Lietuvių (Lithuanian)"],
    ["lg", "Luganda"],
    ["lb", "Lëtzebuergesch (Luxembourgish)"],
    ["mk", "Македонски (Macedonian)"],
    ["mai", "मैथिली (Maithili)"],
    ["mg", "Malagasy"],
    ["ml", "മലയാളം (Malayalam)"],
    ["mt", "Malti (Maltese)"],
    ["mi", "Māori (Maori)"],
    ["mr", "मराठी (Marathi)"],
    ["mni-Mtei", "ꯃꯩꯇꯩꯂꯣꯟ (Meiteilon)"],
    ["lus", "Mizo ṭawng (Mizo)"],
    ["mn", "Монгол (Mongolian)"],
    ["ne", "नेपाली (Nepali)"],
    ["no", "Norsk (Norwegian)"],
    ["or", "ଓଡ଼ିଆ (Odia)"],
    ["om", "Afaan Oromoo (Oromo)"],
    ["ps", "پښتو (Pashto)"],
    ["fa", "فارسی (Persian / Persia)"],
    ["pl", "Polski (Polish / Polandia)"],
    ["pa", "ਪੰਜਾਬੀ (Punjabi)"],
    ["qu", "Runasimi (Quechua)"],
    ["ro", "Română (Romanian)"],
    ["sm", "Gagana Samoa (Samoan)"],
    ["sa", "संस्कृतम् (Sanskrit)"],
    ["gd", "Gàidhlig (Scots Gaelic)"],
    ["nso", "Sepedi"],
    ["sr", "Српски (Serbian)"],
    ["st", "Sesotho"],
    ["sn", "chiShona (Shona)"],
    ["sd", "سنڌي (Sindhi)"],
    ["si", "සිංහල (Sinhala)"],
    ["sk", "Slovenčina (Slovak)"],
    ["sl", "Slovenščina (Slovenian)"],
    ["so", "Soomaali (Somali)"],
    ["sw", "Kiswahili (Swahili)"],
    ["sv", "Svenska (Swedish / Swedia)"],
    ["tg", "Тоҷикӣ (Tajik)"],
    ["ta", "தமிழ் (Tamil)"],
    ["tt", "Татарча (Tatar)"],
    ["te", "తెలుగు (Telugu)"],
    ["ti", "ትግርኛ (Tigrinya)"],
    ["ts", "Xitsonga (Tsonga)"],
    ["tr", "Türkçe (Turkish / Turki)"],
    ["tk", "Türkmençe (Turkmen)"],
    ["ak", "Twi"],
    ["uk", "Українська (Ukrainian / Ukraina)"],
    ["ur", "اردو (Urdu)"],
    ["ug", "ئۇيغۇرچە (Uyghur)"],
    ["uz", "Oʻzbekcha (Uzbek)"],
    ["cy", "Cymraeg (Welsh)"],
    ["xh", "isiXhosa (Xhosa)"],
    ["yi", "ייִדיש (Yiddish)"],
    ["yo", "Yorùbá (Yoruba)"],
    ["zu", "isiZulu (Zulu)"]
  ];

  const RTL_LANGS = new Set(["ar", "iw", "he", "fa", "ur", "ps", "sd", "ug", "yi", "dv"]);

  // Kamus Instan UI Inti + Alur Onboarding
  const KAMUS_UI = {
    id: {
      search: "Cari", notif: "Notifikasi", saved: "Disimpan", channel: "Channel", settings: "Pengaturan",
      logout: "Keluar", forYou: "Untuk Kamu", following: "Mengikuti", latest: "Terbaru", blocked: "Diblokir",
      like: "Suka", comment: "Komentar", share: "Bagikan", save: "Simpan", savedDone: "Tersimpan",
      blockSimilar: "Blokir Serupa", follow: "+ Ikuti", followingBtn: "Mengikuti",
      step1Badge: "1. Bahasa", step2Badge: "2. Login / Daftar", step3Badge: "3. Tema",
      step1Title: "Pilih Bahasa Terlebih Dahulu",
      step1Sub: "Pilih bahasa yang ingin kamu pakai sebelum masuk atau mendaftar akun.",
      nextToLogin: "Lanjut ke Login / Daftar →",
      changeLang: "Ganti Bahasa",
      step2Title: "Masuk atau Daftar Akun",
      step2Sub: "Gunakan Google atau Email untuk membuat Channel & mulai menjelajah.",
      step3Title: "Pilih Tema Tampilan",
      step3Sub: "Klik salah satu tema di bawah untuk pratinjau langsung, lalu masuk ke halaman utama.",
      enterHome: "Masuk ke Halaman Utama →"
    },
    en: {
      search: "Search", notif: "Notifications", saved: "Saved", channel: "Channel", settings: "Settings",
      logout: "Log Out", forYou: "For You", following: "Following", latest: "Latest", blocked: "Blocked",
      like: "Like", comment: "Comment", share: "Share", save: "Save", savedDone: "Saved",
      blockSimilar: "Block Similar", follow: "+ Follow", followingBtn: "Following",
      step1Badge: "1. Language", step2Badge: "2. Sign In / Sign Up", step3Badge: "3. Theme",
      step1Title: "Choose Your Language First",
      step1Sub: "Select your preferred language before signing in or creating an account.",
      nextToLogin: "Continue to Login / Sign Up →",
      changeLang: "Change Language",
      step2Title: "Sign In or Create Account",
      step2Sub: "Use Google or Email to set up your Channel and join MiniTube X.",
      step3Title: "Choose Your Theme",
      step3Sub: "Click any theme below for a live preview, then enter the main page.",
      enterHome: "Enter Main Page →"
    },
    jv: {
      search: "Golek", notif: "Kabar", saved: "Disimpen", channel: "Channel", settings: "Setelan",
      logout: "Metu", forYou: "Kanggo Sampeyan", following: "Ngetutake", latest: "Anyar", blocked: "Diblokir",
      like: "Seneng", comment: "Komentar", share: "Bagi", save: "Simpen", savedDone: "Kesimpen",
      blockSimilar: "Blokir Sing Padha", follow: "+ Melu", followingBtn: "Melu",
      step1Badge: "1. Basa", step2Badge: "2. Mlebu / Daftar", step3Badge: "3. Tema",
      step1Title: "Pilih Basa Dhisik",
      step1Sub: "Pilih basa sing arep dienggo sadurunge mlebu utawa daftar akun.",
      nextToLogin: "Terusake menyang Login / Daftar →",
      changeLang: "Ganti Basa",
      step2Title: "Mlebu utawa Daftar Akun",
      step2Sub: "Nganggo Google utawa Email kanggo nggawe Channel.",
      step3Title: "Pilih Tema Tampilan",
      step3Sub: "Klik tema ing ngisor iki kanggo ndeleng langsung, banjur mlebu kaca utama.",
      enterHome: "Mlebu Kaca Utama →"
    },
    su: {
      search: "Teang", notif: "Bewara", saved: "Disimpen", channel: "Channel", settings: "Setelan",
      logout: "Kaluar", forYou: "Keur Anjeun", following: "Nuturkeun", latest: "Anyar", blocked: "Diblokir",
      like: "Resep", comment: "Koméntar", share: "Bagikeun", save: "Simpen", savedDone: "Kasimpen",
      blockSimilar: "Blokir Nu Sarua", follow: "+ Tuturkeun", followingBtn: "Nuturkeun",
      step1Badge: "1. Basa", step2Badge: "2. Asup / Daptar", step3Badge: "3. Téma",
      step1Title: "Pilih Basa Heula",
      step1Sub: "Pilih basa anu hoyong dianggo sateuacan asup atanapi daptar akun.",
      nextToLogin: "Lanjut ka Login / Daptar →",
      changeLang: "Ganti Basa",
      step2Title: "Asup atanapi Daptar Akun",
      step2Sub: "Anggo Google atanapi Email kanggo ngadamel Channel.",
      step3Title: "Pilih Téma Tampilan",
      step3Sub: "Klik téma di handap pikeun ningali langsung, teras lebet ka kaca utama.",
      enterHome: "Lebet ka Kaca Utama →"
    },
    ja: {
      search: "検索", notif: "通知", saved: "保存済み", channel: "チャンネル", settings: "設定",
      logout: "ログアウト", forYou: "おすすめ", following: "フォロー中", latest: "最新", blocked: "ブロック中",
      like: "いいね", comment: "コメント", share: "共有", save: "保存", savedDone: "保存済み",
      blockSimilar: "類似をブロック", follow: "+ フォロー", followingBtn: "フォロー中",
      step1Badge: "1. 言語", step2Badge: "2. ログイン/登録", step3Badge: "3. テーマ",
      step1Title: "最初に言語を選択してください",
      step1Sub: "ログインまたはアカウント登録の前に使用する言語を選択します。",
      nextToLogin: "ログイン / 登録へ進む →",
      changeLang: "言語を変更",
      step2Title: "ログインまたは新規登録",
      step2Sub: "Googleまたはメールでチャンネルを作成しましょう。",
      step3Title: "テーマを選択",
      step3Sub: "下のテーマをクリックしてプレビューし、メインページへ進みます。",
      enterHome: "メインページへ入る →"
    },
    ko: {
      search: "검색", notif: "알림", saved: "저장됨", channel: "채널", settings: "설정",
      logout: "로그아웃", forYou: "추천", following: "팔로잉", latest: "최신", blocked: "차단됨",
      like: "좋아요", comment: "댓글", share: "공유", save: "저장", savedDone: "저장됨",
      blockSimilar: "유사 콘텐츠 차단", follow: "+ 팔로우", followingBtn: "팔로잉",
      step1Badge: "1. 언어", step2Badge: "2. 로그인/가입", step3Badge: "3. 테마",
      step1Title: "먼저 언어를 선택하세요",
      step1Sub: "로그인 또는 회원가입 전에 사용할 언어를 선택하세요.",
      nextToLogin: "로그인 / 회원가입으로 이동 →",
      changeLang: "언어 변경",
      step2Title: "로그인 또는 계정 만들기",
      step2Sub: "Google 또는 이메일로 채널을 만들어 보세요.",
      step3Title: "테마 선택",
      step3Sub: "아래 테마를 클릭해 미리 본 후 메인 페이지로 이동하세요.",
      enterHome: "메인 페이지로 들어가기 →"
    },
    ar: {
      search: "بحث", notif: "الإشعارات", saved: "المحفوظات", channel: "القناة", settings: "الإعدادات",
      logout: "خروج", forYou: "لك", following: "أتابعهم", latest: "الأحدث", blocked: "محظور",
      like: "إعجاب", comment: "تعليق", share: "مشاركة", save: "حفظ", savedDone: "تم الحفظ",
      blockSimilar: "حظر المشابه", follow: "+ متابعة", followingBtn: "متابَع",
      step1Badge: "1. اللغة", step2Badge: "2. الدخول / التسجيل", step3Badge: "3. المظهر",
      step1Title: "اختر اللغة أولاً",
      step1Sub: "اختر لغتك المفضلة قبل تسجيل الدخول أو إنشاء حساب.",
      nextToLogin: "المتابعة إلى تسجيل الدخول ←",
      changeLang: "تغيير اللغة",
      step2Title: "تسجيل الدخول أو إنشاء حساب",
      step2Sub: "استخدم Google أو البريد الإلكتروني لإنشاء قناتك.",
      step3Title: "اختر مظهر التطبيق",
      step3Sub: "انقر على أي مظهر للمعاينة المباشرة ثم ادخل إلى الصفحة الرئيسية.",
      enterHome: "الدخول إلى الصفحة الرئيسية ←"
    },
    ru: {
      search: "Поиск", notif: "Уведомления", saved: "Сохранённое", channel: "Канал", settings: "Настройки",
      logout: "Выйти", forYou: "Для вас", following: "Подписки", latest: "Новое", blocked: "Заблокировано",
      like: "Нравится", comment: "Комментарий", share: "Поделиться", save: "Сохранить", savedDone: "Сохранено",
      blockSimilar: "Скрыть похожее", follow: "+ Подписаться", followingBtn: "Вы подписаны",
      step1Badge: "1. Язык", step2Badge: "2. Вход / Регистрация", step3Badge: "3. Тема",
      step1Title: "Сначала выберите язык",
      step1Sub: "Выберите язык интерфейса перед входом или регистрацией.",
      nextToLogin: "Перейти ко входу / регистрации →",
      changeLang: "Сменить язык",
      step2Title: "Вход или регистрация",
      step2Sub: "Используйте Google или Email для создания канала.",
      step3Title: "Выберите тему оформления",
      step3Sub: "Нажмите на тему для предпросмотра, затем перейдите на главную.",
      enterHome: "Перейти на главную →"
    },
    es: {
      search: "Buscar", notif: "Notificaciones", saved: "Guardados", channel: "Canal", settings: "Ajustes",
      logout: "Salir", forYou: "Para ti", following: "Siguiendo", latest: "Recientes", blocked: "Bloqueados",
      like: "Me gusta", comment: "Comentar", share: "Compartir", save: "Guardar", savedDone: "Guardado",
      blockSimilar: "Bloquear similar", follow: "+ Seguir", followingBtn: "Siguiendo",
      step1Badge: "1. Idioma", step2Badge: "2. Entrar / Registro", step3Badge: "3. Tema",
      step1Title: "Primero elige tu idioma",
      step1Sub: "Selecciona tu idioma antes de iniciar sesión o registrarte.",
      nextToLogin: "Continuar a Iniciar sesión / Registro →",
      changeLang: "Cambiar idioma",
      step2Title: "Iniciar sesión o crear cuenta",
      step2Sub: "Usa Google o tu correo para crear tu canal.",
      step3Title: "Elige el tema visual",
      step3Sub: "Haz clic en un tema para previsualizarlo y entra a la página principal.",
      enterHome: "Entrar a la página principal →"
    }
  };

  function tr(key) {
    const dict = KAMUS_UI[bahasaAktif] || KAMUS_UI.id;
    return dict[key] || KAMUS_UI.id[key] || key;
  }

  function terapkanTema(kodeTema) {
    const valid = DAFTAR_TEMA.some((t) => t.id === kodeTema) ? kodeTema : "aero";
    temaAktif = valid;
    localStorage.setItem("mtx_theme", valid);
    document.documentElement.setAttribute("data-mtx-theme", valid);
  }
  terapkanTema(temaAktif);

  function setCookieGoogTrans(langCode) {
    const val = langCode === "id" ? "" : `/id/${langCode}`;
    const host = window.location.hostname;
    if (!val) {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      if (host) document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${host};`;
    } else {
      document.cookie = `googtrans=${val}; path=/;`;
      if (host && host !== "localhost") {
        document.cookie = `googtrans=${val}; path=/; domain=.${host};`;
      }
    }
  }

  function muatMesinTerjemahDunia() {
    if (document.getElementById("mtx-google-translate-script")) return;
    if (!document.getElementById("google_translate_element")) {
      const hiddenHolder = document.createElement("div");
      hiddenHolder.id = "google_translate_element";
      hiddenHolder.style.display = "none";
      document.body.appendChild(hiddenHolder);
    }

    window.mtxGoogleTranslateInit = function () {
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: "id",
          autoDisplay: false
        }, "google_translate_element");
      } catch (e) {}
    };

    const s = document.createElement("script");
    s.id = "mtx-google-translate-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=mtxGoogleTranslateInit";
    s.async = true;
    document.head.appendChild(s);
  }

  function terapkanBahasa(langCode, triggerLateCheck) {
    bahasaAktif = langCode || "id";
    localStorage.setItem("mtx_lang", bahasaAktif);
    document.documentElement.lang = bahasaAktif;
    document.documentElement.dir = RTL_LANGS.has(bahasaAktif) ? "rtl" : "ltr";

    setCookieGoogTrans(bahasaAktif);
    if (bahasaAktif !== "id") {
      muatMesinTerjemahDunia();
    }

    const tabMap = {
      "tab-search": tr("search"),
      "tab-saved": tr("saved"),
      "tab-channel": tr("channel"),
      "tab-settings": tr("settings")
    };
    Object.keys(tabMap).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = tabMap[id];
    });
    updateBadgeNotif();
    pasangInfoHeader();
    pasangBarAlgoritmaFeed();
    pasangKontrolSemua(true);
    if (document.getElementById("mtx-auth-gate")?.style.display === "flex") {
      renderGateStep();
    }

    const combo = document.querySelector(".goog-te-combo");
    if (combo) {
      combo.value = bahasaAktif === "id" ? "" : bahasaAktif;
      combo.dispatchEvent(new Event("change"));
    } else if (triggerLateCheck && bahasaAktif !== "id") {
      setTimeout(() => {
        const comboLate = document.querySelector(".goog-te-combo");
        if (comboLate) {
          comboLate.value = bahasaAktif;
          comboLate.dispatchEvent(new Event("change"));
        }
      }, 1200);
    }
  }

  if (bahasaAktif !== "id") {
    setCookieGoogTrans(bahasaAktif);
    document.documentElement.lang = bahasaAktif;
    document.documentElement.dir = RTL_LANGS.has(bahasaAktif) ? "rtl" : "ltr";
    window.addEventListener("load", muatMesinTerjemahDunia);
  }

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
    if (isFollowing) skor += 35;

    const em = (post.email || "").toLowerCase();
    if (em && store.creators[em]) skor += store.creators[em];

    const postKws = ekstrakKataKunciPost(post);
    postKws.forEach((kw) => {
      if (store.keywords[kw]) skor += store.keywords[kw];
    });

    const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
    const commCount  = Array.isArray(post.comments) ? post.comments.length : 0;
    skor += likesCount * 3 + commCount * 5;

    const umurJam = Math.max(0, (Date.now() / 1000 - (post.dibuatPada || 0)) / 3600);
    skor += Math.max(0, 30 - umurJam * 1.4);

    return skor;
  }

  function terapkanFilterDanAlgoritma(rawPosts) {
    if (!Array.isArray(rawPosts)) return [];
    const profilSaya = getProfilSaya();
    const myEmail = userAktif ? userAktif.email.toLowerCase() : "";

    let hasil = rawPosts.filter((p) => !cekPostDiblokir(p, profilSaya));

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

  // 1. CSS Multi-Theme Variables + Frutiger Aero Lengkap
  const style = document.createElement("style");
  style.textContent = `
    :root, [data-mtx-theme="aero"] {
      --mtx-card-bg: linear-gradient(135deg, rgba(240,250,255,0.94), rgba(205,238,255,0.9));
      --mtx-surface: rgba(255,255,255,0.88);
      --mtx-border: #ffffff;
      --mtx-accent-border: #90e0ef;
      --mtx-text-main: #083d63;
      --mtx-text-sub: #3d6e8c;
      --mtx-btn-bg: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(220,244,255,0.92) 100%);
      --mtx-btn-text: #0a466b;
      --mtx-primary-bg: linear-gradient(180deg, #48cae4 0%, #0077b6 100%);
    }

    [data-mtx-theme="win7-dark"] {
      --mtx-card-bg: linear-gradient(135deg, rgba(16, 33, 54, 0.92), rgba(10, 22, 38, 0.94));
      --mtx-surface: rgba(22, 43, 68, 0.9);
      --mtx-border: rgba(114, 214, 255, 0.45);
      --mtx-accent-border: #2a6f97;
      --mtx-text-main: #e6f6ff;
      --mtx-text-sub: #90cce8;
      --mtx-btn-bg: linear-gradient(180deg, #1d3c5e 0%, #122842 100%);
      --mtx-btn-text: #dff4ff;
      --mtx-primary-bg: linear-gradient(180deg, #0096c7 0%, #023e8a 100%);
    }
    [data-mtx-theme="win7-dark"] body {
      background: radial-gradient(circle at top, #143659 0%, #071322 100%) !important;
      color: #e6f6ff !important;
    }
    [data-mtx-theme="win7-dark"] .aero-navbar,
    [data-mtx-theme="win7-dark"] .aero-tabs {
      background: linear-gradient(180deg, rgba(20,44,72,0.92), rgba(11,26,44,0.94)) !important;
      border-color: rgba(114, 214, 255, 0.4) !important;
      color: #e6f6ff !important;
    }
    [data-mtx-theme="win7-dark"] .win7-window,
    [data-mtx-theme="win7-dark"] .post-card,
    [data-mtx-theme="win7-dark"] .video-card {
      background: linear-gradient(180deg, rgba(18,38,62,0.92), rgba(11,24,40,0.94)) !important;
      border-color: rgba(114, 214, 255, 0.35) !important;
      color: #e6f6ff !important;
    }
    [data-mtx-theme="win7-dark"] .aero-input {
      background: rgba(15, 32, 52, 0.95) !important;
      color: #e6f6ff !important;
      border-color: #2a6f97 !important;
    }

    [data-mtx-theme="frutiger-eco"] {
      --mtx-card-bg: linear-gradient(135deg, rgba(238,255,245,0.94), rgba(198,246,213,0.9));
      --mtx-surface: rgba(255,255,255,0.88);
      --mtx-border: #ffffff;
      --mtx-accent-border: #74c69d;
      --mtx-text-main: #134e32;
      --mtx-text-sub: #2d6a4f;
      --mtx-btn-bg: linear-gradient(180deg, #ffffff 0%, #d8f3dc 100%);
      --mtx-btn-text: #1b4332;
      --mtx-primary-bg: linear-gradient(180deg, #40916c 0%, #1b4332 100%);
    }
    [data-mtx-theme="frutiger-eco"] body {
      background: linear-gradient(135deg, #2ec4b6 0%, #52b788 55%, #b7e4c7 100%) !important;
    }
    [data-mtx-theme="frutiger-eco"] .aero-navbar,
    [data-mtx-theme="frutiger-eco"] .aero-tabs {
      background: linear-gradient(180deg, rgba(235,255,243,0.92), rgba(195,242,212,0.9)) !important;
    }

    [data-mtx-theme="retro-classic"] {
      --mtx-card-bg: #ece9d8;
      --mtx-surface: #ffffff;
      --mtx-border: #aca899;
      --mtx-accent-border: #0054e3;
      --mtx-text-main: #000000;
      --mtx-text-sub: #333333;
      --mtx-btn-bg: linear-gradient(180deg, #ffffff 0%, #e3dfd1 100%);
      --mtx-btn-text: #000000;
      --mtx-primary-bg: linear-gradient(180deg, #3c81f3 0%, #0054e3 100%);
    }
    [data-mtx-theme="retro-classic"] body,
    [data-mtx-theme="retro-classic"] button,
    [data-mtx-theme="retro-classic"] input,
    [data-mtx-theme="retro-classic"] select,
    [data-mtx-theme="retro-classic"] textarea {
      font-family: Tahoma, 'MS Sans Serif', Arial, sans-serif !important;
      border-radius: 4px !important;
    }
    [data-mtx-theme="retro-classic"] body {
      background: #3a6ea5 !important;
    }
    [data-mtx-theme="retro-classic"] .aero-navbar {
      background: linear-gradient(180deg, #0058e6 0%, #003ddc 100%) !important;
      color: #ffffff !important;
      border-bottom: 2px solid #002899 !important;
    }
    [data-mtx-theme="retro-classic"] .aero-tabs,
    [data-mtx-theme="retro-classic"] .win7-window,
    [data-mtx-theme="retro-classic"] .post-card,
    [data-mtx-theme="retro-classic"] .video-card {
      background: #ece9d8 !important;
      border: 2px outset #ffffff !important;
      color: #000000 !important;
      box-shadow: none !important;
    }

    [data-mtx-theme="pyroland"] {
      --mtx-card-bg: linear-gradient(135deg, rgba(255,242,248,0.95), rgba(255,218,236,0.92));
      --mtx-surface: rgba(255,255,255,0.9);
      --mtx-border: #ffffff;
      --mtx-accent-border: #ff8fab;
      --mtx-text-main: #6d1b46;
      --mtx-text-sub: #9e2a63;
      --mtx-btn-bg: linear-gradient(180deg, #ffffff 0%, #ffe5ec 100%);
      --mtx-btn-text: #80134b;
      --mtx-primary-bg: linear-gradient(180deg, #ff758f 0%, #c9184a 100%);
    }
    [data-mtx-theme="pyroland"] body {
      background: linear-gradient(135deg, #ff9ebb 0%, #ffc2d1 50%, #ffe5b4 100%) !important;
    }

    [data-mtx-theme="oled-black"] {
      --mtx-card-bg: #101216;
      --mtx-surface: #181b20;
      --mtx-border: #2a2f3a;
      --mtx-accent-border: #3b4252;
      --mtx-text-main: #f1f5f9;
      --mtx-text-sub: #94a3b8;
      --mtx-btn-bg: #1e2229;
      --mtx-btn-text: #e2e8f0;
      --mtx-primary-bg: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
    }
    [data-mtx-theme="oled-black"] body {
      background: #000000 !important;
      color: #f1f5f9 !important;
    }
    [data-mtx-theme="oled-black"] .aero-navbar,
    [data-mtx-theme="oled-black"] .aero-tabs,
    [data-mtx-theme="oled-black"] .win7-window,
    [data-mtx-theme="oled-black"] .post-card,
    [data-mtx-theme="oled-black"] .video-card {
      background: #0d0f12 !important;
      border-color: #262a33 !important;
      color: #f1f5f9 !important;
      box-shadow: none !important;
    }
    [data-mtx-theme="oled-black"] .aero-input {
      background: #161920 !important;
      color: #f1f5f9 !important;
      border-color: #2e3440 !important;
    }

    /* Sembunyikan toolbar Google Translate agar layout tetap bersih */
    .goog-te-banner-frame.skiptranslate,
    iframe.skiptranslate {
      display: none !important;
    }
    body {
      top: 0px !important;
    }

    #mtx-auth-gate {
      position: fixed; inset: 0; z-index: 10000;
      background: linear-gradient(135deg, rgba(12, 65, 110, 0.88), rgba(20, 125, 165, 0.85));
      backdrop-filter: blur(14px);
      display: flex; align-items: center; justify-content: center; padding: 14px;
      overflow-y: auto;
    }
    #mtx-auth-gate.theme-preview-mode {
      background: rgba(8, 36, 66, 0.45);
      backdrop-filter: blur(5px);
    }
    .mtx-auth-card {
      width: 100%; max-width: 470px; max-height: 92vh; overflow-y: auto;
      background: var(--mtx-card-bg);
      border: 1.5px solid var(--mtx-border); border-radius: 18px; padding: 18px 20px;
      box-shadow: 0 14px 36px rgba(0, 35, 70, 0.45);
      color: var(--mtx-text-main); text-align: center;
    }
    .mtx-wizard-steps {
      display: flex; justify-content: center; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;
    }
    .mtx-wizard-pill {
      padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;
      background: var(--mtx-surface); border: 1px solid var(--mtx-accent-border);
      color: var(--mtx-text-sub); opacity: 0.75;
    }
    .mtx-wizard-pill.active {
      background: var(--mtx-primary-bg); color: #ffffff; border-color: #ffffff; opacity: 1;
    }
    .mtx-wizard-pill.done {
      background: #2ec4b6; color: #ffffff; border-color: #ffffff; opacity: 0.95;
    }
    .mtx-auth-input {
      width: 100%; box-sizing: border-box; padding: 9px 12px; margin-bottom: 10px;
      border-radius: 10px; border: 1px solid var(--mtx-accent-border);
      background: var(--mtx-surface); color: var(--mtx-text-main);
      font-size: 13.5px; outline: none;
    }
    .mtx-btn-google {
      width: 100%; padding: 10px; border-radius: 11px; border: 1px solid var(--mtx-accent-border);
      background: var(--mtx-btn-bg);
      color: var(--mtx-btn-text); font-weight: 700; font-size: 13.5px; cursor: pointer;
      box-shadow: 0 3px 10px rgba(0, 75, 130, 0.15); margin-bottom: 10px;
    }
    .mtx-btn-email {
      width: 100%; padding: 10px; border-radius: 11px; border: none;
      background: var(--mtx-primary-bg);
      color: #fff; font-weight: 700; font-size: 13.5px; cursor: pointer;
    }
    .mtx-gate-lang-box {
      max-height: 220px; overflow-y: auto; display: grid;
      grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
      gap: 6px; margin-bottom: 12px; padding: 6px;
      background: rgba(128, 180, 210, 0.14); border-radius: 12px;
      border: 1px solid var(--mtx-accent-border);
    }
    .mtx-gate-theme-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
      gap: 8px; margin-bottom: 12px; max-height: 270px; overflow-y: auto; padding: 2px;
    }
    .mtx-user-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--mtx-surface); border: 1px solid var(--mtx-border);
      border-radius: 20px; padding: 3px 10px 3px 4px;
      font-size: 12px; font-weight: 700; color: var(--mtx-text-main); cursor: pointer;
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
      background: var(--mtx-surface); border: 1px solid var(--mtx-border);
      border-radius: 11px; padding: 6px 10px; margin-bottom: 8px;
    }
    .mtx-creator-info {
      display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left; min-width: 0;
    }
    .mtx-creator-info img {
      width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid #fff; flex-shrink: 0;
    }
    .mtx-btn-follow {
      background: var(--mtx-primary-bg);
      color: #fff; border: 1px solid #fff; border-radius: 12px;
      padding: 4px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .mtx-btn-follow.following {
      background: var(--mtx-btn-bg);
      color: var(--mtx-btn-text); border-color: var(--mtx-accent-border);
    }
    .mtx-social-bar {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center;
    }
    .mtx-act-btn {
      background: var(--mtx-btn-bg);
      border: 1px solid var(--mtx-accent-border); border-radius: 10px; padding: 5px 9px;
      font-size: 11.5px; font-weight: 700; color: var(--mtx-btn-text); cursor: pointer;
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
      opacity: 0.9;
    }
    .mtx-btn-hapus-card {
      background: linear-gradient(180deg, #ff6b6b, #c9184a);
      color: #fff; border: 1px solid #fff; border-radius: 10px;
      padding: 5px 9px; font-size: 11.5px; font-weight: 700; cursor: pointer;
    }
    .mtx-comment-box {
      margin-top: 8px; background: var(--mtx-surface);
      border: 1px solid var(--mtx-accent-border); border-radius: 11px; padding: 8px 10px;
      text-align: left; color: var(--mtx-text-main);
    }
    .mtx-comment-item {
      display: flex; gap: 8px; align-items: flex-start;
      padding: 6px 0; border-bottom: 1px solid rgba(142,202,230,0.35); font-size: 12px;
    }
    .mtx-comment-item.is-reply {
      margin-left: 18px; padding-left: 8px; border-left: 2px solid var(--mtx-accent-border);
    }
    .mtx-comment-item:last-child { border-bottom: none; }
    .mtx-comment-item img {
      width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-top: 2px; flex-shrink: 0;
    }
    .mtx-reply-link {
      background: none; border: none; color: #0096c7; font-size: 11px; font-weight: 700;
      cursor: pointer; padding: 2px 0 0; margin-top: 2px;
    }
    .mtx-reply-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(56, 182, 255, 0.16); border: 1px solid var(--mtx-accent-border); border-radius: 8px;
      padding: 4px 8px; font-size: 11.5px; color: var(--mtx-text-main); margin-bottom: 6px;
    }
    .mtx-channel-banner {
      background: var(--mtx-card-bg);
      border: 1.5px solid var(--mtx-border); border-radius: 16px; padding: 16px;
      box-shadow: 0 8px 24px rgba(0, 65, 115, 0.16); margin-bottom: 14px; color: var(--mtx-text-main);
    }
    .mtx-stat-chip {
      background: var(--mtx-surface); border: 1px solid var(--mtx-accent-border);
      border-radius: 10px; padding: 5px 10px; font-size: 12px; font-weight: 700; color: var(--mtx-text-main);
    }

    .mtx-algo-bar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
      background: var(--mtx-card-bg);
      border: 1.5px solid var(--mtx-border); border-radius: 14px; padding: 8px 12px; margin-bottom: 12px;
      box-shadow: 0 4px 14px rgba(0, 55, 100, 0.14);
    }

    .mtx-search-box-wrap {
      display: flex; gap: 8px; align-items: center; margin-bottom: 10px;
    }
    .mtx-search-input {
      flex: 1; padding: 10px 14px; border-radius: 12px;
      border: 1.5px solid var(--mtx-accent-border); background: var(--mtx-surface);
      font-size: 14px; color: var(--mtx-text-main); outline: none;
    }
    .mtx-filter-row {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between;
    }
    .mtx-filter-chips {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .mtx-chip-btn {
      padding: 5px 11px; border-radius: 13px; border: 1px solid var(--mtx-accent-border);
      background: var(--mtx-btn-bg); color: var(--mtx-btn-text);
      font-size: 11.5px; font-weight: 700; cursor: pointer;
    }
    .mtx-chip-btn.active {
      background: var(--mtx-primary-bg);
      color: #ffffff; border-color: #ffffff;
    }
    .mtx-sort-select {
      padding: 5px 10px; border-radius: 10px; border: 1px solid var(--mtx-accent-border);
      background: var(--mtx-surface); color: var(--mtx-text-main);
      font-size: 12px; font-weight: 700; outline: none; cursor: pointer;
    }
    .mtx-badge-tipe {
      display: inline-block; padding: 2px 8px; border-radius: 8px;
      background: var(--mtx-primary-bg);
      color: #ffffff; font-size: 10.5px; font-weight: 800;
    }
    .mtx-hl {
      background: #fff3b0; color: #052c47; padding: 0 3px; border-radius: 4px;
    }
    .mtx-ch-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px; margin-bottom: 14px;
    }
    .mtx-ch-mini-card {
      background: var(--mtx-surface); border: 1px solid var(--mtx-accent-border);
      border-radius: 14px; padding: 12px; display: flex; align-items: center;
      justify-content: space-between; gap: 10px; color: var(--mtx-text-main);
    }

    /* Pengaturan & Onboarding Theme/Language Cards */
    .mtx-theme-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 10px; margin-top: 10px;
    }
    .mtx-theme-card {
      background: var(--mtx-surface); border: 1.5px solid var(--mtx-accent-border);
      border-radius: 13px; padding: 10px; cursor: pointer; text-align: left;
      transition: transform 0.12s ease; color: var(--mtx-text-main);
    }
    .mtx-theme-card:hover { transform: translateY(-2px); }
    .mtx-theme-card.active {
      border: 2px solid #0096c7;
      box-shadow: 0 0 0 2px rgba(0, 150, 199, 0.28);
    }
    .mtx-theme-swatch {
      height: 26px; border-radius: 8px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.7);
    }
    .mtx-lang-list {
      max-height: 230px; overflow-y: auto; display: grid;
      grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
      gap: 6px; margin-top: 8px; padding: 4px;
      background: rgba(128, 180, 210, 0.12); border-radius: 11px;
    }
    .mtx-lang-item {
      padding: 7px 10px; border-radius: 9px; border: 1px solid var(--mtx-accent-border);
      background: var(--mtx-surface); color: var(--mtx-text-main);
      font-size: 12px; font-weight: 600; cursor: pointer; text-align: left;
    }
    .mtx-lang-item.active {
      background: var(--mtx-primary-bg); color: #ffffff; border-color: #ffffff; font-weight: 800;
    }
    .mtx-saved-mini-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: var(--mtx-surface); border: 1px solid var(--mtx-accent-border);
      border-radius: 11px; padding: 9px 11px; margin-bottom: 7px;
    }

    /* Notifikasi */
    .mtx-notif-item {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: var(--mtx-surface); border: 1px solid var(--mtx-accent-border);
      border-radius: 13px; padding: 11px 13px; margin-bottom: 8px; cursor: pointer;
      color: var(--mtx-text-main); text-align: left;
    }
    .mtx-notif-item.unread {
      border: 1.5px solid #38b6ff;
      box-shadow: 0 3px 10px rgba(0, 119, 182, 0.22);
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
      background: var(--mtx-card-bg);
      border: 1.5px solid var(--mtx-border); border-radius: 18px; padding: 16px;
      box-shadow: 0 14px 36px rgba(0, 25, 55, 0.45); color: var(--mtx-text-main);
    }

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
      background: var(--mtx-primary-bg); color: #fff;
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
      background: var(--mtx-card-bg);
      border: 1.5px solid var(--mtx-border); border-radius: 14px; padding: 10px;
      box-shadow: 0 10px 26px rgba(0, 25, 55, 0.5); color: var(--mtx-text-main); text-align: left;
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

  // 2. Onboarding Gate 3 Tahap:
  //    Tahap 1: Pilih Bahasa -> Tahap 2: Login / Daftar Akun -> Tahap 3: Pilih Tema -> Halaman Utama
  const gate = document.createElement("div");
  gate.id = "mtx-auth-gate";
  gate.innerHTML = `
    <div class="mtx-auth-card">
      <h2 style="margin:0 0 8px; font-size:20px;">MiniTube X</h2>
      <div class="mtx-wizard-steps" id="mtx-wizard-steps"></div>

      <!-- TAHAP 1: PILIH BAHASA DULU -->
      <div id="mtx-gate-step-lang">
        <div style="font-size:14.5px;font-weight:800;margin-bottom:3px;" id="mtx-s1-title"></div>
        <p style="margin:0 0 10px;font-size:12px;opacity:0.85;" id="mtx-s1-sub"></p>
        <input type="text" id="mtx-gate-lang-search" class="mtx-auth-input" placeholder="Cari bahasa dunia (Indonesia, English, 日本語, Jawa, Sunda, العربية)...">
        <div class="mtx-gate-lang-box" id="mtx-gate-lang-list"></div>
        <button type="button" id="mtx-gate-next-login" class="mtx-btn-email"></button>
      </div>

      <!-- TAHAP 2: LOGIN / DAFTAR AKUN -->
      <div id="mtx-gate-step-login" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--mtx-surface);border:1px solid var(--mtx-accent-border);border-radius:10px;padding:6px 10px;margin-bottom:10px;font-size:12px;">
          <span>Bahasa: <strong id="mtx-gate-chosen-lang"></strong></span>
          <button type="button" id="mtx-gate-back-lang" class="mtx-act-btn" style="padding:3px 9px;font-size:11px;"></button>
        </div>
        <div style="font-size:14.5px;font-weight:800;margin-bottom:3px;" id="mtx-s2-title"></div>
        <p style="margin:0 0 12px;font-size:12px;opacity:0.85;" id="mtx-s2-sub"></p>

        <button type="button" id="mtx-login-google" class="mtx-btn-google">Masuk Cepat dengan Google</button>
        <div style="font-size:11.5px; opacity:0.75; margin:8px 0;">atau pakai email apapun</div>
        <input type="text" id="mtx-reg-nama" class="mtx-auth-input" placeholder="Nama Channel kamu (khusus daftar baru)" style="display:none;">
        <input type="email" id="mtx-auth-email" class="mtx-auth-input" placeholder="Alamat email kamu (contoh: nama@gmail.com)">
        <input type="password" id="mtx-auth-pass" class="mtx-auth-input" placeholder="Password (minimal 6 karakter)">
        <button type="button" id="mtx-submit-email" class="mtx-btn-email">Masuk dengan Email</button>
        <p style="margin:10px 0 0; font-size:12px;">
          <span id="mtx-toggle-text">Belum punya akun email?</span>
          <a href="#" id="mtx-toggle-mode" style="color:#0096c7; font-weight:700;">Daftar Baru</a>
        </p>
      </div>

      <!-- TAHAP 2B: VERIFIKASI EMAIL -->
      <div id="mtx-gate-step-verif" style="display:none;">
        <p style="font-size:13px; line-height:1.5; margin:0 0 12px;">
          Link verifikasi sudah dikirim ke <strong id="mtx-verif-email"></strong>.<br>
          Buka inbox (atau folder Spam) email kamu lalu klik link-nya.
        </p>
        <button type="button" id="mtx-cek-verif" class="mtx-btn-email" style="margin-bottom:8px;">Saya Sudah Klik Link (Lanjut Pilih Tema)</button>
        <button type="button" id="mtx-kirim-ulang" class="mtx-btn-google" style="margin-bottom:8px; font-size:12.5px;">Kirim Ulang Link Verifikasi</button>
        <a href="#" id="mtx-logout-verif" style="font-size:12px; color:#c9184a; font-weight:600;">Ganti Akun / Kembali</a>
      </div>

      <!-- TAHAP 3: PILIH TEMA SETELAH LOGIN -->
      <div id="mtx-gate-step-theme" style="display:none;">
        <div style="font-size:14.5px;font-weight:800;margin-bottom:3px;" id="mtx-s3-title"></div>
        <p style="margin:0 0 10px;font-size:12px;opacity:0.85;" id="mtx-s3-sub"></p>
        <div class="mtx-gate-theme-grid" id="mtx-gate-theme-list"></div>
        <button type="button" id="mtx-gate-finish-theme" class="mtx-btn-email"></button>
      </div>

      <div id="mtx-auth-err" style="margin-top:10px; font-size:12px; color:#c9184a; font-weight:600;"></div>
    </div>
  `;
  document.body.appendChild(gate);

  let modeDaftar = false;
  const errBox = document.getElementById("mtx-auth-err");

  function renderGateLanguageList() {
    const listBox = document.getElementById("mtx-gate-lang-list");
    if (!listBox) return;
    const q = gateLangQuery.trim().toLowerCase();
    const tersaring = SEMUA_BAHASA_DUNIA.filter(([kode, nama]) => {
      if (!q) return true;
      return kode.toLowerCase().includes(q) || nama.toLowerCase().includes(q);
    });

    listBox.innerHTML = tersaring.map(([kode, nama]) => `
      <button type="button" data-gate-lang="${kode}" class="mtx-lang-item ${bahasaAktif === kode ? "active" : ""}">
        ${esc(nama)} ${bahasaAktif === kode ? "✓" : ""}
      </button>
    `).join("");

    listBox.querySelectorAll("[data-gate-lang]").forEach((btn) => {
      btn.onclick = () => {
        const kode = btn.getAttribute("data-gate-lang");
        terapkanBahasa(kode, true);
        renderGateLanguageList();
      };
    });
  }

  function renderGateThemeList() {
    const themeBox = document.getElementById("mtx-gate-theme-list");
    if (!themeBox) return;
    themeBox.innerHTML = DAFTAR_TEMA.map((t) => `
      <div data-gate-theme="${t.id}" class="mtx-theme-card ${temaAktif === t.id ? "active" : ""}">
        <div class="mtx-theme-swatch" style="background:${t.preview};"></div>
        <div style="font-size:12.5px;font-weight:800;">${esc(t.nama)} ${temaAktif === t.id ? "✓" : ""}</div>
        <div style="font-size:11px;opacity:0.8;margin-top:2px;">${esc(t.desc)}</div>
      </div>
    `).join("");

    themeBox.querySelectorAll("[data-gate-theme]").forEach((card) => {
      card.onclick = () => {
        const tId = card.getAttribute("data-gate-theme");
        terapkanTema(tId);
        renderGateThemeList();
      };
    });
  }

  function renderGateStep() {
    const stepsWrap = document.getElementById("mtx-wizard-steps");
    if (stepsWrap) {
      const s1Class = gateStep === "lang" ? "active" : "done";
      const s2Class = (gateStep === "login" || gateStep === "verif") ? "active" : (gateStep === "theme" ? "done" : "");
      const s3Class = gateStep === "theme" ? "active" : "";
      stepsWrap.innerHTML = `
        <span class="mtx-wizard-pill ${s1Class}">${esc(tr("step1Badge"))}</span>
        <span class="mtx-wizard-pill ${s2Class}">${esc(tr("step2Badge"))}</span>
        <span class="mtx-wizard-pill ${s3Class}">${esc(tr("step3Badge"))}</span>
      `;
    }

    if (gateStep === "theme") {
      gate.classList.add("theme-preview-mode");
    } else {
      gate.classList.remove("theme-preview-mode");
    }

    document.getElementById("mtx-gate-step-lang").style.display  = gateStep === "lang" ? "block" : "none";
    document.getElementById("mtx-gate-step-login").style.display = gateStep === "login" ? "block" : "none";
    document.getElementById("mtx-gate-step-verif").style.display = gateStep === "verif" ? "block" : "none";
    document.getElementById("mtx-gate-step-theme").style.display = gateStep === "theme" ? "block" : "none";

    document.getElementById("mtx-s1-title").textContent = tr("step1Title");
    document.getElementById("mtx-s1-sub").textContent = tr("step1Sub");
    document.getElementById("mtx-gate-next-login").textContent = tr("nextToLogin");

    const langObj = SEMUA_BAHASA_DUNIA.find(([k]) => k === bahasaAktif) || ["id", "Bahasa Indonesia"];
    document.getElementById("mtx-gate-chosen-lang").textContent = langObj[1];
    document.getElementById("mtx-gate-back-lang").textContent = tr("changeLang");
    document.getElementById("mtx-s2-title").textContent = tr("step2Title");
    document.getElementById("mtx-s2-sub").textContent = tr("step2Sub");

    document.getElementById("mtx-s3-title").textContent = tr("step3Title");
    document.getElementById("mtx-s3-sub").textContent = tr("step3Sub");
    document.getElementById("mtx-gate-finish-theme").textContent = tr("enterHome");

    if (gateStep === "lang") renderGateLanguageList();
    if (gateStep === "theme") renderGateThemeList();
  }

  document.getElementById("mtx-gate-lang-search").oninput = (e) => {
    gateLangQuery = e.target.value;
    renderGateLanguageList();
  };

  document.getElementById("mtx-gate-next-login").onclick = () => {
    errBox.textContent = "";
    gateStep = "login";
    renderGateStep();
  };

  document.getElementById("mtx-gate-back-lang").onclick = () => {
    errBox.textContent = "";
    gateStep = "lang";
    renderGateStep();
  };

  document.getElementById("mtx-gate-finish-theme").onclick = () => {
    if (userAktif) {
      localStorage.setItem(`mtx_theme_onboarded_${userAktif.email.toLowerCase()}`, "1");
    }
    gate.style.display = "none";
    gate.classList.remove("theme-preview-mode");
    if (typeof renderSemuaTab === "function") renderSemuaTab();
    const tObj = DAFTAR_TEMA.find((x) => x.id === temaAktif);
    tampilkanToast(`Selamat datang di MiniTube X! Tema aktif: ${tObj ? tObj.nama : temaAktif}`);
  };

  renderGateStep();

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
    gateStep = "lang";
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
    btnNotif.textContent = unread > 0 ? `${tr("notif")} (${unread})` : tr("notif");
  }

  // 3. Tambahkan Tab "Cari", "Notifikasi", "Disimpan", "Channel", dan "Pengaturan"
  function pasangTabSosial() {
    const navTabs = document.querySelector(".aero-tabs");
    const mainEl  = document.querySelector(".main-container");
    if (!navTabs || !mainEl) return;

    const tabsBaru = [
      { id: "tab-search",   label: tr("search"),   action: () => bukaTabKhusus("search") },
      { id: "tab-notif",    label: tr("notif"),    action: () => bukaTabKhusus("notif") },
      { id: "tab-saved",    label: tr("saved"),    action: () => bukaTabKhusus("saved") },
      {
        id: "tab-channel",
        label: tr("channel"),
        action: () => {
          channelSedangDilihat = userAktif ? userAktif.email.toLowerCase() : null;
          bukaTabKhusus("channel");
        }
      },
      { id: "tab-settings", label: tr("settings"), action: () => bukaTabKhusus("settings") }
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

    ["view-search", "view-notif", "view-saved", "view-channel", "view-settings"].forEach((vidId) => {
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
    ["view-feed", "view-video", "view-short", "view-search", "view-notif", "view-saved", "view-channel", "view-settings"].forEach((id) => {
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
    } else if (namaTab === "settings") {
      document.getElementById("view-settings")?.classList.remove("hidden");
      document.getElementById("tab-settings")?.classList.add("active");
      renderHalamanPengaturan();
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    if (["tab-feed", "tab-video", "tab-short"].includes(btn.id)) {
      komenTerbuka.clear();
      ["view-search", "view-notif", "view-saved", "view-channel", "view-settings"].forEach((id) => document.getElementById(id)?.classList.add("hidden"));
      ["tab-search", "tab-notif", "tab-saved", "tab-channel", "tab-settings"].forEach((id) => document.getElementById(id)?.classList.remove("active"));
      setTimeout(() => {
        pasangBarAlgoritmaFeed();
        pasangKontrolSemua(true);
        updatePemutarUtamaSocial(true);
      }, 80);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && userAktif && gate.style.display === "none") {
      const aktif = document.activeElement;
      if (!aktif || !["INPUT", "TEXTAREA", "SELECT"].includes(aktif.tagName)) {
        e.preventDefault();
        bukaTabKhusus("search");
        setTimeout(() => document.getElementById("mtx-search-input")?.focus(), 40);
      }
    }
  });

  function keluarDariAkun() {
    if (userAktif && userAktif.email) {
      localStorage.removeItem(`mtx_theme_onboarded_${userAktif.email.toLowerCase()}`);
    }
    gateStep = "lang";
    auth.signOut();
  }

  // 4. Header Pill Profil, Tombol Pengaturan, & Keluar
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

    const btnSet = document.createElement("button");
    btnSet.type = "button";
    btnSet.className = "win7-btn";
    btnSet.textContent = tr("settings");
    btnSet.onclick = () => {
      komenTerbuka.clear();
      bukaTabKhusus("settings");
    };
    wrap.appendChild(btnSet);

    const btnOut = document.createElement("button");
    btnOut.type = "button";
    btnOut.className = "win7-btn";
    btnOut.textContent = tr("logout");
    btnOut.onclick = () => {
      if (confirm("Keluar dari akun MiniTube X?")) keluarDariAkun();
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
          if (!document.getElementById("view-settings")?.classList.contains("hidden")) renderHalamanPengaturan();
        }
      }
    } catch (e) {}
  }

  async function terapkanStatusUser(user) {
    errBox.textContent = "";
    if (!user) {
      userAktif = null;
      gate.style.display = "flex";
      if (gateStep !== "lang" && gateStep !== "login") {
        gateStep = "lang";
      }
      renderGateStep();
      return;
    }

    if (!user.emailVerified) {
      userAktif = null;
      gate.style.display = "flex";
      gateStep = "verif";
      document.getElementById("mtx-verif-email").textContent = user.email;
      renderGateStep();
      return;
    }

    userAktif = user;
    const themeOnboardKey = `mtx_theme_onboarded_${user.email.toLowerCase()}`;
    const sudahPilihTema = localStorage.getItem(themeOnboardKey) === "1";

    pasangTabSosial();
    kunciInputNama();
    pasangInfoHeader();
    await muatDataChannel();

    if (!sudahPilihTema) {
      // Tahap 3: Habis login wajib pilih tema dulu sebelum masuk halaman utama
      gate.style.display = "flex";
      gateStep = "theme";
      renderGateStep();
      if (typeof renderSemuaTab === "function") renderSemuaTab();
    } else {
      gate.style.display = "none";
      gate.classList.remove("theme-preview-mode");
      if (typeof renderSemuaTab === "function") renderSemuaTab();
    }
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
      body: JSON.stringify(payload || {})
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
        if (!document.getElementById("view-settings")?.classList.contains("hidden")) renderHalamanPengaturan();
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

  function bukaModalBlokir() {
    const lama = document.getElementById("mtx-modal-blokir");
    if (lama) lama.remove();

    const profilSaya = getProfilSaya();
    const blkPosts = Array.isArray(profilSaya?.blockedPosts) ? profilSaya.blockedPosts : [];
    const blkKeywords = Array.isArray(profilSaya?.blockedKeywords) ? profilSaya.blockedKeywords : [];

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
      ? `<p style="font-size:13px;opacity:0.8;text-align:center;padding:16px 0;">Tidak ada video atau topik yang sedang diblokir.</p>`
      : daftarGrup.map((g, idx) => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--mtx-surface);border:1px solid var(--mtx-accent-border);border-radius:12px;padding:10px 12px;margin-bottom:8px;">
            <div style="min-width:0;">
              <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(g.title)}</div>
              <div style="font-size:11px;opacity:0.75;">Kata kunci serupa: ${g.keywords.length ? esc(g.keywords.join(", ")) : "Hanya item ini"}</div>
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
        <p style="font-size:12px;opacity:0.85;margin:0 0 12px;">
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
      { id: "algoritma", label: tr("forYou") },
      { id: "mengikuti", label: tr("following") },
      { id: "terbaru",   label: tr("latest") }
    ];

    bar.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        ${modes.map((m) => `
          <button type="button" data-feed-mode="${m.id}" class="mtx-chip-btn ${modeFeed === m.id ? "active" : ""}">${m.label}</button>
        `).join("")}
      </div>
      <button type="button" id="mtx-open-blokir" class="mtx-chip-btn">${tr("blocked")} (${jmlBlokir})</button>
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
              <div style="font-size:11px;opacity:0.75;">${formatWaktuSingkat(post.dibuatPada)}</div>
            </div>
          </div>
          <button type="button" id="mtx-close-spot" class="win7-btn">Tutup</button>
        </div>
        <div style="font-size:13.5px;line-height:1.45;">${esc(post.teks || "")}</div>
        ${mediaHtml}
        <div class="mtx-social-bar" style="margin-top:10px;">
          <button type="button" id="mtx-spot-like" class="mtx-act-btn ${sudahLike ? "liked" : ""}">${sudahLike ? "♥" : "♡"} ${tr("like")} (${likes.length})</button>
          <button type="button" id="mtx-spot-save" class="mtx-act-btn ${sudahSave ? "saved" : ""}">${sudahSave ? tr("savedDone") : tr("save")}</button>
          <button type="button" id="mtx-spot-share" class="mtx-act-btn">${tr("share")}</button>
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

  function buatDrawerKomentar(post, isShortsOverlay, onAfterSubmit) {
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const box = document.createElement("div");
    box.className = isShortsOverlay ? "mtx-shorts-drawer" : "mtx-comment-box";
    box.onclick = (e) => e.stopPropagation();

    const headerHtml = isShortsOverlay
      ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:12px;font-weight:700;">
           <span>${tr("comment")} (${comments.length})</span>
           <button type="button" class="mtx-close-short-komen" style="border:none;background:rgba(255,255,255,0.85);border-radius:50%;width:22px;height:22px;cursor:pointer;font-weight:bold;">x</button>
         </div>`
      : "";

    const listKomenHtml = comments.length === 0
      ? `<div style="font-size:11.5px;opacity:0.75;margin-bottom:6px;">Belum ada komentar.</div>`
      : comments.map((c, idx) => {
          const cProf = daftarChannelCache.find((u) => u.email === (c.email || "").toLowerCase());
          const cNama = cProf ? cProf.nama : c.nama;
          const cFoto = cProf ? cProf.foto : c.foto;
          const replyTag = c.replyToNama
            ? `<span style="font-size:10.5px;color:#0096c7;font-weight:700;">↳ membalas @${esc(c.replyToNama)}</span><br>`
            : "";
          return `
            <div class="mtx-comment-item ${c.replyToNama ? "is-reply" : ""}">
              <img src="${resolveAvatarUrl(cFoto, cNama)}" data-fallback-nama="${esc(cNama)}">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                  <strong>${esc(cNama)}</strong>
                  <span style="font-size:10px;opacity:0.7;">${formatWaktuSingkat(c.waktu)}</span>
                </div>
                ${replyTag}
                <span style="word-break:break-word;">${esc(c.teks)}</span><br>
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
            <div style="font-size:12.5px;font-weight:700;">${esc(chNama)}</div>
            <div style="font-size:11px;opacity:0.75;">${chFollowers.length} Pengikut</div>
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
        btnFollow.textContent = sudahFollow ? tr("followingBtn") : tr("follow");
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
      btnLike.textContent = `${sudahLike ? "♥" : "♡"} ${tr("like")} (${likes.length})`;
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
      btnKomen.textContent = `${tr("comment")} (${comments.length})`;
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
      btnShare.textContent = tr("share");
      btnShare.onclick = (e) => {
        e.stopPropagation();
        catatSinyalAlgoritma(post, 6);
        bagikanPostingan(post);
      };
      bar.appendChild(btnShare);

      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
      btnSave.textContent = sudahSave ? tr("savedDone") : tr("save");
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
      btnBlock.textContent = tr("blockSimilar");
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
      btnShare.innerHTML = `<span>${tr("share")}</span>`;
      btnShare.onclick = (e) => {
        e.stopPropagation();
        bagikanPostingan(post);
      };
      dock.appendChild(btnShare);

      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-short-pill-btn" + (sudahSave ? " saved" : "");
      btnSave.innerHTML = `<span>${sudahSave ? tr("savedDone") : tr("save")}</span>`;
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

  // 7C. Pemutar Video Utama
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
      catatSinyalAlgoritma(post, 5);
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
          <div style="font-size:13px;font-weight:800;">${esc(chNama)}</div>
          <div style="font-size:11px;opacity:0.75;">${chFollowers.length} Pengikut</div>
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
      btnFollow.textContent = sudahFollow ? tr("followingBtn") : tr("follow");
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
    btnLike.textContent = `${sudahLike ? "♥" : "♡"} ${tr("like")} (${likes.length})`;
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
    btnShare.textContent = tr("share");
    btnShare.onclick = () => bagikanPostingan(post);
    bar.appendChild(btnShare);

    const btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
    btnSave.textContent = sudahSave ? tr("savedDone") : tr("save");
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
    btnBlock.textContent = tr("blockSimilar");
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
    labelKomen.style.cssText = "font-size:12px;font-weight:700;margin-top:10px;";
    labelKomen.textContent = `${tr("comment")} (${comments.length})`;
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

  // 8. Halaman Pengaturan (Kontrol Akun, Saved, Ganti Tema, & Semua Bahasa Dunia)
  function renderHalamanPengaturan() {
    const wadah = document.getElementById("view-settings");
    if (!wadah || !userAktif) return;

    const profilSaya = getProfilSaya();
    const myEmail = userAktif.email.toLowerCase();
    const savedIds = Array.isArray(profilSaya?.saved) ? profilSaya.saved : [];
    const daftarTersimpan = daftarPostCache.filter((p) => savedIds.includes(p.id));
    const jmlBlokir = Array.isArray(profilSaya?.blockedPosts) ? profilSaya.blockedPosts.length : 0;

    const providerIds = (userAktif.providerData || []).map((p) => p.providerId);
    const pakaiPassword = providerIds.includes("password");
    const metodeLoginLabel = providerIds.includes("google.com")
      ? (pakaiPassword ? "Google & Email/Password" : "Akun Google")
      : "Email & Password";

    const qLang = cariBahasaQuery.trim().toLowerCase();
    const bahasaTersaring = SEMUA_BAHASA_DUNIA.filter(([kode, nama]) => {
      if (!qLang) return true;
      return kode.toLowerCase().includes(qLang) || nama.toLowerCase().includes(qLang);
    });

    const bahasaAktifObj = SEMUA_BAHASA_DUNIA.find(([k]) => k === bahasaAktif) || ["id", "Bahasa Indonesia"];

    const savedListHtml = daftarTersimpan.length === 0
      ? `<p style="font-size:12.5px;opacity:0.75;margin:6px 0;">Belum ada postingan atau video yang kamu simpan.</p>`
      : daftarTersimpan.map((p) => {
          const jenisLabel = p.tipe === "video" ? "VIDEO" : (p.tipe === "short" ? "SHORTS" : (p.jenisMedia === "image" ? "FOTO" : "TEKS"));
          return `
            <div class="mtx-saved-mini-row">
              <div style="min-width:0;flex:1;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span class="mtx-badge-tipe">${jenisLabel}</span>
                  <strong style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.channelNama || p.penulis)}</strong>
                </div>
                <div style="font-size:12px;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;">${esc(p.teks || p.file || "(Tanpa caption)")}</div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0;">
                <button type="button" data-set-open-post="${p.id}" class="mtx-act-btn">Buka</button>
                <button type="button" data-set-unsave="${p.id}" class="mtx-act-btn saved">Hapus</button>
              </div>
            </div>
          `;
        }).join("");

    wadah.innerHTML = `
      <div class="mtx-channel-banner">
        <h2 style="margin:0 0 4px;font-size:18px;">Pengaturan MiniTube X</h2>
        <p style="margin:0;font-size:12.5px;opacity:0.8;">Kelola kontrol akun, konten tersimpan, tema antarmuka, dan bahasa dunia.</p>
      </div>

      <!-- BAGIAN 1: KONTROL AKUN & PROFIL -->
      <div class="mtx-channel-banner">
        <h3 style="margin:0 0 10px;font-size:15.5px;">1. Kontrol Akun & Profil Channel</h3>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:var(--mtx-surface);border:1px solid var(--mtx-accent-border);border-radius:13px;padding:12px;margin-bottom:12px;">
          <img src="${resolveAvatarUrl(profilSaya.foto, profilSaya.nama)}" data-fallback-nama="${esc(profilSaya.nama)}" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid #fff;">
          <div style="flex:1;min-width:190px;">
            <div style="font-size:15px;font-weight:800;">${esc(profilSaya.nama)} ${isAdmin() ? '<span class="mtx-admin-tag">ADMIN</span>' : ""}</div>
            <div style="font-size:12px;opacity:0.8;">${esc(myEmail)}</div>
            <div style="font-size:11.5px;opacity:0.75;margin-top:2px;">Metode Masuk: <strong>${esc(metodeLoginLabel)}</strong> • Status: <strong>Terverifikasi</strong></div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Nama Channel:</label>
          <input type="text" id="mtx-set-nama" class="mtx-auth-input" maxlength="32" value="${esc(profilSaya.nama)}">
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Bio Singkat:</label>
          <input type="text" id="mtx-set-bio" class="mtx-auth-input" maxlength="140" value="${esc(profilSaya.bio || "")}">
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Foto Profil Baru (Opsional):</label>
          <input type="file" id="mtx-set-foto" accept="image/*" style="margin-bottom:10px;font-size:12px;">
          <button type="button" id="mtx-set-save-profile" class="win7-btn win7-btn-primary">Simpan Profil Akun</button>
        </div>

        <div style="padding-top:12px;border-top:1px solid var(--mtx-accent-border);margin-bottom:12px;">
          <div style="font-size:13px;font-weight:800;margin-bottom:6px;">Keamanan & Kata Sandi</div>
          ${pakaiPassword ? `
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
              <input type="password" id="mtx-set-newpass" class="mtx-auth-input" placeholder="Password baru (minimal 6 karakter)" style="flex:1;min-width:200px;margin:0;">
              <button type="button" id="mtx-set-btn-pass" class="win7-btn win7-btn-primary">Ubah Password</button>
            </div>
          ` : `<p style="font-size:12px;opacity:0.8;margin:0 0 8px;">Kamu masuk menggunakan <strong>Google</strong>, sehingga password dikelola langsung oleh keamanan akun Google kamu.</p>`}
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button type="button" id="mtx-set-reset-email" class="win7-btn">Kirim Link Reset Password ke Email</button>
            <button type="button" id="mtx-set-export-json" class="win7-btn">Unduh Backup Data Akun (.json)</button>
          </div>
        </div>

        <div style="padding-top:12px;border-top:1px solid var(--mtx-accent-border);">
          <div style="font-size:13px;font-weight:800;margin-bottom:6px;">Privasi, Algoritma & Sesi</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button type="button" id="mtx-set-manage-block" class="win7-btn">Konten Diblokir (${jmlBlokir})</button>
            <button type="button" id="mtx-set-reset-algo" class="win7-btn">Reset Algoritma Rekomendasi</button>
            <button type="button" id="mtx-set-logout" class="win7-btn">Keluar dari Akun</button>
            <button type="button" id="mtx-set-delete-account" class="mtx-btn-hapus-card">Hapus Akun Permanen</button>
          </div>
        </div>
      </div>

      <!-- BAGIAN 2: YANG DISIMPAN -->
      <div class="mtx-channel-banner">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
          <h3 style="margin:0;font-size:15.5px;">2. Postingan & Video Disimpan (${daftarTersimpan.length})</h3>
          <button type="button" id="mtx-set-goto-saved" class="win7-btn">Buka Halaman Penuh</button>
        </div>
        <div>${savedListHtml}</div>
      </div>

      <!-- BAGIAN 3: GANTI TEMA -->
      <div class="mtx-channel-banner">
        <h3 style="margin:0 0 4px;font-size:15.5px;">3. Tampilan & Tema Antarmuka</h3>
        <p style="margin:0;font-size:12px;opacity:0.8;">Pilih gaya visual MiniTube X. Perubahan langsung diterapkan ke seluruh layar.</p>
        <div class="mtx-theme-grid">
          ${DAFTAR_TEMA.map((t) => `
            <div data-pick-theme="${t.id}" class="mtx-theme-card ${temaAktif === t.id ? "active" : ""}">
              <div class="mtx-theme-swatch" style="background:${t.preview};"></div>
              <div style="font-size:13px;font-weight:800;">${esc(t.nama)} ${temaAktif === t.id ? "✓" : ""}</div>
              <div style="font-size:11.5px;opacity:0.8;margin-top:2px;">${esc(t.desc)}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- BAGIAN 4: GANTI KE SEMUA BAHASA DI DUNIA -->
      <div class="mtx-channel-banner">
        <h3 style="margin:0 0 4px;font-size:15.5px;">4. Bahasa Dunia (${SEMUA_BAHASA_DUNIA.length} Bahasa Tersedia)</h3>
        <p style="margin:0 0 8px;font-size:12px;opacity:0.8;">
          Bahasa aktif saat ini: <strong>${esc(bahasaAktifObj[1])}</strong>. Pilih bahasa mana saja di dunia untuk menerjemahkan aplikasi.
        </p>
        <input type="text" id="mtx-lang-search" class="mtx-auth-input" placeholder="Cari bahasa (contoh: Inggris, Jepang, Jawa, Sunda, Arab, Rusia, Zulu)..." value="${esc(cariBahasaQuery)}">
        <div class="mtx-lang-list" id="mtx-lang-list">
          ${bahasaTersaring.map(([kode, nama]) => `
            <button type="button" data-pick-lang="${kode}" class="mtx-lang-item ${bahasaAktif === kode ? "active" : ""}">
              ${esc(nama)} ${bahasaAktif === kode ? "✓" : ""}
            </button>
          `).join("")}
        </div>
      </div>
    `;

    // Event Simpan Profil di Pengaturan
    document.getElementById("mtx-set-save-profile").onclick = async () => {
      const serverUrl = getServerUrl();
      if (!serverUrl) return;
      const nama = document.getElementById("mtx-set-nama").value.trim();
      const bio  = document.getElementById("mtx-set-bio").value.trim();
      const fileFoto = document.getElementById("mtx-set-foto").files[0];

      const btn = document.getElementById("mtx-set-save-profile");
      btn.disabled = true;
      btn.textContent = "Menyimpan...";

      try {
        const token = await userAktif.getIdToken();
        const metaB64 = btoa(unescape(encodeURIComponent(JSON.stringify({ nama, bio }))));
        const headers = { "Authorization": "Bearer " + token, "X-Meta": metaB64 };
        let bodyBlob = null;
        if (fileFoto) {
          bodyBlob = await kompresAvatar200px(fileFoto);
          headers["X-Filename"] = btoa(unescape(encodeURIComponent("avatar.jpg")));
          headers["Content-Type"] = "image/jpeg";
        }
        const res = await nativeFetch(`${serverUrl}/api/profile`, { method: "POST", headers, body: bodyBlob });
        if (!res.ok) {
          alert(await res.text());
        } else {
          await segarkanSosial(false);
          tampilkanToast("Profil akun berhasil diperbarui.");
        }
      } catch (e) {
        alert("Gagal menyimpan profil: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Simpan Profil Akun";
      }
    };

    // Event Ubah Password
    const btnPass = document.getElementById("mtx-set-btn-pass");
    if (btnPass) {
      btnPass.onclick = async () => {
        const newPass = document.getElementById("mtx-set-newpass").value;
        if (!newPass || newPass.length < 6) {
          alert("Password baru minimal 6 karakter.");
          return;
        }
        try {
          await userAktif.updatePassword(newPass);
          document.getElementById("mtx-set-newpass").value = "";
          tampilkanToast("Password berhasil diubah!");
        } catch (err) {
          if (err.code === "auth/requires-recent-login") {
            alert("Demi keamanan, silakan Keluar lalu Masuk ulang terlebih dahulu sebelum mengganti password.");
          } else {
            alert("Gagal mengubah password: " + err.message);
          }
        }
      };
    }

    // Event Kirim Email Reset Password
    document.getElementById("mtx-set-reset-email").onclick = async () => {
      try {
        await auth.sendPasswordResetEmail(userAktif.email);
        tampilkanToast(`Link reset password dikirim ke ${userAktif.email}.`);
      } catch (err) {
        alert("Gagal mengirim email reset: " + err.message);
      }
    };

    // Event Export Data Akun JSON
    document.getElementById("mtx-set-export-json").onclick = () => {
      const postinganSaya = daftarPostCache.filter((p) => (p.email || "").toLowerCase() === myEmail);
      const dataEkspor = {
        dieksportPada: new Date().toISOString(),
        profil: profilSaya,
        postinganAktif: postinganSaya,
        preferensiAlgoritma: getAffinityStore(),
        tema: temaAktif,
        bahasa: bahasaAktif
      };
      const blob = new Blob([JSON.stringify(dataEkspor, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `minitubex-backup-${myEmail.split("@")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      tampilkanToast("File backup akun (.json) berhasil diunduh.");
    };

    // Event Privasi, Blokir, Reset Algoritma, Logout, & Hapus Akun
    document.getElementById("mtx-set-manage-block").onclick = bukaModalBlokir;

    document.getElementById("mtx-set-reset-algo").onclick = () => {
      localStorage.removeItem(`mtx_algo_${myEmail}`);
      tampilkanToast("Riwayat algoritma rekomendasi direset ke awal.");
      if (typeof renderSemuaTab === "function") renderSemuaTab();
    };

    document.getElementById("mtx-set-logout").onclick = () => {
      if (confirm("Keluar dari akun MiniTube X sekarang?")) keluarDariAkun();
    };

    document.getElementById("mtx-set-delete-account").onclick = async () => {
      const konfirm1 = confirm(`PERINGATAN: Akun "${profilSaya.nama}" (${myEmail}) akan dihapus permanen.\n\nLanjutkan hapus akun?`);
      if (!konfirm1) return;
      const hapusJugaPost = confirm("Apakah semua video, Shorts, dan postingan kamu juga ikut dihapus permanen?\n\nKlik OK untuk menghapus semua postingan juga, atau Cancel untuk menyimpan postingan tetap ada.");

      try {
        const okServer = await kirimAksiApi("/api/account/delete", { hapusPostingan: hapusJugaPost });
        if (!okServer) return;
        localStorage.removeItem(`mtx_algo_${myEmail}`);
        localStorage.removeItem(`mtx_theme_onboarded_${myEmail}`);
        gateStep = "lang";
        await userAktif.delete();
        alert("Akun kamu telah berhasil dihapus secara permanen.");
      } catch (err) {
        if (err.code === "auth/requires-recent-login") {
          alert("Data profil di server sudah dibersihkan. Demi keamanan Firebase, silakan login ulang sekali lagi jika ingin menghapus kredensial login secara permanen.");
          keluarDariAkun();
        } else {
          alert("Gagal menghapus akun: " + err.message);
        }
      }
    };

    // Event Saved Items di Pengaturan
    document.getElementById("mtx-set-goto-saved").onclick = () => bukaTabKhusus("saved");

    wadah.querySelectorAll("[data-set-open-post]").forEach((btn) => {
      btn.onclick = () => bukaModalPost(btn.getAttribute("data-set-open-post"));
    });

    wadah.querySelectorAll("[data-set-unsave]").forEach((btn) => {
      btn.onclick = async () => {
        if (await kirimAksiApi("/api/save", { id: btn.getAttribute("data-set-unsave") })) {
          await segarkanSosial(false);
          tampilkanToast("Dihapus dari daftar simpanan.");
        }
      };
    });

    // Event Ganti Tema
    wadah.querySelectorAll("[data-pick-theme]").forEach((card) => {
      card.onclick = () => {
        const tId = card.getAttribute("data-pick-theme");
        terapkanTema(tId);
        renderHalamanPengaturan();
        const tObj = DAFTAR_TEMA.find((x) => x.id === tId);
        tampilkanToast(`Tema diganti ke: ${tObj ? tObj.nama : tId}`);
      };
    });

    // Event Cari & Ganti Bahasa Dunia
    const inpLang = document.getElementById("mtx-lang-search");
    inpLang.oninput = () => {
      cariBahasaQuery = inpLang.value;
      const pos = inpLang.selectionStart;
      renderHalamanPengaturan();
      const inpBaru = document.getElementById("mtx-lang-search");
      if (inpBaru) {
        inpBaru.focus();
        inpBaru.setSelectionRange(pos, pos);
      }
    };

    wadah.querySelectorAll("[data-pick-lang]").forEach((btn) => {
      btn.onclick = () => {
        const kode = btn.getAttribute("data-pick-lang");
        const langObj = SEMUA_BAHASA_DUNIA.find(([k]) => k === kode);
        terapkanBahasa(kode, true);
        renderHalamanPengaturan();
        tampilkanToast(`Bahasa diubah ke: ${langObj ? langObj[1] : kode}`);
      };
    });
  }

  // 9. Halaman Notifikasi
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
          const isiPreview = n.tipe === "follow" ? "" : `<div style="font-size:12px;opacity:0.8;margin-top:2px;">"${esc(n.teks || "")}"</div>`;

          return `
            <div data-notif-idx="${idx}" class="mtx-notif-item ${n.dibaca ? "" : "unread"}">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                <img src="${resolveAvatarUrl(fotoPengirim, namaPengirim)}" data-fallback-nama="${esc(namaPengirim)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;flex-shrink:0;">
                <div style="min-width:0;">
                  <div style="font-size:13px;line-height:1.35;">
                    <strong>${esc(namaPengirim)}</strong> ${ket}
                  </div>
                  ${isiPreview}
                  <div style="font-size:11px;opacity:0.7;margin-top:3px;">${formatWaktuSingkat(n.waktu)}</div>
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
          <div style="font-size:12px;opacity:0.8;">${unreadCount > 0 ? `${unreadCount} notifikasi baru belum dibaca` : "Semua notifikasi sudah dibaca"}</div>
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

  // 10. Halaman Pencarian Terpadu
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
              <div style="font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightTeks(ch.nama, kataKunciCari)}</div>
              <div style="font-size:11px;opacity:0.75;">${followers.length} Pengikut</div>
              <div style="font-size:11px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightTeks(ch.bio || "", kataKunciCari)}</div>
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
          btnF.textContent = sudahFollow ? tr("followingBtn") : tr("follow");
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
            <div style="font-size:12.5px;font-weight:700;">${highlightTeks(chNama, kataKunciCari)}</div>
            <div style="font-size:11px;opacity:0.75;">${chFollowers.length} Pengikut • ${formatWaktuSingkat(p.dibuatPada)}</div>
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
        btnF.textContent = sudahFollow ? tr("followingBtn") : tr("follow");
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
        captionEl.style.cssText = "font-size:13.5px;line-height:1.45;margin:6px 0;";
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
        img.style.cssText = "width:100%;max-height:340px;object-fit:contain;border-radius:12px;margin-top:6px;";
        card.appendChild(img);
      }

      const bar = document.createElement("div");
      bar.className = "mtx-social-bar";

      const btnLike = document.createElement("button");
      btnLike.type = "button";
      btnLike.className = "mtx-act-btn" + (sudahLike ? " liked" : "");
      btnLike.textContent = `${sudahLike ? "♥" : "♡"} ${tr("like")} (${likes.length})`;
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
      btnKomen.textContent = `${tr("comment")} (${comments.length})`;
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
      btnShare.textContent = tr("share");
      btnShare.onclick = () => bagikanPostingan(p);
      bar.appendChild(btnShare);

      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "mtx-act-btn" + (sudahSave ? " saved" : "");
      btnSave.textContent = sudahSave ? tr("savedDone") : tr("save");
      btnSave.onclick = async () => {
        if (await kirimAksiApi("/api/save", { id: p.id })) {
          await segarkanSosial(false);
        }
      };
      bar.appendChild(btnSave);

      const btnBlock = document.createElement("button");
      btnBlock.type = "button";
      btnBlock.className = "mtx-act-btn block-btn";
      btnBlock.textContent = tr("blockSimilar");
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

  // 11. Halaman Channel & Edit Profil
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
           <button type="button" id="mtx-ch-open-settings" class="win7-btn">${tr("settings")}</button>
         </div>`
      : `<button type="button" id="mtx-btn-follow-ch" class="mtx-btn-follow ${sudahFollow ? "following" : ""}" style="padding:6px 14px;font-size:12.5px;">${sudahFollow ? tr("followingBtn") : tr("follow")}</button>`;

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
              <div style="font-size:11.5px;color:#0096c7;font-weight:700;">[${(p.tipe || "feed").toUpperCase()}] • ${(p.likes || []).length} Suka • ${(p.comments || []).length} Komentar</div>
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
              <div style="font-size:12px;opacity:0.75;">${esc(ch.email)}</div>
              <p style="margin:5px 0 0;font-size:12.5px;">${esc(ch.bio || "Belum ada bio channel.")}</p>
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

        <div id="mtx-form-edit-profil" style="display:none;margin-top:14px;padding-top:14px;border-top:1px solid var(--mtx-accent-border);">
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
      document.getElementById("mtx-ch-open-settings").onclick = () => bukaTabKhusus("settings");
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
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
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

  // 12. Halaman Postingan Disimpan
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
            <strong style="font-size:13px;">${esc(p.channelNama || p.penulis)}</strong>
            <div style="display:flex;gap:6px;">
              <button type="button" data-saved-share="${p.id}" class="mtx-act-btn">${tr("share")}</button>
              <button type="button" data-unsave-id="${p.id}" class="mtx-act-btn saved">Hapus Simpanan</button>
            </div>
          </div>
          <div style="font-size:13.5px;margin-top:6px;">${esc(p.teks || "(Tanpa caption)")}</div>
          ${mediaTag}
        </div>
      `;
    }).join("");

    wadah.querySelectorAll("[data-saved-share]").forEach((btn) => {
      btn.onclick = () => {
        const post = daftarPostCache.find((x) => x.id === btn.getAttribute("data-saved-share"));
        if (post) bagikanPostingan(post);
      };
    });

    wadah.querySelectorAll("[data-unsave-id]").forEach((btn) => {
      btn.onclick = async () => {
        if (await kirimAksiApi("/api/save", { id: btn.getAttribute("data-unsave-id") })) {
          await segarkanSosial(false);
        }
      };
    });
  }
})();