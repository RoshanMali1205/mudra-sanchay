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
        <div>
          <h1>{t("nav.farmers")}</h1>
          <p className="muted">{t("farmer.searchPlaceholder")}</p>
        </div>
        <Link className="ms-btn ms-btn-primary" to="/farmers/new">
          {t("farmer.new")}
        </Link>
      </header>
      <div className="filters-panel search-bar">
        <input
          className="search-input"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("farmer.searchPlaceholder")}
          aria-label={t("action.search")}
        />
        <label className="ms-check">
          <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />
          <span>{t("farmer.archived")}</span>
        </label>
      </div>
      {data.length === 0 ? (
        <EmptyState
          title={t("nav.farmers")}
          body={t("farmer.empty")}
          imageSrc="/images/farm-fields.png"
          imageAlt="Farm fields"
        />
      ) : (
        <div className="stack-list">
          {[...data]
            .sort((a, b) => b.outstandingPaise - a.outstandingPaise)
            .map((farmer, index) => (
              <Link key={farmer.id} to={`/farmers/${farmer.id}`} className="ms-card entity-card">
                <img
                  className="entity-card-media"
                  src={index % 2 === 0 ? "/images/tile-farmer.svg" : "/images/farm-fields.png"}
                  alt=""
                />
                <div className="entity-card-body">
                  <div className="row-between">
                    <strong>{farmer.fullName}</strong>
                    <span className="entity-code">{farmer.farmerCode}</span>
                  </div>
                  <p className="muted">
                    {farmer.village}
                    {farmer.mobile ? ` · ${farmer.mobile}` : ""}
                    {farmer.totalCrates ? ` · ${farmer.totalCrates} ${t("trip.crates")}` : ""}
                    {farmer.active ? "" : ` · ${t("action.archive")}`}
                  </p>
                  <p>
                    {t("farmer.outstandingBalance")}:{" "}
                    <strong className={farmer.outstandingPaise > 0 ? "due-amount" : "due-zero"}>
                      {formatInrFromPaise(farmer.outstandingPaise)}
                    </strong>
                  </p>
                </div>
              </Link>
            ))}
        </div>
      )}
    </section>
  );
}
