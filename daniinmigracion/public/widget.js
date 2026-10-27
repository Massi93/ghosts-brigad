/**
 * Dani Inmigración · Live sur le site principal (www.daniinmigracion.com)
 *
 * Ajouté au site avec une seule ligne, juste avant </body> :
 *   <script src="/live/widget.js" defer></script>
 *
 * Ce script :
 *  - affiche le bouton « LIVE » rouge clignotant dans le menu (#navbar) dès qu'un
 *    live est programmé, avec le compte à rebours 05:00 → 00:00 les 5 dernières
 *    minutes ; à 00:00 (ou en direct) il devient actif et ouvre la page /live ;
 *  - ajoute la rubrique « Próximo live » (date, compte à rebours, formulaire
 *    d'inscription nom / prénom / email) juste après le haut de page (#hero) ;
 *  - suit la langue du site (es / fr / ar, sens de lecture compris).
 *
 * Emplacements personnalisables (facultatif) : un élément `data-dani-live-button`
 * reçoit le bouton, un élément `data-dani-live-section` reçoit la rubrique.
 */
(function () {
  "use strict";
  if (window.__daniLiveWidget) return;
  window.__daniLiveWidget = true;

  var API = "/api/live/public";
  var LIVE_URL = "/live";
  var STORAGE_KEY = "dani_live_registration";
  var DEFAULT_SECTION_TITLE = "Próximo live";
  var DEFAULT_SECTION_TEXT =
    "Conéctate en directo con Dani: resolvemos tus dudas sobre visas, residencia y nacionalidad en tiempo real.";

  /* ------------------------------------------------------------------ */
  /* Textes (espagnol, français, arabe)                                  */
  /* ------------------------------------------------------------------ */

  var I18N = {
    es: {
      label: "Próximo live",
      liveLabel: "En directo",
      defaultTitle: "Lives en directo con Dani",
      defaultText: DEFAULT_SECTION_TEXT,
      noDate: "Aún no hay fecha para el próximo live. Inscríbete y te avisaremos por correo en cuanto Dani lo programe.",
      dateLabel: "Fecha y hora (tu zona horaria)",
      units: ["días", "horas", "min", "seg"],
      liveNow: "¡Estamos en directo!",
      startingNow: "¡El live está por empezar!",
      watchNow: "Ver el live ahora",
      formTitle: "Reserva tu lugar gratis",
      formSub: "Te enviaremos un recordatorio 3 horas y 5 minutos antes del live.",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Correo electrónico",
      submit: "Quiero inscribirme",
      sending: "Enviando…",
      privacy: "Solo usaremos tu correo para avisarte de los lives. Puedes darte de baja cuando quieras.",
      done: function (n) { return "¡Listo" + (n ? ", " + n : "") + "! Estás inscrito/a."; },
      another: "Inscribir a otra persona",
      errEmail: "Correo electrónico inválido.",
      errName: "Revisa tu nombre y apellido.",
      errRate: "Demasiadas inscripciones. Inténtalo más tarde.",
      errGeneric: "No se pudo enviar. Inténtalo de nuevo.",
      enter: "Entrar al live",
      scheduled: function (d) { return "Live programado: " + d + ". Ver inscripción"; },
      startsIn: function (t) { return "El live empieza en " + t; },
    },
    fr: {
      label: "Prochain live",
      liveLabel: "En direct",
      defaultTitle: "Lives en direct avec Dani",
      defaultText:
        "Connectez-vous en direct avec Dani : nous répondons à vos questions sur les visas, la résidence et la nationalité en temps réel.",
      noDate: "Le prochain live n'a pas encore de date. Inscrivez-vous : nous vous préviendrons par e-mail dès que Dani le programmera.",
      dateLabel: "Date et heure (votre fuseau horaire)",
      units: ["jours", "heures", "min", "sec"],
      liveNow: "Nous sommes en direct !",
      startingNow: "Le live va commencer !",
      watchNow: "Regarder le live",
      formTitle: "Réservez votre place gratuitement",
      formSub: "Vous recevrez un rappel 3 heures et 5 minutes avant le live.",
      firstName: "Prénom",
      lastName: "Nom",
      email: "E-mail",
      submit: "Je m'inscris",
      sending: "Envoi…",
      privacy: "Votre e-mail sert uniquement à vous prévenir des lives. Désinscription possible à tout moment.",
      done: function (n) { return "C'est fait" + (n ? ", " + n : "") + " ! Vous êtes inscrit(e)."; },
      another: "Inscrire une autre personne",
      errEmail: "Adresse e-mail invalide.",
      errName: "Vérifiez votre prénom et votre nom.",
      errRate: "Trop d'inscriptions. Réessayez plus tard.",
      errGeneric: "Envoi impossible. Réessayez.",
      enter: "Rejoindre le live",
      scheduled: function (d) { return "Live programmé : " + d + ". Voir l'inscription"; },
      startsIn: function (t) { return "Le live commence dans " + t; },
    },
    ar: {
      label: "البث المباشر القادم",
      liveLabel: "مباشر الآن",
      defaultTitle: "بث مباشر مع داني",
      defaultText: "تواصل مباشرة مع داني: نجيب عن أسئلتك حول التأشيرات والإقامة والجنسية في الوقت الحقيقي.",
      noDate: "لم يُحدَّد بعد موعد البث المباشر القادم. سجّل الآن وسنخبرك عبر البريد الإلكتروني فور برمجته.",
      dateLabel: "التاريخ والساعة (حسب توقيتك)",
      units: ["أيام", "ساعات", "دقائق", "ثوانٍ"],
      liveNow: "نحن على المباشر الآن!",
      startingNow: "البث المباشر على وشك البدء!",
      watchNow: "شاهد البث المباشر الآن",
      formTitle: "احجز مكانك مجاناً",
      formSub: "سنرسل لك تذكيراً قبل البث بـ3 ساعات و5 دقائق.",
      firstName: "الاسم",
      lastName: "اللقب",
      email: "البريد الإلكتروني",
      submit: "سجّلني",
      sending: "جارٍ الإرسال…",
      privacy: "نستعمل بريدك فقط لإعلامك بالبث المباشر. يمكنك إلغاء الاشتراك متى شئت.",
      done: function (n) { return "تم" + (n ? " يا " + n : "") + "! أنت مسجّل."; },
      another: "تسجيل شخص آخر",
      errEmail: "البريد الإلكتروني غير صالح.",
      errName: "تحقّق من الاسم واللقب.",
      errRate: "محاولات كثيرة. حاول لاحقاً.",
      errGeneric: "تعذّر الإرسال. حاول مرة أخرى.",
      enter: "ادخل إلى البث المباشر",
      scheduled: function (d) { return "بث مباشر مبرمج: " + d + ". التسجيل"; },
      startsIn: function (t) { return "يبدأ البث بعد " + t; },
    },
  };

  function currentLang() {
    var lang = (document.documentElement.getAttribute("lang") || "es").slice(0, 2).toLowerCase();
    return I18N[lang] ? lang : "es";
  }
  function t() {
    return I18N[currentLang()];
  }
  function locale() {
    var lang = currentLang();
    return lang === "ar" ? "ar-u-nu-latn" : lang;
  }

  /* ------------------------------------------------------------------ */
  /* Styles (couleurs et classes du site, préfixe dl-)                   */
  /* ------------------------------------------------------------------ */

  var CSS =
    /* Bouton : accroché sous la barre de menu (côté fin de ligne), sans décaler le menu du site. */
    ".dl-pill{position:absolute;top:calc(100% + 12px);inset-inline-end:5%;z-index:5;display:inline-flex;align-items:center;gap:8px;" +
    "height:40px;padding:0 15px;border-radius:50px;border:1.5px solid rgba(198,11,30,.4);background:#fff;color:var(--red,#c60b1e)!important;" +
    "font-family:inherit;font-size:.8rem;font-weight:800;line-height:1;letter-spacing:.14em;text-decoration:none;cursor:pointer;white-space:nowrap;" +
    "box-shadow:0 8px 26px rgba(15,16,32,.14);transition:transform .3s,box-shadow .3s,background .3s}" +
    ".dl-pill.dl-inline{position:static;box-shadow:none}" +
    ".dl-pill:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(198,11,30,.25)}" +
    ".dl-pill[hidden]{display:none!important}" +
    ".dl-section[hidden]{display:none!important}" +
    ".dl-pill.dl-active{background:var(--red,#c60b1e);border-color:var(--red,#c60b1e);color:#fff!important;animation:dl-ring 1.6s infinite}" +
    ".dl-dot{position:relative;width:9px;height:9px;border-radius:50%;background:currentColor;flex-shrink:0}" +
    ".dl-dot::after{content:'';position:absolute;inset:0;border-radius:50%;background:currentColor;animation:dl-ping 1.4s cubic-bezier(0,0,.2,1) infinite}" +
    ".dl-blink{animation:dl-blink 1.2s ease-in-out infinite}" +
    ".dl-timer{font:700 .8rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;padding:5px 8px;border-radius:8px;" +
    "background:rgba(198,11,30,.1);font-variant-numeric:tabular-nums}" +
    ".dl-active .dl-timer{background:rgba(255,255,255,.22)}" +
    "@keyframes dl-ping{75%,100%{transform:scale(2.4);opacity:0}}" +
    "@keyframes dl-blink{50%{opacity:.3}}" +
    "@keyframes dl-ring{0%{box-shadow:0 0 0 0 rgba(198,11,30,.55)}70%{box-shadow:0 0 0 12px rgba(198,11,30,0)}100%{box-shadow:0 0 0 0 rgba(198,11,30,0)}}" +
    "@media(max-width:1024px){.dl-pill{top:calc(100% + 10px);height:36px;padding:0 12px;font-size:.74rem;gap:7px}.dl-timer{font-size:.74rem;padding:4px 7px}}" +
    "@media(prefers-reduced-motion:reduce){.dl-dot::after,.dl-blink,.dl-pill.dl-active{animation:none}}" +
    /* Rubrique « Próximo live » */
    "#proximo-live{scroll-margin-top:90px;background:linear-gradient(180deg,var(--gray-l,#f6f8fb),#fff)}" +
    ".dl-label{display:flex;align-items:center;justify-content:center;gap:8px}" +
    ".dl-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;max-width:980px;margin:0 auto}" +
    ".dl-card{background:#fff;border:1px solid var(--border,#e9ecf2);border-radius:22px;padding:2.2rem;box-shadow:0 24px 64px rgba(15,16,32,.08);position:relative;overflow:hidden}" +
    ".dl-card::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:60%;height:3px;background:linear-gradient(90deg,var(--red,#c60b1e),var(--gold,#f1bf00))}" +
    ".dl-when-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--gray,#8a8a99)}" +
    ".dl-when{font-size:1.25rem;font-weight:800;color:var(--ink,#0f1020);margin:.35rem 0 1.4rem;line-height:1.35}" +
    ".dl-count{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:.6rem}" +
    ".dl-count div{border:1px solid var(--border,#e9ecf2);background:var(--gray-ll,#fbfcfe);border-radius:14px;padding:.8rem .3rem;text-align:center}" +
    ".dl-count b{display:block;font-size:1.7rem;font-weight:900;color:var(--ink,#0f1020);font-variant-numeric:tabular-nums;line-height:1.1}" +
    ".dl-count span{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--gray,#8a8a99)}" +
    ".dl-note{color:var(--text,#52525b);line-height:1.7;margin:0}" +
    ".dl-live-now{text-align:center}" +
    ".dl-live-now h3{display:flex;align-items:center;justify-content:center;gap:10px;font-size:1.35rem;font-weight:900;color:var(--ink,#0f1020);margin-bottom:1.2rem}" +
    ".dl-live-now .dl-dot{color:var(--red,#c60b1e)}" +
    ".dl-btn{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}" +
    ".dl-form h3{font-size:1.2rem;font-weight:800;color:var(--ink,#0f1020);text-align:center;margin-bottom:.3rem}" +
    ".dl-form .dl-sub{text-align:center;font-size:.82rem;color:var(--gray,#8a8a99);margin-bottom:1.4rem}" +
    ".dl-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}" +
    ".dl-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}" +
    ".dl-error{margin:.2rem 0 1rem;padding:.7rem 1rem;border-radius:10px;background:var(--red-l,#fff1f2);color:var(--red-d,#9e0917);font-size:.85rem;font-weight:600}" +
    ".dl-privacy{margin-top:.9rem;text-align:center;font-size:.72rem;color:var(--gray,#8a8a99);line-height:1.5}" +
    ".dl-done{text-align:center;padding:1rem 0}" +
    ".dl-done-icon{width:56px;height:56px;margin:0 auto 1rem;border-radius:50%;display:grid;place-items:center;background:rgba(22,163,74,.12);color:var(--green,#16a34a);font-size:1.6rem;font-weight:900}" +
    ".dl-done p{color:var(--ink,#0f1020);font-weight:800;font-size:1.1rem}" +
    ".dl-done small{display:block;margin-top:.4rem;color:var(--gray,#8a8a99);font-size:.85rem}" +
    ".dl-link{margin-top:1rem;background:none;border:0;color:var(--red,#c60b1e);font:600 .82rem inherit;text-decoration:underline;cursor:pointer;font-family:inherit}" +
    "@media(max-width:860px){.dl-grid{grid-template-columns:1fr}.dl-card{padding:1.6rem}.dl-count b{font-size:1.4rem}}" +
    "@media(max-width:380px){.dl-row{grid-template-columns:1fr}}";

  function injectStyles() {
    if (document.getElementById("dl-widget-css")) return;
    var style = document.createElement("style");
    style.id = "dl-widget-css";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                         */
  /* ------------------------------------------------------------------ */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key) || attrs[key] == null) continue;
        if (key === "text") node.textContent = attrs[key];
        else if (key === "className") node.className = attrs[key];
        else if (key.slice(0, 2) === "on") node.addEventListener(key.slice(2), attrs[key]);
        else node.setAttribute(key, attrs[key]);
      }
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /** « 04:59 » (arrondi à la seconde supérieure, 05:00 → 00:00). */
  function formatCountdown(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    return pad(Math.floor(total / 60)) + ":" + pad(total % 60);
  }

  /** « Martes, 27 de octubre · 19:00 » dans le fuseau du visiteur. */
  function formatDate(iso) {
    var date = new Date(iso);
    var day = new Intl.DateTimeFormat(locale(), { weekday: "long", day: "numeric", month: "long" }).format(date);
    var time = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(date);
    return day.charAt(0).toUpperCase() + day.slice(1) + " · " + time;
  }

  function readSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function save(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      /* stockage indisponible : sans conséquence */
    }
  }

  /* ------------------------------------------------------------------ */
  /* État du live (API publique)                                         */
  /* ------------------------------------------------------------------ */

  var status = { live: null, site: null, offset: 0, loaded: false };
  var pollTimer = null;

  function now() {
    return Date.now() + status.offset;
  }

  /**
   * Phase à l'instant présent :
   * none | scheduled (> 5 min) | countdown (5 dernières min) | ready (heure atteinte) | live
   */
  function phase() {
    var live = status.live;
    if (!live) return { phase: "none", remaining: 0 };
    if (live.status === "live") return { phase: "live", remaining: 0 };
    var start = live.scheduledAt ? Date.parse(live.scheduledAt) : now();
    var remaining = start - now();
    if (remaining <= 0) return { phase: "ready", remaining: 0 };
    if (remaining <= 5 * 60000) return { phase: "countdown", remaining: remaining };
    return { phase: "scheduled", remaining: remaining };
  }

  function refresh() {
    return fetch(API + "/live", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (!data) return;
        status.live = data.live;
        status.site = data.site;
        status.offset = data.serverNow - Date.now();
        status.loaded = true;
        render();
      })
      .catch(function () {
        /* serveur du Live injoignable : le site reste utilisable */
      })
      .then(schedulePoll);
  }

  /** Rafraîchit l'état : souvent près du début ou pendant le live, rarement sinon. */
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (document.hidden) return;
    var p = phase();
    var soon = p.phase === "live" || p.phase === "ready" || (p.phase !== "none" && p.remaining < 10 * 60000);
    pollTimer = setTimeout(refresh, soon ? 15000 : 60000);
  }

  /* ------------------------------------------------------------------ */
  /* Bouton LIVE (menu)                                                  */
  /* ------------------------------------------------------------------ */

  var pill = null;
  var pillTimer = null;

  function mountPill() {
    var custom = document.querySelector("[data-dani-live-button]");
    var nav = document.getElementById("navbar") || document.querySelector("nav");
    if (!custom && !nav) return;
    pill = el("a", { className: "dl-pill", href: LIVE_URL, hidden: "" }, [
      el("span", { className: "dl-dot", "aria-hidden": "true" }),
      el("span", { className: "dl-blink", text: "LIVE" }),
      el("span", { className: "dl-timer", role: "timer", hidden: "" }),
    ]);
    pill.addEventListener("click", function (event) {
      var p = phase().phase;
      if (p === "live" || p === "ready") return; // ouvre la page /live
      event.preventDefault();
      var section = document.getElementById("proximo-live");
      if (section) section.scrollIntoView({ behavior: "smooth" });
    });
    if (custom) {
      pill.classList.add("dl-inline");
      custom.appendChild(pill);
    } else {
      if (getComputedStyle(nav).position === "static") pill.classList.add("dl-inline");
      nav.appendChild(pill);
    }
  }

  function renderPill() {
    if (!pill) return;
    var p = phase();
    var tr = t();
    var timer = pill.querySelector(".dl-timer");
    if (p.phase === "none") {
      pill.hidden = true;
      return;
    }
    pill.hidden = false;
    var active = p.phase === "live" || p.phase === "ready";
    pill.classList.toggle("dl-active", active);
    var label = active ? tr.enter : tr.scheduled(formatDate(status.live.scheduledAt));
    pill.setAttribute("aria-label", label);
    pill.title = label;
    // Le chronomètre reste à 00:00 tant que Dani n'a pas lancé la diffusion.
    var showTimer = p.phase === "countdown" || p.phase === "ready";
    timer.hidden = !showTimer;
    if (showTimer) {
      timer.textContent = formatCountdown(p.remaining);
      timer.setAttribute("aria-label", tr.startsIn(timer.textContent));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Rubrique « Próximo live »                                           */
  /* ------------------------------------------------------------------ */

  var section = null;
  var form = { firstName: "", lastName: "", email: "", website: "" };
  // idle | sending | done | error ; pour une erreur, on garde le code (le texte est
  // traduit à l'affichage, pour suivre un changement de langue).
  var formState = { status: "idle", code: null, httpStatus: 0 };
  var lastSectionKey = "";

  /**
   * Emplacement de la rubrique : juste après le haut de page (#hero), pour être
   * vue dès le premier défilement ; sinon avant #contacto ou le pied de page.
   */
  function mountSection() {
    // Cachée jusqu'au premier chargement réussi (pas de bande vide si le serveur ne répond pas).
    section = el("section", { className: "sec dl-section", id: "proximo-live", hidden: "" });
    var custom = document.querySelector("[data-dani-live-section]");
    var hero = document.getElementById("hero");
    var anchor = document.getElementById("contacto") || document.querySelector("footer");
    if (custom) custom.appendChild(section);
    else if (hero && hero.parentNode) hero.parentNode.insertBefore(section, hero.nextSibling);
    else if (anchor) anchor.parentNode.insertBefore(section, anchor);
    else section = null;
  }

  function sectionTexts() {
    var tr = t();
    var site = status.site || {};
    var custom = function (value, def) {
      return value && value !== def ? value : null;
    };
    return {
      label: custom(site.liveSectionTitle, DEFAULT_SECTION_TITLE) || tr.label,
      text: site.liveSectionText === "" ? "" : custom(site.liveSectionText, DEFAULT_SECTION_TEXT) || tr.defaultText,
    };
  }

  function countdownBoxes(remaining) {
    var tr = t();
    var total = Math.max(0, Math.floor(remaining / 1000));
    var values = [Math.floor(total / 86400), Math.floor((total % 86400) / 3600), Math.floor((total % 3600) / 60), total % 60];
    var boxes = el("div", { className: "dl-count", role: "timer" });
    values.forEach(function (value, i) {
      if (i === 0 && !value) return;
      boxes.appendChild(el("div", null, [el("b", { text: pad(value) }), el("span", { text: tr.units[i] })]));
    });
    return boxes;
  }

  function infoCard(p) {
    var tr = t();
    var card = el("div", { className: "dl-card" });
    if (p.phase === "live" || p.phase === "ready") {
      card.appendChild(
        el("div", { className: "dl-live-now" }, [
          el("h3", null, [el("span", { className: "dl-dot" }), p.phase === "live" ? tr.liveNow : tr.startingNow]),
          el("a", { className: "form-btn btn-shine dl-btn", href: LIVE_URL }, ["▶ " + tr.watchNow]),
        ])
      );
    } else if (p.phase === "none") {
      card.appendChild(el("p", { className: "dl-note", text: tr.noDate }));
    } else {
      card.appendChild(el("div", { className: "dl-when-label", text: tr.dateLabel }));
      card.appendChild(el("div", { className: "dl-when", text: formatDate(status.live.scheduledAt) }));
      card.appendChild(countdownBoxes(p.remaining));
    }
    return card;
  }

  function errorMessage(code, status) {
    var tr = t();
    if (code === "invalid_email") return tr.errEmail;
    if (code === "invalid_nombre" || code === "invalid_apellido") return tr.errName;
    if (status === 429) return tr.errRate;
    return tr.errGeneric;
  }

  function submit(event) {
    event.preventDefault();
    if (formState.status === "sending") return;
    formState = { status: "sending", code: null, httpStatus: 0 };
    renderSection(true);
    fetch(API + "/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        website: form.website,
        lang: currentLang(),
      }),
    })
      .then(function (r) {
        return r.json().catch(function () {
          return {};
        }).then(function (data) {
          if (!r.ok) throw { code: data.code, status: r.status };
        });
      })
      .then(function () {
        save({ firstName: form.firstName.trim(), liveId: status.live ? status.live.id : null });
        form = { firstName: "", lastName: "", email: "", website: "" };
        formState = { status: "done", code: null, httpStatus: 0 };
        renderSection(true);
      })
      .catch(function (err) {
        formState = { status: "error", code: err && err.code, httpStatus: err && err.status };
        renderSection(true);
      });
  }

  function field(name, label, type, autocomplete, max) {
    var input = el("input", {
      id: "dl-" + name,
      name: name,
      type: type,
      required: "",
      maxlength: String(max),
      autocomplete: autocomplete,
      oninput: function (e) {
        form[name] = e.target.value;
      },
    });
    input.value = form[name];
    return el("div", { className: "fg" }, [el("label", { for: "dl-" + name, text: label }), input]);
  }

  function formCard() {
    var tr = t();
    var saved = readSaved();
    var already = saved && (!status.live || saved.liveId === status.live.id);
    var card = el("div", { className: "dl-card dl-form" });

    if (formState.status === "done" || (already && formState.status === "idle")) {
      card.appendChild(
        el("div", { className: "dl-done", "aria-live": "polite" }, [
          el("div", { className: "dl-done-icon", text: "✓" }),
          el("p", { text: tr.done(saved && saved.firstName) }),
          el("small", { text: tr.formSub }),
          el("button", {
            type: "button",
            className: "dl-link",
            text: tr.another,
            onclick: function () {
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch (e) {}
              formState = { status: "idle", code: null, httpStatus: 0 };
              renderSection(true);
            },
          }),
        ])
      );
      return card;
    }

    var sending = formState.status === "sending";
    var honeypot = el("input", {
      className: "dl-hp",
      type: "text",
      name: "website",
      tabindex: "-1",
      autocomplete: "off",
      "aria-hidden": "true",
      oninput: function (e) {
        form.website = e.target.value;
      },
    });
    var button = el("button", { type: "submit", className: "form-btn btn-shine", text: sending ? tr.sending : tr.submit });
    if (sending) button.disabled = true;

    card.appendChild(
      el("form", { onsubmit: submit }, [
        el("h3", { text: tr.formTitle }),
        el("p", { className: "dl-sub", text: tr.formSub }),
        el("div", { className: "dl-row" }, [
          field("firstName", tr.firstName, "text", "given-name", 80),
          field("lastName", tr.lastName, "text", "family-name", 80),
        ]),
        field("email", tr.email, "email", "email", 254),
        honeypot,
        formState.status === "error" ? el("p", { className: "dl-error", role: "alert", text: errorMessage(formState.code, formState.httpStatus) }) : null,
        button,
        el("p", { className: "dl-privacy", text: tr.privacy }),
      ])
    );
    return card;
  }

  /**
   * (Re)construit la rubrique. Le formulaire n'est reconstruit que si son état change,
   * pour ne jamais effacer ce que la personne est en train de taper.
   */
  function renderSection(force) {
    if (!section) return;
    var site = status.site;
    if (!status.loaded || (site && site.liveSectionEnabled === false)) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var p = phase();
    var texts = sectionTexts();
    var key = [currentLang(), p.phase, status.live && status.live.id, status.live && status.live.scheduledAt,
      status.live && status.live.title, texts.label, texts.text, formState.status].join("|");

    if (force || key !== lastSectionKey || !section.firstChild) {
      lastSectionKey = key;
      var tr = t();
      var title = status.live ? status.live.title : tr.defaultTitle;
      var inner = el("div", { className: "sec-inner" }, [
        el("div", { className: "sec-label dl-label" }, [
          el("span", { className: "dl-dot", "aria-hidden": "true" }),
          p.phase === "live" ? tr.liveLabel : texts.label,
        ]),
        el("h2", { className: "sec-title", text: title }),
        el("div", { className: "sec-line" }),
        texts.text ? el("p", { className: "sec-desc", text: texts.text }) : null,
        el("div", { className: "dl-grid" }, [infoCard(p), p.phase === "live" ? null : formCard()]),
      ]);
      // Le formulaire en cours de saisie garde le focus.
      var focused = document.activeElement && section.contains(document.activeElement) ? document.activeElement.id : null;
      section.replaceChildren(inner);
      if (focused && document.getElementById(focused)) document.getElementById(focused).focus();
    } else {
      // Mise à jour légère : seulement le compte à rebours.
      var boxes = section.querySelector(".dl-count");
      if (boxes && (p.phase === "scheduled" || p.phase === "countdown")) boxes.replaceWith(countdownBoxes(p.remaining));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                           */
  /* ------------------------------------------------------------------ */

  function render() {
    renderPill();
    renderSection(false);
  }

  function start() {
    injectStyles();
    mountPill();
    mountSection();
    refresh();
    // Horloge : le chronomètre avance chaque seconde (sans requête au serveur).
    pillTimer = setInterval(function () {
      if (status.loaded) render();
    }, 1000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refresh();
    });
    // Le site change de langue sans recharger la page : on suit l'attribut lang.
    new MutationObserver(function () {
      lastSectionKey = "";
      render();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
