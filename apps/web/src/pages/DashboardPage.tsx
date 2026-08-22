import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, type DashboardSummary } from "@mudra-sanchay/shared";
import { EmptyState, MetricCard } from "@mudra-sanchay/ui";
import { api } from "../api";

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-IN" : i18n.language === "hi" ? "hi-IN" : "mr-IN";
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardSummary>("/dashboard/summary")
  });

  const money = (paise = 0) => formatInrFromPaise(paise, locale);

  return (
    <section>
      <header className="page-header">
        <h1>{t("dashboard.today")}</h1>
        <p className="muted">{t("dashboard.quickActions")}</p>
      </header>
      <div className="metric-grid">
        <MetricCard label={t("dashboard.todayIncome")} value={money(data?.freightPaise)} tone="income" />
        <MetricCard label={t("dashboard.received")} value={money(data?.receivedPaise)} />
        <MetricCard label={t("dashboard.expenses")} value={money(data?.expensesPaise)} tone="expense" />
        <MetricCard label={t("dashboard.netCash")} value={money(data?.cashSurplusPaise)} tone="accent" />
        <MetricCard label={t("dashboard.crates")} value={String(data?.crates ?? 0)} />
        <MetricCard label={t("dashboard.trips")} value={String(data?.trips ?? 0)} />
        <MetricCard label={t("dashboard.outstanding")} value={money(data?.outstandingPaise)} />
        <MetricCard
          label={t("dashboard.accrualProfit")}
          value={money(data?.accrualProfitPaise)}
          hint={t("dashboard.cashSurplus")}
        />
      </div>
      <div className="quick-grid" style={{ marginTop: 16 }}>
        <Link className="ms-btn ms-btn-primary" to="/trips/new" style={{ display: "grid", placeItems: "center" }}>
          {t("trip.new")}
        </Link>
        <Link className="ms-btn ms-btn-primary" to="/farmers/new" style={{ display: "grid", placeItems: "center" }}>
          {t("farmer.new")}
        </Link>
        <Link className="ms-btn ms-btn-accent" to="/payments/new" style={{ display: "grid", placeItems: "center" }}>
          {t("payment.new")}
        </Link>
        <Link className="ms-btn ms-btn-accent" to="/expenses/new" style={{ display: "grid", placeItems: "center" }}>
          {t("expense.new")}
        </Link>
      </div>
      {data && data.trips === 0 ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState title={t("dashboard.today")} body={t("dashboard.empty")} />
        </div>
      ) : null}
    </section>
  );
}
