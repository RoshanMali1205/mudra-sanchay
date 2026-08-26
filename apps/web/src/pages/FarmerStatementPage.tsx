import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  DEVELOPER_FOOTER,
  PRINT_BRAND,
  formatInrFromPaise,
  kolkataToday,
  resolveDateRange,
  type FarmerSummary,
  type LedgerLine
} from "@mudra-sanchay/shared";
import { api } from "../api";
import { DateRangePicker } from "../components/UiBits";
import { downloadExcel, exportStatementPdf, shareStatementPdf, statementRows } from "../lib/export";

export function FarmerStatementPage() {
  const { t, i18n } = useTranslation();
  const { farmerId } = useParams();
  const [preset, setPreset] = useState("month");
  const [from, setFrom] = useState(resolveDateRange("month").from);
  const [to, setTo] = useState(kolkataToday());
  const range = useMemo(
    () => resolveDateRange(preset, from, to),
    [preset, from, to]
  );
  const { data } = useQuery({
    queryKey: ["farmer-statement", farmerId, range.from, range.to],
    enabled: Boolean(farmerId),
    queryFn: () =>
      api<{ farmer: FarmerSummary; ledger: LedgerLine[] }>(
        `/farmers/${farmerId}?from=${range.from}&to=${range.to}`
      )
  });

  const [busy, setBusy] = useState<"pdf" | "share" | null>(null);

  if (!data) return <p>Loading…</p>;
  const { farmer, ledger } = data;
  const message = `Namaskar ${farmer.fullName}, ${range.from} to ${range.to} cha Radhe Krishna Transport statement sobat pathavla aahe. Baki rakkam: ${formatInrFromPaise(farmer.outstandingPaise)}.`;
  const pdfLabels = {
    date: t("trip.date"),
    details: t("nav.trips"),
    crates: t("trip.crates"),
    amount: t("payment.amount"),
    balance: t("payment.balance"),
    outstanding: t("farmer.outstandingBalance"),
    language: i18n.language
  };

  function exportExcel() {
    const sheets = statementRows(farmer, ledger, range.from, range.to);
    downloadExcel(`${farmer.farmerCode}-statement`, [
      { name: "Summary", rows: sheets.summary },
      { name: "Details", rows: sheets.details }
    ]);
  }

  async function exportPdf() {
    setBusy("pdf");
    try {
      await exportStatementPdf(farmer, ledger, range.from, range.to, pdfLabels);
    } finally {
      setBusy(null);
    }
  }

  async function sharePdf() {
    setBusy("share");
    try {
      await shareStatementPdf(farmer, ledger, range.from, range.to, pdfLabels, message, t("farmer.statement"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="statement">
      <header className="page-header no-print">
        <h1>{t("farmer.statement")}</h1>
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
        <div className="chip-row">
          <button className="ms-btn ms-btn-primary" disabled={busy !== null} onClick={() => void exportPdf()}>
            {busy === "pdf" ? t("status.saving") : t("action.pdf")}
          </button>
          <button className="ms-btn ms-btn-ghost" onClick={() => window.print()}>
            {t("action.print")}
          </button>
          <button className="ms-btn ms-btn-accent" onClick={exportExcel}>
            {t("action.excel")}
          </button>
          <button className="ms-btn ms-btn-ghost" disabled={busy !== null} onClick={() => void sharePdf()}>
            {busy === "share" ? t("status.saving") : t("action.whatsapp")}
          </button>
        </div>
      </header>
      <article className="ms-card print-sheet">
        <header className="statement-letterhead">
          <h2>{PRINT_BRAND}</h2>
          <p>
            {farmer.fullName} · {farmer.farmerCode} · {farmer.village}
          </p>
          <p className="report-period" style={{ marginTop: 10 }}>
            {range.from} → {range.to} · {i18n.language}
          </p>
        </header>
        <div className="statement-body">
          <div className="report-summary-band" style={{ marginBottom: 16 }}>
            <div className="report-summary-item">
              <span>{t("farmer.outstandingBalance")}</span>
              <strong className={farmer.outstandingPaise > 0 ? "due-amount" : "due-zero"}>
                {formatInrFromPaise(farmer.outstandingPaise)}
              </strong>
            </div>
            <div className="report-summary-item">
              <span>{t("farmer.mobile")}</span>
              <strong>{farmer.mobile || "—"}</strong>
            </div>
          </div>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t("trip.date")}</th>
                  <th>{t("nav.trips")}</th>
                  <th className="num">{t("trip.crates")}</th>
                  <th className="num">{t("payment.amount")}</th>
                  <th className="num">{t("payment.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((line) => (
                  <tr key={line.id}>
                    <td>{line.date}</td>
                    <td>{line.description}</td>
                    <td className="num">{line.crates ?? ""}</td>
                    <td className="num">{formatInrFromPaise(line.debitPaise || line.creditPaise)}</td>
                    <td className="num">{formatInrFromPaise(line.runningBalancePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="report-footer" style={{ marginTop: 16, padding: 0, border: 0, background: "transparent" }}>
            <p className="muted">{DEVELOPER_FOOTER}</p>
          </footer>
        </div>
      </article>
    </section>
  );
}
