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
        <h1>{t("nav.trips")}</h1>
        <Link className="ms-btn ms-btn-primary" to="/trips/new">
          {t("trip.new")}
        </Link>
      </header>
      <label className="ms-field">
        <span className="ms-label">{t("trip.date")}</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      {data.length === 0 ? (
        <EmptyState
          title={t("nav.trips")}
          body={t("dashboard.empty")}
          imageSrc="/images/tomato-crate-square.png"
          imageAlt="Tomato crate"
        />
      ) : (
        data.map((trip) => (
          <article key={trip.id} className="list-card ms-card" style={{ marginBottom: 12 }}>
            <Link to={`/trips/${trip.id}`}>
              <div className="row-between">
                <strong>
                  {trip.tripDate} · {t("trip.number")} {trip.tripNumber}
                </strong>
                <StatusChip label={t(`trip.${trip.status}`)} tone={trip.status === "completed" ? "success" : "warning"} />
              </div>
              <p className="muted">
                {tripFarmerCount(trip)} {t("trip.farmersCount")} · {trip.totalCrates} {t("trip.crates")} ·{" "}
                {formatInrFromPaise(trip.totalFreightPaise)}
              </p>
            </Link>
          </article>
        ))
      )}
    </section>
  );
}
