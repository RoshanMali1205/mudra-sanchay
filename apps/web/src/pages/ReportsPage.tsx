import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  DEVELOPER_FOOTER,
  PRINT_BRAND,
  formatInrFromPaise,
  kolkataToday,
  resolveDateRange,
  type DailySheet,
  type DashboardSummary,
  type FarmerSummary
} from "@mudra-sanchay/shared";
import { MetricCard } from "@mudra-sanchay/ui";
import { api } from "../api";
import { DateRangePicker } from "../components/UiBits";
import { downloadExcel, reportPdfDocument } from "../lib/export";
import { downloadPdf } from "../lib/pdf";

export function ReportsPage() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState("month");
  const [from, setFrom] = useState(resolveDateRange("month").from);
  const [to, setTo] = useState(kolkataToday());
  const [exporting, setExporting] = useState(false);
  const range = useMemo(() => resolveDateRange(preset, from, to), [preset, from, to]);
  const { data } = useQuery({
    queryKey: ["dashboard", range.label, range.from, range.to],
    queryFn: () =>
      api<DashboardSummary>(`/dashboard/summary?preset=${range.label}&from=${range.from}&to=${range.to}`)
  });
  const { data: sheet } = useQuery({
    queryKey: ["daily-sheet", range.label, range.from, range.to],
    queryFn: () =>
      api<DailySheet>(`/reports/daily-sheet?preset=${range.label}&from=${range.from}&to=${range.to}`)
  });
  const { data: outstanding = [] } = useQuery({
    queryKey: ["outstanding"],
    queryFn: () => api<FarmerSummary[]>("/reports/outstanding")
  });

  const exportLabels = {
    title: t("reports.title"),
    farmer: t("farmer.name"),
    village: t("farmer.village"),
    balance: t("payment.balance"),
    income: t("reports.income"),
    received: t("dashboard.received"),
    expenses: t("reports.expenses"),
    profit: t("reports.profit"),
    cash: t("dashboard.cashSurplus"),
    outstanding: t("reports.outstanding"),
    crates: t("dashboard.crates"),
    trips: t("dashboard.trips"),
    farmers: t("trip.farmersCount"),
    daySheet: t("reports.daySheet"),
    dues: t("reports.dues")
  };

  const farmers = sheet?.farmers ?? [];
  const periodLabel = `${range.from} → ${range.to}`;

  return (
    <section>
      <header className="page-header no-print">
        <h1>{t("reports.title")}</h1>
        <p className="muted">{t("reports.subtitle")}</p>
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

      <article className="ms-card report-sheet print-sheet">
        <header className="report-letterhead">
          <div className="report-letterhead-inner">
            <div className="report-brand-row">
              <img src="/logo.svg" alt="" />
              <div>
                <h1>{PRINT_BRAND}</h1>
                <p>{t("reports.businessReport")}</p>
              </div>
            </div>
            <span className="report-period">
              {t("reports.period")}: {periodLabel}
            </span>
          </div>
        </header>

        <div className="report-toolbar no-print">
          <button
            className="ms-btn ms-btn-primary"
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              void downloadPdf(reportPdfDocument(data, outstanding, range.from, range.to, exportLabels, sheet)).finally(
                () => setExporting(false)
              );
            }}
          >
            {exporting ? t("status.saving") : t("action.pdf")}
          </button>
          <button
            className="ms-btn ms-btn-accent"
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
                    ["Cash surplus", (data?.cashSurplusPaise ?? 0) / 100],
                    ["Farmers", sheet?.farmerCount ?? data?.farmerCount ?? 0],
                    ["Crates", sheet?.crates ?? data?.crates ?? 0]
                  ]
                },
                {
                  name: "Daily farmers",
                  rows: [
                    ["Farmer", "Code", "Village", "Crates", "Freight", "Due"],
                    ...farmers.map((farmer) => [
                      farmer.fullName,
                      farmer.farmerCode,
                      farmer.village,
                      farmer.crates,
                      farmer.freightPaise / 100,
                      farmer.outstandingPaise / 100
                    ])
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
          <button className="ms-btn ms-btn-ghost" onClick={() => window.print()}>
            {t("action.print")}
          </button>
        </div>

        <div className="report-body">
          <div className="metric-grid">
            <MetricCard
              label={t("reports.income")}
              value={formatInrFromPaise(data?.freightPaise ?? 0)}
              tone="income"
              imageSrc="/images/farm-fields.png"
              imageAlt=""
              imagePosition="center 30%"
            />
            <MetricCard
              label={t("reports.expenses")}
              value={formatInrFromPaise(data?.expensesPaise ?? 0)}
              tone="expense"
              imageSrc="/images/tile-expense.svg"
              imageAlt=""
            />
            <MetricCard
              label={t("reports.outstanding")}
              value={formatInrFromPaise(data?.outstandingPaise ?? 0)}
              imageSrc="/images/tomato-crates.png"
              imageAlt=""
              imagePosition="center 45%"
            />
            <MetricCard
              label={t("reports.profit")}
              value={formatInrFromPaise(data?.accrualProfitPaise ?? 0)}
              tone="accent"
              hint={t("dashboard.accrualHint")}
              imageSrc="/images/tile-payment.svg"
              imageAlt=""
            />
            <MetricCard
              label={t("trip.farmersCount")}
              value={String(sheet?.farmerCount ?? data?.farmerCount ?? 0)}
              imageSrc="/images/tile-farmer.svg"
              imageAlt=""
            />
            <MetricCard
              label={t("dashboard.crates")}
              value={String(sheet?.crates ?? data?.crates ?? 0)}
              imageSrc="/images/tomato-crate-square.png"
              imageAlt=""
            />
            <MetricCard
              label={t("dashboard.trips")}
              value={String(sheet?.trips ?? data?.trips ?? 0)}
              imageSrc="/images/tile-trip.svg"
              imageAlt=""
            />
            <MetricCard
              label={t("dashboard.received")}
              value={formatInrFromPaise(data?.receivedPaise ?? 0)}
              imageSrc="/images/tile-receipt.svg"
              imageAlt=""
            />
          </div>

          <div className="report-summary-band">
            <div className="report-summary-item">
              <span>{t("dashboard.cashSurplus")}</span>
              <strong>{formatInrFromPaise(data?.cashSurplusPaise ?? 0)}</strong>
            </div>
            <div className="report-summary-item">
              <span>{t("reports.profit")}</span>
              <strong>{formatInrFromPaise(data?.accrualProfitPaise ?? 0)}</strong>
            </div>
            <div className="report-summary-item">
              <span>{t("reports.outstanding")}</span>
              <strong className={(data?.outstandingPaise ?? 0) > 0 ? "due-amount" : undefined}>
                {formatInrFromPaise(data?.outstandingPaise ?? 0)}
              </strong>
            </div>
            <div className="report-summary-item">
              <span>{t("trip.farmersCount")}</span>
              <strong>{sheet?.farmerCount ?? data?.farmerCount ?? 0}</strong>
            </div>
          </div>

          <section>
            <div className="report-section-head">
              <h2>{t("reports.daySheet")}</h2>
              <p className="muted">
                {farmers.length} {t("trip.farmersCount")}
              </p>
            </div>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t("farmer.name")}</th>
                    <th>{t("farmer.village")}</th>
                    <th className="num">{t("trip.crates")}</th>
                    <th className="num">{t("reports.income")}</th>
                    <th className="num">{t("payment.balance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {farmers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        {t("reports.emptySheet")}
                      </td>
                    </tr>
                  ) : (
                    farmers.map((farmer) => (
                      <tr key={farmer.farmerId}>
                        <td>
                          <Link to={`/farmers/${farmer.farmerId}`}>{farmer.fullName}</Link>
                          <div className="muted">{farmer.farmerCode}</div>
                        </td>
                        <td>{farmer.village}</td>
                        <td className="num">{farmer.crates}</td>
                        <td className="num">{formatInrFromPaise(farmer.freightPaise)}</td>
                        <td className={`num ${farmer.outstandingPaise > 0 ? "due-amount" : "due-zero"}`}>
                          {formatInrFromPaise(farmer.outstandingPaise)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="report-section-head">
              <h2>{t("reports.dues")}</h2>
              <p className="muted">
                {outstanding.length} {t("trip.farmersCount")}
              </p>
            </div>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t("farmer.name")}</th>
                    <th>{t("farmer.village")}</th>
                    <th className="num">{t("payment.balance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        {t("reports.emptyDues")}
                      </td>
                    </tr>
                  ) : (
                    outstanding.map((farmer) => (
                      <tr key={farmer.id}>
                        <td>
                          <Link to={`/farmers/${farmer.id}`}>{farmer.fullName}</Link>
                        </td>
                        <td>{farmer.village}</td>
                        <td className={`num ${farmer.outstandingPaise > 0 ? "due-amount" : "due-zero"}`}>
                          {formatInrFromPaise(farmer.outstandingPaise)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="report-footer">
          <p className="muted">{DEVELOPER_FOOTER}</p>
        </footer>
      </article>
    </section>
  );
}
