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
      </header>
      <article className="ms-card list-card">
        <h2>{t("settings.language")}</h2>
        <LanguageSwitcher />
      </article>
      <article className="ms-card list-card" style={{ marginTop: 12 }}>
        <h2>{t("settings.business")}</h2>
        <p>{data?.business?.printName}</p>
        <p className="muted">{data?.business?.ownerName}</p>
      </article>
    </section>
  );
}
