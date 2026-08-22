import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function MorePage() {
  const { t } = useTranslation();
  const links = [
    { to: "/expenses", label: t("more.expenses") },
    { to: "/receipts", label: t("more.receipts") },
    { to: "/payments/new", label: t("more.payments") },
    { to: "/settings", label: t("more.settings") },
    { to: "/audit", label: t("more.audit") }
  ];

  return (
    <section>
      <header className="page-header">
        <h1>{t("more.title")}</h1>
      </header>
      {links.map((link) => (
        <Link key={link.to} to={link.to} className="list-card ms-card" style={{ marginBottom: 12, display: "block" }}>
          {link.label}
        </Link>
      ))}
    </section>
  );
}
