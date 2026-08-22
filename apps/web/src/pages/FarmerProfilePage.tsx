import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, type FarmerSummary, type LedgerLine } from "@mudra-sanchay/shared";
import { MetricCard } from "@mudra-sanchay/ui";
import { api } from "../api";

export function FarmerProfilePage() {
  const { t } = useTranslation();
  const { farmerId } = useParams();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["farmer", farmerId],
    enabled: Boolean(farmerId),
    queryFn: () => api<{ farmer: FarmerSummary; ledger: LedgerLine[] }>(`/farmers/${farmerId}`)
  });

  if (!data) return <p>Loading…</p>;
  const { farmer, ledger } = data;

  async function toggleArchive() {
    if (!farmerId) return;
    if (farmer.active) await api(`/farmers/${farmerId}`, { method: "DELETE" });
    else await api(`/farmers/${farmerId}/restore`, { method: "POST" });
    await queryClient.invalidateQueries({ queryKey: ["farmer", farmerId] });
    await queryClient.invalidateQueries({ queryKey: ["farmers"] });
  }

  return (
    <section>
      <header className="page-header">
        <h1>{farmer.fullName}</h1>
        <p className="muted">
          {farmer.farmerCode} · {farmer.village}
          {farmer.mobile ? ` · ${farmer.mobile}` : ""}
        </p>
      </header>
      <div className="metric-grid">
        <MetricCard label={t("trip.crates")} value={String(farmer.totalCrates)} />
        <MetricCard label={t("dashboard.todayIncome")} value={formatInrFromPaise(farmer.freightPaise)} tone="income" />
        <MetricCard label={t("dashboard.received")} value={formatInrFromPaise(farmer.paidPaise)} />
        <MetricCard label={t("farmer.outstandingBalance")} value={formatInrFromPaise(farmer.outstandingPaise)} tone="accent" />
      </div>
      <div className="chip-row" style={{ margin: "16px 0" }}>
        <Link className="ms-btn ms-btn-primary" to={`/payments/new?farmerId=${farmer.id}`}>
          {t("payment.new")}
        </Link>
        <Link className="ms-btn ms-btn-accent" to={`/farmers/${farmer.id}/statement`}>
          {t("farmer.statement")}
        </Link>
        <button className="ms-btn ms-btn-ghost" onClick={() => void toggleArchive()}>
          {farmer.active ? t("action.archive") : t("action.restore")}
        </button>
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
