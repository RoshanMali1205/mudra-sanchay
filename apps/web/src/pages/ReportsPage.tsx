import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, type DashboardSummary } from "@mudra-sanchay/shared";
import { MetricCard } from "@mudra-sanchay/ui";
import { api } from "../api";

export function ReportsPage() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardSummary>("/dashboard/summary")
  });

  return (
    <section>
      <header className="page-header">
        <h1>{t("reports.title")}</h1>
        <p className="muted">All Rights Reserved. Developed by Roshan Mali © 2026</p>
      </header>
      <div className="metric-grid">
        <MetricCard label={t("reports.income")} value={formatInrFromPaise(data?.freightPaise ?? 0)} tone="income" />
        <MetricCard label={t("reports.expenses")} value={formatInrFromPaise(data?.expensesPaise ?? 0)} tone="expense" />
        <MetricCard label={t("reports.outstanding")} value={formatInrFromPaise(data?.outstandingPaise ?? 0)} />
        <MetricCard label={t("reports.profit")} value={formatInrFromPaise(data?.accrualProfitPaise ?? 0)} tone="accent" />
      </div>
    </section>
  );
}
