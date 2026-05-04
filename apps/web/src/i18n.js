import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";
import pt from "./locales/pt.json";

const LANG_STORAGE_KEY = "invest-agent:lang";

const savedLanguage =
  typeof window !== "undefined"
    ? window.localStorage.getItem(LANG_STORAGE_KEY) || "de"
    : "de";

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
    pt: { translation: pt }
  },
  lng: savedLanguage,
  fallbackLng: "de",
  interpolation: {
    escapeValue: false
  }
});

i18n.on("languageChanged", (lang) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  }
});

export default i18n;
