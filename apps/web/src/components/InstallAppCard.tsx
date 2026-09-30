import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function InstallAppCard() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone) {
      setInstalled(true);
      return;
    }

    function onPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setDeferred(event);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } finally {
      setDeferred(null);
      setBusy(false);
    }
  }

  return (
    <article className="ms-card form-card">
      <h2 style={{ margin: 0 }}>{t("settings.installTitle")}</h2>
      <p className="muted" style={{ margin: "8px 0 0" }}>
        {installed ? t("settings.installDone") : t("settings.installHint")}
      </p>
      {!installed && deferred ? (
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button className="ms-btn ms-btn-primary" disabled={busy} onClick={() => void install()}>
            {t("settings.installAction")}
          </button>
        </div>
      ) : null}
      {!installed && !deferred ? (
        <p className="muted" style={{ margin: "10px 0 0" }}>
          {t("settings.installManual")}
        </p>
      ) : null}
    </article>
  );
}
