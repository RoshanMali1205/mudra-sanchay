import en from "../locales/en/common.json";
import hi from "../locales/hi/common.json";
import mr from "../locales/mr/common.json";

export const resources = {
  en: { common: en },
  hi: { common: hi },
  mr: { common: mr }
};

export const supportedLanguages = ["en", "hi", "mr"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
