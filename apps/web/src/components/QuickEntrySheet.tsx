import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function QuickEntrySheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const actions = [
    { to: "/trips/new", label: t("trip.new") },
    { to: "/payments/new", label: t("payment.new") },
    { to: "/expenses/new", label: t("expense.new") },
    { to: "/receipts/new", label: t("receipt.new") },
    { to: "/farmers/new", label: t("farmer.new") }
  ];

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector("button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-entry-title"
      >
        <h2 id="quick-entry-title">{t("dashboard.quickActions")}</h2>
        {actions.map((action, index) => (
          <button
            key={action.to}
            className={index === 0 ? "ms-btn ms-btn-primary" : "ms-btn ms-btn-ghost"}
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
