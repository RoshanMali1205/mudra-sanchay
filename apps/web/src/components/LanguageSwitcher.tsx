import { useTranslation } from "react-i18next";
import type { Language } from "@mudra-sanchay/shared";
import { useSessionStore } from "../store";
import { api } from "../api";

const languages: Language[] = ["en", "hi", "mr"];

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = useSessionStore((state) => state.language);
  const setLanguage = useSessionStore((state) => state.setLanguage);

  return (
    <div className="language-switcher" role="group" aria-label={t("settings.language")}>
      {languages.map((code) => (
        <button
          key={code}
          type="button"
          className={language === code ? "active" : ""}
          onClick={() => {
            setLanguage(code);
            if (!useSessionStore.getState().token) return;
            void api("/me/preferences", {
              method: "PATCH",
              body: JSON.stringify({ preferredLanguage: code })
            }).catch(() => undefined);
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
