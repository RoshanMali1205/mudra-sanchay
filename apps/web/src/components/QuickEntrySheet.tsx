import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function QuickEntrySheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    { to: "/trips/new", label: t("trip.new") },
    { to: "/payments/new", label: t("payment.new") },
    { to: "/expenses/new", label: t("expense.new") },
    { to: "/receipts/new", label: t("receipt.new") }
  ];

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{t("dashboard.quickActions")}</h2>
        {actions.map((action) => (
          <button
            key={action.to}
            className="ms-btn ms-btn-primary"
            onClick={() => {
              onClose();
              navigate(action.to);
            }}
          >
            {action.label}
          </button>
        ))}
        <button className="ms-btn ms-btn-ghost" onClick={onClose}>
          {t("action.cancel")}
        </button>
      </div>
    </div>
  );
}
