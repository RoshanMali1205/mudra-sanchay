import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useMe } from "../hooks";

export function SettingsPage() {
  const { t } = useTranslation();
  const { data } = useMe();

  return (
    <section>
      <header className="page-header">
        <h1>{t("settings.title")}</h1>
        <p className="muted">{t("more.settingsHint")}</p>
      </header>
      <div className="stack-list">
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
      </div>
    </section>
  );
}
