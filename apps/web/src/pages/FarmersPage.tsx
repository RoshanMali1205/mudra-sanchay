import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, type FarmerSummary } from "@mudra-sanchay/shared";
import { EmptyState } from "@mudra-sanchay/ui";
import { api } from "../api";

export function FarmersPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["farmers", q, archived],
    queryFn: () =>
      api<FarmerSummary[]>(
        `/farmers?archived=${archived ? "true" : "false"}${q ? `&q=${encodeURIComponent(q)}` : ""}`
      )
  });

  return (
    <section>
      <header className="page-header row-between">
        <h1>{t("nav.farmers")}</h1>
        <Link className="ms-btn ms-btn-primary" to="/farmers/new">
          {t("farmer.new")}
        </Link>
      </header>
      <input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder={t("farmer.searchPlaceholder")}
        aria-label={t("action.search")}
      />
      <label className="row-between" style={{ marginTop: 8 }}>
        <span>{t("farmer.archived")}</span>
        <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />
      </label>
      {data.length === 0 ? (
        <EmptyState title={t("nav.farmers")} body={t("farmer.empty")} />
      ) : (
        data.map((farmer) => (
          <Link key={farmer.id} to={`/farmers/${farmer.id}`} className="list-card ms-card" style={{ marginTop: 12, display: "block" }}>
            <div className="row-between">
              <strong>{farmer.fullName}</strong>
              <span>{farmer.farmerCode}</span>
            </div>
            <p className="muted">
              {farmer.village}
              {farmer.mobile ? ` · ${farmer.mobile}` : ""}
              {farmer.active ? "" : ` · ${t("action.archive")}`}
            </p>
            <p>
              {t("farmer.outstandingBalance")}: {formatInrFromPaise(farmer.outstandingPaise)}
            </p>
          </Link>
        ))
      )}
    </section>
  );
}
