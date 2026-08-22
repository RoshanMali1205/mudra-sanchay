import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { FarmerSummary } from "@mudra-sanchay/shared";
import { api } from "../api";

export function NewFarmerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const farmer = await api<FarmerSummary>("/farmers", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          village: form.get("village"),
          mobile: form.get("mobile") || undefined
        })
      });
      navigate(`/farmers/${farmer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  }

  return (
    <section>
      <header className="page-header">
        <h1>{t("farmer.new")}</h1>
      </header>
      <form className="ms-card list-card" onSubmit={onSubmit}>
        <label className="ms-field">
          <span className="ms-label">{t("farmer.name")}</span>
          <input name="fullName" required minLength={2} />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("farmer.village")}</span>
          <input name="village" required minLength={2} />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("farmer.mobile")}</span>
          <input name="mobile" inputMode="tel" />
        </label>
        {error ? <p className="ms-error">{error}</p> : null}
        <button className="ms-btn ms-btn-primary">{t("action.save")}</button>
      </form>
    </section>
  );
}
