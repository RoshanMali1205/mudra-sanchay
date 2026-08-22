import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@mudra-sanchay/i18n";

const saved = localStorage.getItem("ms-language") ?? "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: saved,
  fallbackLng: "en",
  ns: ["common"],
  defaultNS: "common",
  interpolation: { escapeValue: false }
});

export default i18n;
