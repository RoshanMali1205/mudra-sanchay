import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { api } from "../api";
import { SaveStatus } from "../components/UiBits";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    setState("saving");
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="auth-layout">
      <form className="auth-card ms-card" onSubmit={(event) => void onSubmit(event)}>
        <LanguageSwitcher />
        <h1>{t("auth.resetTitle")}</h1>
        <p className="muted">{t("auth.resetHelp")}</p>
        <label className="ms-field">
          <span className="ms-label">{t("auth.email")}</span>
          <input name="email" type="email" required />
        </label>
        <SaveStatus state={state} saved={t("auth.resetSent")} saving={t("status.saving")} error={t("status.error")} />
        <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
          {t("auth.sendLink")}
        </button>
        <Link to="/auth/login">{t("action.login")}</Link>
      </form>
    </div>
  );
}
