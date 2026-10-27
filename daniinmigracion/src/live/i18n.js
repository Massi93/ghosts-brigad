/**
 * Textes de la page /live dans les trois langues du site (es, fr, ar).
 * La langue est celle choisie sur www.daniinmigracion.com (même origine :
 * le site la garde dans localStorage « lang »), sinon celle du navigateur.
 */

const TEXTS = {
  es: {
    back: "Volver al sitio",
    defaultTitle: "Live con Dani",
    fullscreen: "Pantalla completa",
    reconnecting: "Dani perdió la conexión. Reconectando…",
    enableSound: "Toca para activar el sonido",
    sendHeart: "Enviar me gusta",
    doubleTap: "Toca dos veces para enviar ❤️",
    endedTitle: "El live ha terminado",
    endedText: "¡Gracias por acompañarnos! Te esperamos en el próximo.",
    notifyNext: "Avisarme del próximo live",
    fullTitle: "El live está lleno",
    fullText: "Se alcanzó el máximo de espectadores. Inténtalo en unos minutos.",
    noneTitle: "No hay ningún live ahora",
    noneText: "Inscríbete y te avisaremos del próximo directo.",
    register: "Inscribirme",
    waitingDani: "Esperando a Dani…",
    connecting: "Conectando con el directo…",
    soon: "Próximamente",
    daniSoon: "Dani se conectará en un momento…",
    autoRefresh: "Esta página se actualizará sola cuando empiece.",
    viewers: "espectadores",
  },
  fr: {
    back: "Retour au site",
    defaultTitle: "Live avec Dani",
    fullscreen: "Plein écran",
    reconnecting: "Dani a perdu la connexion. Reconnexion…",
    enableSound: "Touchez pour activer le son",
    sendHeart: "Envoyer un j'aime",
    doubleTap: "Touchez deux fois pour envoyer ❤️",
    endedTitle: "Le live est terminé",
    endedText: "Merci d'avoir été avec nous ! Rendez-vous au prochain.",
    notifyNext: "Me prévenir du prochain live",
    fullTitle: "Le live est complet",
    fullText: "Le nombre maximum de spectateurs est atteint. Réessayez dans quelques minutes.",
    noneTitle: "Aucun live en ce moment",
    noneText: "Inscrivez-vous et nous vous préviendrons du prochain direct.",
    register: "M'inscrire",
    waitingDani: "En attente de Dani…",
    connecting: "Connexion au direct…",
    soon: "Bientôt",
    daniSoon: "Dani se connecte dans un instant…",
    autoRefresh: "Cette page se mettra à jour toute seule au début du live.",
    viewers: "spectateurs",
  },
  ar: {
    back: "العودة إلى الموقع",
    defaultTitle: "بث مباشر مع داني",
    fullscreen: "ملء الشاشة",
    reconnecting: "انقطع اتصال داني. جارٍ إعادة الاتصال…",
    enableSound: "اضغط لتشغيل الصوت",
    sendHeart: "أرسل إعجاباً",
    doubleTap: "اضغط مرتين لإرسال ❤️",
    endedTitle: "انتهى البث المباشر",
    endedText: "شكراً لمتابعتك! نلتقي في البث القادم.",
    notifyNext: "أعلمني بالبث القادم",
    fullTitle: "البث المباشر ممتلئ",
    fullText: "تم بلوغ الحد الأقصى من المشاهدين. حاول بعد بضع دقائق.",
    noneTitle: "لا يوجد بث مباشر الآن",
    noneText: "سجّل وسنخبرك بموعد البث القادم.",
    register: "سجّلني",
    waitingDani: "في انتظار داني…",
    connecting: "جارٍ الاتصال بالبث المباشر…",
    soon: "قريباً",
    daniSoon: "سيتصل داني بعد لحظات…",
    autoRefresh: "ستتحدّث هذه الصفحة تلقائياً عند بدء البث.",
    viewers: "مشاهد",
  },
};

/** Langue de la page (es, fr ou ar). */
export function pageLang() {
  let lang = "";
  try {
    lang = localStorage.getItem("lang") || "";
  } catch {
    // stockage indisponible
  }
  lang = (lang || navigator.language || "es").slice(0, 2).toLowerCase();
  return TEXTS[lang] ? lang : "es";
}

/** Locale Intl (chiffres latins en arabe, comme sur le site). */
export function intlLocale(lang) {
  return lang === "ar" ? "ar-u-nu-latn" : lang;
}

export function liveTexts(lang) {
  return TEXTS[lang] ?? TEXTS.es;
}
