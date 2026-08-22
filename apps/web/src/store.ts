import { create } from "zustand";
import type { Language } from "@mudra-sanchay/shared";
import i18n from "./i18n";

type SessionState = {
  token: string | null;
  language: Language;
  setToken: (token: string | null) => void;
  setLanguage: (language: Language) => void;
};

const savedToken = localStorage.getItem("ms-token");
const savedLanguage = (localStorage.getItem("ms-language") as Language | null) ?? "en";

export const useSessionStore = create<SessionState>((set) => ({
  token: savedToken,
  language: savedLanguage,
  setToken: (token) => {
    if (token) localStorage.setItem("ms-token", token);
    else localStorage.removeItem("ms-token");
    set({ token });
  },
  setLanguage: (language) => {
    localStorage.setItem("ms-language", language);
    void i18n.changeLanguage(language);
    set({ language });
  }
}));
