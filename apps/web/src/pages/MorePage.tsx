import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function MorePage() {
  const { t } = useTranslation();
  const links = [
    {
      to: "/reports",
      label: t("more.reports"),
      hint: t("more.reportsHint"),
      image: "/images/tile-report.svg"
    },
    {
      to: "/expenses",
      label: t("more.expenses"),
      hint: t("more.expensesHint"),
      image: "/images/tile-expense.svg"
    },
    {
      to: "/receipts",
      label: t("more.receipts"),
      hint: t("more.receiptsHint"),
      image: "/images/tile-receipt.svg"
    },
    {
      to: "/payments/new",
      label: t("more.payments"),
      hint: t("more.paymentsHint"),
      image: "/images/tile-payment.svg"
    },
    {
      to: "/settings",
      label: t("more.settings"),
      hint: t("more.settingsHint"),
      image: "/images/tile-settings.svg"
    },
    {
      to: "/audit",
      label: t("more.audit"),
      hint: t("more.auditHint"),
      image: "/images/tile-audit.svg"
    }
  ];

  return (
    <section>
      <header className="page-header">
        <h1>{t("more.title")}</h1>
        <p className="muted">{t("more.subtitle")}</p>
      </header>
      <div className="tile-grid">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="image-tile">
            <img src={link.image} alt="" />
            <strong>{link.label}</strong>
            <span>{link.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
