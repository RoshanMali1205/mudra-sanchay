import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DEVELOPER_FOOTER, formatInrFromPaise, kolkataToday, resolveDateRange, type DashboardSummary, type FarmerSummary } from "@mudra-sanchay/shared";
import { MetricCard } from "@mudra-sanchay/ui";
import { api } from "../api";
import { DateRangePicker } from "../components/UiBits";
import { downloadExcel } from "../lib/export";

export function ReportsPage() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState("month");
  const [from, setFrom] = useState(resolveDateRange("month").from);
  const [to, setTo] = useState(kolkataToday());
  const range = useMemo(() => resolveDateRange(preset, from, to), [preset, from, to]);
  const { data } = useQuery({
    queryKey: ["dashboard", range.label, range.from, range.to],
    queryFn: () =>
      api<DashboardSummary>(`/dashboard/summary?preset=${range.label}&from=${range.from}&to=${range.to}`)
  });
  const { data: outstanding = [] } = useQuery({
    queryKey: ["outstanding"],
    queryFn: () => api<FarmerSummary[]>("/reports/outstanding")
  });

  return (
    <section>
      <header className="page-header">
        <h1>{t("reports.title")}</h1>
        <DateRangePicker
          preset={preset}
          onPreset={(value) => {
            setPreset(value);
            const next = resolveDateRange(value, from, to);
            setFrom(next.from);
            setTo(next.to);
          }}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          labels={{
            today: t("range.today"),
            week: t("range.week"),
            month: t("range.month"),
            quarter: t("range.quarter"),
            half_year: t("range.half_year"),
            year: t("range.year"),
            custom: t("range.custom")
          }}
        />
      </header>
      <div className="metric-grid">
        <MetricCard label={t("reports.income")} value={formatInrFromPaise(data?.freightPaise ?? 0)} tone="income" />
        <MetricCard label={t("reports.expenses")} value={formatInrFromPaise(data?.expensesPaise ?? 0)} tone="expense" />
        <MetricCard label={t("reports.outstanding")} value={formatInrFromPaise(data?.outstandingPaise ?? 0)} />
        <MetricCard label={t("reports.profit")} value={formatInrFromPaise(data?.accrualProfitPaise ?? 0)} tone="accent" hint={t("dashboard.accrualHint")} />
      </div>
      <button
        className="ms-btn ms-btn-accent"
        style={{ marginTop: 16 }}
        onClick={() =>
          downloadExcel("mudra-sanchay-report", [
            {
              name: "Summary",
              rows: [
                ["From", range.from],
                ["To", range.to],
                ["Income", (data?.freightPaise ?? 0) / 100],
                ["Received", (data?.receivedPaise ?? 0) / 100],
                ["Expenses", (data?.expensesPaise ?? 0) / 100],
                ["Accrual profit", (data?.accrualProfitPaise ?? 0) / 100],
                ["Cash surplus", (data?.cashSurplusPaise ?? 0) / 100]
              ]
            },
            {
              name: "Outstanding",
              rows: [
                ["Farmer", "Village", "Balance"],
                ...outstanding.map((farmer) => [farmer.fullName, farmer.village, farmer.outstandingPaise / 100])
              ]
            }
          ])
        }
      >
        {t("action.excel")}
      </button>
      {outstanding.map((farmer) => (
        <article key={farmer.id} className="list-card ms-card" style={{ marginTop: 10 }}>
          <div className="row-between">
            <strong>{farmer.fullName}</strong>
            <span>{formatInrFromPaise(farmer.outstandingPaise)}</span>
          </div>
        </article>
      ))}
      <p className="muted" style={{ marginTop: 24 }}>
        {DEVELOPER_FOOTER}
      </p>
    </section>
  );
}
