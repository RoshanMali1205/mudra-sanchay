import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, type Trip } from "@mudra-sanchay/shared";
import { EmptyState, StatusChip } from "@mudra-sanchay/ui";
import { api } from "../api";

function tripFarmerCount(trip: Trip) {
  return trip.farmerCount ?? new Set(trip.entries.map((entry) => entry.farmerId)).size;
}

export function TripsPage() {
  const { t } = useTranslation();
  const [date, setDate] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["trips", date],
    queryFn: () => api<Trip[]>(date ? `/trips?date=${date}` : "/trips")
  });

  return (
    <section>
      <header className="page-header row-between">
        <div>
          <h1>{t("nav.trips")}</h1>
          <p className="muted">{t("trip.date")}</p>
        </div>
        <Link className="ms-btn ms-btn-primary" to="/trips/new">
          {t("trip.new")}
        </Link>
      </header>
      <div className="filters-panel">
        <label className="ms-field">
          <span className="ms-label">{t("trip.date")}</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      {data.length === 0 ? (
        <EmptyState
          title={t("nav.trips")}
          body={t("dashboard.empty")}
          imageSrc="/images/tomato-crate-square.png"
          imageAlt="Tomato crate"
        />
      ) : (
        <div className="stack-list">
          {data.map((trip) => (
            <Link key={trip.id} to={`/trips/${trip.id}`} className="ms-card entity-card">
              <img className="entity-card-media" src="/images/tile-trip.svg" alt="" />
              <div className="entity-card-body">
                <div className="row-between">
                  <strong>
                    {trip.tripDate} · {t("trip.number")} {trip.tripNumber}
                  </strong>
                  <StatusChip
                    label={t(`trip.${trip.status}`)}
                    tone={trip.status === "completed" ? "success" : "warning"}
                  />
                </div>
                <p className="muted">
                  {tripFarmerCount(trip)} {t("trip.farmersCount")} · {trip.totalCrates} {t("trip.crates")} ·{" "}
                  {formatInrFromPaise(trip.totalFreightPaise)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
