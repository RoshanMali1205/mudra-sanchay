import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, type FarmerSummary, type LedgerLine } from "@mudra-sanchay/shared";
import { MetricCard } from "@mudra-sanchay/ui";
import { api } from "../api";

export function FarmerProfilePage() {
  const { t } = useTranslation();
  const { farmerId } = useParams();
  const { data } = useQuery({
    queryKey: ["farmer", farmerId],
    enabled: Boolean(farmerId),
    queryFn: () =>
      api<{ farmer: FarmerSummary; ledger: LedgerLine[] }>(`/farmers/${farmerId}`)
  });

  if (!data) return <p>Loading…</p>;
  const { farmer, ledger } = data;

  return (
    <section>
      <header className="page-header">
        <h1>{farmer.fullName}</h1>
        <p className="muted">
          {farmer.farmerCode} · {farmer.village}
        </p>
      </header>
      <div className="metric-grid">
        <MetricCard label={t("trip.crates")} value={String(farmer.totalCrates)} />
        <MetricCard label={t("dashboard.todayIncome")} value={formatInrFromPaise(farmer.freightPaise)} tone="income" />
        <MetricCard label={t("dashboard.received")} value={formatInrFromPaise(farmer.paidPaise)} />
        <MetricCard label={t("farmer.outstandingBalance")} value={formatInrFromPaise(farmer.outstandingPaise)} tone="accent" />
      </div>
      <div className="row-between" style={{ margin: "16px 0" }}>
        <Link className="ms-btn ms-btn-primary" to="/payments/new">
          {t("payment.new")}
        </Link>
        <button className="ms-btn ms-btn-ghost">{t("farmer.statement")}</button>
      </div>
      {ledger.map((line) => (
        <article key={line.id} className="list-card ms-card" style={{ marginBottom: 10 }}>
          <div className="row-between">
            <strong>{line.date}</strong>
            <span>{formatInrFromPaise(line.runningBalancePaise)}</span>
          </div>
          <p className="muted">{line.description}</p>
        </article>
      ))}
    </section>
  );
}
