/**
 * Textes des emails et des pages de désinscription, dans les trois langues du site
 * (espagnol, français, arabe). La langue est celle du site au moment de l'inscription.
 */

export const LANGS = ["es", "fr", "ar"];

/** Langue valide (es par défaut). */
export function normalizeLang(value) {
  const lang = String(value || "").toLowerCase().slice(0, 2);
  return LANGS.includes(lang) ? lang : "es";
}

/** Locale Intl : chiffres latins en arabe (comme sur le site). */
export function intlLocale(lang) {
  return lang === "ar" ? "ar-u-nu-latn" : lang;
}

export const T = {
  es: {
    hello: (name) => `¡Hola ${name}!`,
    confirmSubjectDate: (date) => `¡Inscripción confirmada! Live con Dani el ${date}`,
    confirmSubjectNoDate: "¡Inscripción confirmada! Te avisaremos del próximo live",
    confirmPreheader: "Tu inscripción al live de Dani Inmigración",
    confirmReserved: (title, when) => `Tu lugar para el live <strong>«${title}»</strong> está reservado.<br>📅 <strong>${when}</strong>`,
    confirmReservedText: (title, when) => `Tu lugar para el live «${title}» está reservado: ${when}.`,
    confirmNoDate: "Todavía no hay fecha para el próximo live: te escribiremos en cuanto Dani lo programe.",
    confirmReminders: "Te enviaremos un recordatorio <strong>3 horas</strong> y otro <strong>5 minutos</strong> antes de empezar.",
    confirmRemindersText: "Te enviaremos un recordatorio 3 horas y 5 minutos antes.",
    seeLivePage: "Ver la página del live",
    link: "Enlace",
    reminderSubject3h: (remaining) => `⏰ Recordatorio: el live con Dani empieza en ${remaining}`,
    reminderSubject5m: (remaining) => `🔴 ¡El live empieza en ${remaining}!`,
    reminderPreheader5m: "Entra ya, estamos a punto de empezar",
    reminderHeading3h: (name) => `¡Hoy hay live, ${name}!`,
    reminderHeading5m: (name) => `¡Ya casi empezamos, ${name}!`,
    reminderBody: (title, remaining) => `<strong>«${title}»</strong> empieza en <strong>${remaining}</strong>.`,
    reminderText: (name, title, remaining, when, url) =>
      `Hola ${name}:\n\nEl live «${title}» empieza en ${remaining} (${when}).\nEntra aquí: ${url}`,
    enterLive: "Entrar al live",
    openLivePage: "Abrir la página del live",
    goLivePage: "Ir a la página del live",
    resubscribeSubject: "Confirma que quieres volver a recibir los avisos de los lives",
    resubscribeHeading: (name) => `Hola ${name}:`,
    resubscribeBody:
      "Recibimos una solicitud para volver a inscribir este correo a los lives de Dani Inmigración.<br>Si fuiste tú, confírmalo con el botón. Si no, ignora este mensaje: no recibirás nada más.",
    resubscribeCta: "Sí, quiero volver a recibir avisos",
    resubscribeText: (name, url) =>
      `Hola ${name}:\n\nPara volver a recibir los avisos de los lives, confirma aquí: ${url}\n\nSi no fuiste tú, ignora este mensaje.`,
    footerQuestion: "¿No quieres recibir más avisos?",
    footerLink: "Darme de baja",
    footerText: "Darse de baja",
    // Pages de désinscription
    pageTitle: "Avisos de los lives · Dani Inmigración",
    invalidLink: "Este enlace no es válido.",
    alreadyUnsubscribed: "Ya no recibes los avisos de los lives.",
    unsubscribeQuestion: (name) => `${name}, ¿quieres dejar de recibir los avisos de los lives?`,
    unsubscribeButton: "Sí, darme de baja",
    unsubscribed: (name) => `Listo, ${name}. Ya no recibirás más avisos de los lives.`,
    alreadySubscribed: "Ya estás inscrito/a: recibirás los avisos de los lives.",
    resubscribeQuestion: (name) => `${name}, ¿quieres volver a recibir los avisos de los lives?`,
    resubscribeButton: "Sí, volver a inscribirme",
    resubscribed: (name) => `¡Bienvenido/a de nuevo, ${name}! Recibirás los avisos de los próximos lives.`,
    backToSite: "Volver al sitio",
  },

  fr: {
    hello: (name) => `Bonjour ${name} !`,
    confirmSubjectDate: (date) => `Inscription confirmée ! Live avec Dani le ${date}`,
    confirmSubjectNoDate: "Inscription confirmée ! Nous vous préviendrons du prochain live",
    confirmPreheader: "Votre inscription au live de Dani Inmigración",
    confirmReserved: (title, when) => `Votre place pour le live <strong>« ${title} »</strong> est réservée.<br>📅 <strong>${when}</strong>`,
    confirmReservedText: (title, when) => `Votre place pour le live « ${title} » est réservée : ${when}.`,
    confirmNoDate: "Le prochain live n'a pas encore de date : nous vous écrirons dès que Dani le programmera.",
    confirmReminders: "Vous recevrez un rappel <strong>3 heures</strong> et un autre <strong>5 minutes</strong> avant le début.",
    confirmRemindersText: "Vous recevrez un rappel 3 heures et 5 minutes avant.",
    seeLivePage: "Voir la page du live",
    link: "Lien",
    reminderSubject3h: (remaining) => `⏰ Rappel : le live avec Dani commence dans ${remaining}`,
    reminderSubject5m: (remaining) => `🔴 Le live commence dans ${remaining} !`,
    reminderPreheader5m: "Rejoignez-nous, nous allons commencer",
    reminderHeading3h: (name) => `Live aujourd'hui, ${name} !`,
    reminderHeading5m: (name) => `On commence bientôt, ${name} !`,
    reminderBody: (title, remaining) => `<strong>« ${title} »</strong> commence dans <strong>${remaining}</strong>.`,
    reminderText: (name, title, remaining, when, url) =>
      `Bonjour ${name},\n\nLe live « ${title} » commence dans ${remaining} (${when}).\nRejoignez-le ici : ${url}`,
    enterLive: "Rejoindre le live",
    openLivePage: "Ouvrir la page du live",
    goLivePage: "Aller à la page du live",
    resubscribeSubject: "Confirmez que vous souhaitez de nouveau recevoir les alertes des lives",
    resubscribeHeading: (name) => `Bonjour ${name},`,
    resubscribeBody:
      "Nous avons reçu une demande pour réinscrire cette adresse aux lives de Dani Inmigración.<br>Si c'est bien vous, confirmez avec le bouton. Sinon, ignorez ce message : vous ne recevrez plus rien.",
    resubscribeCta: "Oui, je veux de nouveau recevoir les alertes",
    resubscribeText: (name, url) =>
      `Bonjour ${name},\n\nPour recevoir de nouveau les alertes des lives, confirmez ici : ${url}\n\nSi ce n'est pas vous, ignorez ce message.`,
    footerQuestion: "Vous ne souhaitez plus recevoir d'alertes ?",
    footerLink: "Se désinscrire",
    footerText: "Se désinscrire",
    pageTitle: "Alertes des lives · Dani Inmigración",
    invalidLink: "Ce lien n'est pas valide.",
    alreadyUnsubscribed: "Vous ne recevez plus les alertes des lives.",
    unsubscribeQuestion: (name) => `${name}, voulez-vous ne plus recevoir les alertes des lives ?`,
    unsubscribeButton: "Oui, me désinscrire",
    unsubscribed: (name) => `C'est fait, ${name}. Vous ne recevrez plus d'alertes des lives.`,
    alreadySubscribed: "Vous êtes déjà inscrit(e) : vous recevrez les alertes des lives.",
    resubscribeQuestion: (name) => `${name}, voulez-vous de nouveau recevoir les alertes des lives ?`,
    resubscribeButton: "Oui, me réinscrire",
    resubscribed: (name) => `Bon retour parmi nous, ${name} ! Vous recevrez les alertes des prochains lives.`,
    backToSite: "Retour au site",
  },

  ar: {
    hello: (name) => `مرحباً ${name}!`,
    confirmSubjectDate: (date) => `تم تأكيد تسجيلك! بث مباشر مع داني يوم ${date}`,
    confirmSubjectNoDate: "تم تأكيد تسجيلك! سنخبرك بموعد البث المباشر القادم",
    confirmPreheader: "تسجيلك في البث المباشر لـ Dani Inmigración",
    confirmReserved: (title, when) => `تم حجز مكانك في البث المباشر <strong>«${title}»</strong>.<br>📅 <strong>${when}</strong>`,
    confirmReservedText: (title, when) => `تم حجز مكانك في البث المباشر «${title}»: ${when}.`,
    confirmNoDate: "لم يُحدَّد بعد موعد البث المباشر القادم: سنراسلك فور برمجته من طرف داني.",
    confirmReminders: "سنرسل لك تذكيراً قبل البداية بـ<strong>3 ساعات</strong> وآخر قبلها بـ<strong>5 دقائق</strong>.",
    confirmRemindersText: "سنرسل لك تذكيراً قبل البداية بـ3 ساعات وبـ5 دقائق.",
    seeLivePage: "صفحة البث المباشر",
    link: "الرابط",
    reminderSubject3h: (remaining) => `⏰ تذكير: البث المباشر مع داني يبدأ بعد ${remaining}`,
    reminderSubject5m: (remaining) => `🔴 البث المباشر يبدأ بعد ${remaining}!`,
    reminderPreheader5m: "ادخل الآن، سنبدأ بعد قليل",
    reminderHeading3h: (name) => `اليوم بث مباشر يا ${name}!`,
    reminderHeading5m: (name) => `سنبدأ بعد قليل يا ${name}!`,
    reminderBody: (title, remaining) => `<strong>«${title}»</strong> يبدأ بعد <strong>${remaining}</strong>.`,
    reminderText: (name, title, remaining, when, url) =>
      `مرحباً ${name}،\n\nالبث المباشر «${title}» يبدأ بعد ${remaining} (${when}).\nادخل من هنا: ${url}`,
    enterLive: "الدخول إلى البث المباشر",
    openLivePage: "فتح صفحة البث المباشر",
    goLivePage: "الذهاب إلى صفحة البث المباشر",
    resubscribeSubject: "أكّد رغبتك في تلقي تنبيهات البث المباشر من جديد",
    resubscribeHeading: (name) => `مرحباً ${name}،`,
    resubscribeBody:
      "وصلنا طلب لإعادة تسجيل هذا البريد في البث المباشر لـ Dani Inmigración.<br>إذا كنت أنت صاحب الطلب، أكّده بالزر. وإلا تجاهل هذه الرسالة: لن تصلك أي رسالة أخرى.",
    resubscribeCta: "نعم، أريد تلقي التنبيهات من جديد",
    resubscribeText: (name, url) =>
      `مرحباً ${name}،\n\nلتلقي تنبيهات البث المباشر من جديد، أكّد من هنا: ${url}\n\nإذا لم تكن أنت، تجاهل هذه الرسالة.`,
    footerQuestion: "لا تريد تلقي المزيد من التنبيهات؟",
    footerLink: "إلغاء الاشتراك",
    footerText: "إلغاء الاشتراك",
    pageTitle: "تنبيهات البث المباشر · Dani Inmigración",
    invalidLink: "هذا الرابط غير صالح.",
    alreadyUnsubscribed: "لم تعد تتلقى تنبيهات البث المباشر.",
    unsubscribeQuestion: (name) => `${name}، هل تريد التوقف عن تلقي تنبيهات البث المباشر؟`,
    unsubscribeButton: "نعم، ألغِ اشتراكي",
    unsubscribed: (name) => `تم يا ${name}. لن تصلك تنبيهات البث المباشر بعد الآن.`,
    alreadySubscribed: "أنت مسجّل بالفعل: ستصلك تنبيهات البث المباشر.",
    resubscribeQuestion: (name) => `${name}، هل تريد تلقي تنبيهات البث المباشر من جديد؟`,
    resubscribeButton: "نعم، أعد تسجيلي",
    resubscribed: (name) => `مرحباً بعودتك يا ${name}! ستصلك تنبيهات البث المباشر القادمة.`,
    backToSite: "العودة إلى الموقع",
  },
};

/** « 2 h 15 min », « 5 min » (ou équivalent arabe). */
export function formatRemaining(ms, lang) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (lang === "ar") {
    const hh = h ? `${h} ${h === 1 ? "ساعة" : h === 2 ? "ساعتين" : "ساعات"}` : "";
    const mm = m ? `${m} دقيقة` : "";
    return [hh, mm].filter(Boolean).join(" و") || "دقيقة";
  }
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
