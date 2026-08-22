import { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.alert(t("auth.resetHelp"));
  }

  return (
    <div className="auth-layout">
      <form className="auth-card ms-card" onSubmit={onSubmit}>
        <LanguageSwitcher />
        <h1>{t("auth.resetTitle")}</h1>
        <p className="muted">{t("auth.resetHelp")}</p>
        <label className="ms-field">
          <span className="ms-label">{t("auth.email")}</span>
          <input name="email" type="email" required />
        </label>
        <button className="ms-btn ms-btn-primary">{t("auth.sendLink")}</button>
        <Link to="/auth/login">{t("action.login")}</Link>
      </form>
    </div>
  );
}
