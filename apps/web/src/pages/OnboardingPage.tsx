import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PRINT_BRAND, rupeesToPaise } from "@mudra-sanchay/shared";
import { api } from "../api";
import { useMe } from "../hooks";
import { useSessionStore } from "../store";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);
  const { data, isLoading, isError, refetch } = useMe();
  const [error, setError] = useState("");

  if (!token) return <Navigate to="/auth/login" replace />;
  if (isError) return <Navigate to="/auth/login" replace />;
  if (isLoading || !data) return <div className="auth-layout">Loading…</div>;
  if (data.user.onboarded) return <Navigate to="/dashboard" replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/auth/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          businessName: form.get("businessName"),
          printName: form.get("printName"),
          ownerName: form.get("ownerName"),
          phone: form.get("phone") || undefined,
          defaultRatePaise: rupeesToPaise(Number(form.get("defaultRate") || 25)),
          vehicleRegistration: form.get("vehicleRegistration"),
          vehicleDisplayName: form.get("vehicleDisplayName"),
          originName: form.get("originName"),
          destinationName: form.get("destinationName")
        })
      });
      await refetch();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  }

  return (
    <div className="auth-layout">
      <form className="auth-card ms-card" onSubmit={onSubmit}>
        <img className="scene-photo" src="/images/farm-fields.png" alt="Tomato farm fields" />
        <LanguageSwitcher />
        <h1>{t("onboarding.title")}</h1>
        <p className="muted">{t("onboarding.subtitle")}</p>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.businessName")}</span>
          <input name="businessName" defaultValue="Radhe Krishna Transport" required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.printName")}</span>
          <input name="printName" defaultValue={PRINT_BRAND} required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.ownerName")}</span>
          <input name="ownerName" defaultValue={data.user.fullName} required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.phone")}</span>
          <input name="phone" />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.vehicle")}</span>
          <input name="vehicleRegistration" placeholder="MH-15-XX-0000" required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.vehicleName")}</span>
          <input name="vehicleDisplayName" defaultValue="Pickup 1" required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.origin")}</span>
          <input name="originName" defaultValue="Ugaon" required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.destination")}</span>
          <input name="destinationName" defaultValue="Pimpalgaon Baswant" required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("onboarding.defaultRate")}</span>
          <input name="defaultRate" type="number" min={0} step="1" defaultValue={25} required />
        </label>
        {error ? <p className="ms-error">{error}</p> : null}
        <button className="ms-btn ms-btn-primary">{t("action.continue")}</button>
      </form>
    </div>
  );
}
