import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useSessionStore } from "../store";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import type { SessionUser } from "@mudra-sanchay/shared";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useSessionStore((state) => state.setToken);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ token: string; user: SessionUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          password: form.get("password")
        })
      });
      setToken(data.token);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("status.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-layout">
      <form className="auth-card ms-card" onSubmit={onSubmit}>
        <LanguageSwitcher />
        <h1>{t("auth.registerTitle")}</h1>
        <p className="muted">{t("auth.registerSubtitle")}</p>
        <label className="ms-field">
          <span className="ms-label">{t("auth.fullName")}</span>
          <input name="fullName" required minLength={2} />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("auth.email")}</span>
          <input name="email" type="email" required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("auth.password")}</span>
          <input name="password" type="password" minLength={8} required />
        </label>
        {error ? <p className="ms-error">{error}</p> : null}
        <button className="ms-btn ms-btn-primary" disabled={pending}>
          {t("action.register")}
        </button>
        <Link to="/auth/login">{t("auth.hasAccount")}</Link>
      </form>
    </div>
  );
}
