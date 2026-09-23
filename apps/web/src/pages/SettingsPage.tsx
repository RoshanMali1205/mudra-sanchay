import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { ConfirmDialog } from "../components/UiBits";
import { InstallAppCard } from "../components/InstallAppCard";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useMe } from "../hooks";

export function SettingsPage() {
  const { t } = useTranslation();
  const { data, refetch } = useMe();
  const queryClient = useQueryClient();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState("");
  const [clearError, setClearError] = useState("");

  async function clearData() {
    setClearing(true);
    setClearError("");
    setClearMessage("");
    try {
      const result = await api<{ ok: boolean; message: string }>("/business/clear-data", {
        method: "POST",
        body: JSON.stringify({ confirm: "CLEAR" })
      });
      setClearMessage(result.message);
      await Promise.all([queryClient.invalidateQueries(), refetch()]);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : t("status.error"));
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <h1>{t("settings.title")}</h1>
        <p className="muted">{t("more.settingsHint")}</p>
      </header>
      <div className="stack-list">
        <InstallAppCard />
        <article className="ms-card form-card">
          <div className="row-between">
            <div>
              <h2 style={{ margin: 0 }}>{t("settings.language")}</h2>
              <p className="muted">{t("settings.language")}</p>
            </div>
            <img className="entity-card-media" src="/images/tile-settings.svg" alt="" />
          </div>
          <LanguageSwitcher />
        </article>
        <article className="ms-card form-card">
          <h2 style={{ margin: 0 }}>{t("settings.business")}</h2>
          <p style={{ margin: 0 }}>{data?.business?.printName}</p>
          <p className="muted">{data?.business?.ownerName}</p>
        </article>
        <article className="ms-card form-card">
          <h2 style={{ margin: 0 }}>{t("settings.clearTitle")}</h2>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            {t("settings.clearHint")}
          </p>
          {clearMessage ? (
            <p className="muted" style={{ margin: "10px 0 0" }}>
              {clearMessage}
            </p>
          ) : null}
          {clearError ? <p className="ms-error">{clearError}</p> : null}
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button className="ms-btn ms-btn-ghost" disabled={clearing} onClick={() => setConfirmClear(true)}>
              {clearing ? t("status.saving") : t("settings.clearAction")}
            </button>
          </div>
        </article>
      </div>
      {confirmClear ? (
        <ConfirmDialog
          title={t("settings.clearTitle")}
          body={t("settings.clearConfirm")}
          confirmLabel={t("action.confirm")}
          cancelLabel={t("action.cancel")}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => void clearData()}
        />
      ) : null}
    </section>
  );
}
