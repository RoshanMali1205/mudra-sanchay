import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { FarmerSummary } from "@mudra-sanchay/shared";
import { api, ApiError } from "../api";
import { ConfirmDialog, SaveStatus } from "../components/UiBits";

export function NewFarmerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(null);

  async function save(body: Record<string, unknown>, confirmDuplicate = false) {
    setState("saving");
    setError("");
    try {
      const farmer = await api<FarmerSummary>("/farmers", {
        method: "POST",
        headers: confirmDuplicate ? { "x-confirm-duplicate": "true" } : undefined,
        body: JSON.stringify(body)
      });
      setState("saved");
      navigate(`/farmers/${farmer.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "POSSIBLE_DUPLICATE") {
        setPendingBody(body);
        setState("idle");
        return;
      }
      setState("error");
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save({
      fullName: form.get("fullName"),
      village: form.get("village"),
      mobile: form.get("mobile") || undefined,
      openingBalancePaise: Math.round(Number(form.get("opening") || 0) * 100)
    });
  }

  return (
    <section>
      <header className="page-header">
        <h1>{t("farmer.new")}</h1>
      </header>
      <form className="ms-card form-card" onSubmit={onSubmit}>
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
        <label className="ms-field">
          <span className="ms-label">{t("farmer.opening")}</span>
          <input name="opening" type="number" min={0} step="1" defaultValue={0} />
        </label>
        {error ? <p className="ms-error">{error}</p> : null}
        <SaveStatus state={state} saved={t("status.saved")} saving={t("status.saving")} error={t("status.error")} />
        <div className="form-actions">
          <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
            {t("action.save")}
          </button>
        </div>
      </form>
      {pendingBody ? (
        <ConfirmDialog
          title={t("farmer.new")}
          body={t("farmer.duplicate")}
          confirmLabel={t("action.confirm")}
          cancelLabel={t("action.cancel")}
          onCancel={() => setPendingBody(null)}
          onConfirm={() => {
            const body = pendingBody;
            setPendingBody(null);
            void save(body, true);
          }}
        />
      ) : null}
    </section>
  );
}
