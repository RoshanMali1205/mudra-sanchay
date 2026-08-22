import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useSessionStore } from "../store";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import type { SessionUser } from "@mudra-sanchay/shared";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useSessionStore((state) => state.setToken);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ token: string; user: SessionUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password")
        })
      });
      setToken(data.token);
      navigate(data.user.onboarded ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("status.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-layout">
      <form className="auth-card ms-card" onSubmit={onSubmit}>
        <div className="brand">
          <img src="/logo.svg" alt="" />
          <div>
            <strong>{t("app.name")}</strong>
            <small>{t("app.brand")}</small>
          </div>
        </div>
        <img className="scene-photo" src="/images/tomato-crates.png" alt="Tomato crates ready for market" />
        <LanguageSwitcher />
        <h1>{t("auth.loginTitle")}</h1>
        <p className="muted">{t("auth.loginSubtitle")}</p>
        <label className="ms-field">
          <span className="ms-label">{t("auth.email")}</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("auth.password")}</span>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            minLength={8}
            required
          />
          <button type="button" className="ms-btn ms-btn-ghost" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? t("action.hidePassword") : t("action.showPassword")}
          </button>
        </label>
        {error ? <p className="ms-error">{error}</p> : null}
        <button className="ms-btn ms-btn-primary" disabled={pending}>
          {pending ? t("status.saving") : t("action.login")}
        </button>
        <div className="row-between">
          <Link to="/auth/forgot-password">{t("auth.forgotPassword")}</Link>
          <Link to="/auth/register">{t("auth.noAccount")}</Link>
        </div>
      </form>
    </div>
  );
}
