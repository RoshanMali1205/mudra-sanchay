import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, type Trip } from "@mudra-sanchay/shared";
import { EmptyState, StatusChip } from "@mudra-sanchay/ui";
import { api } from "../api";

export function TripsPage() {
  const { t } = useTranslation();
  const { data = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: () => api<Trip[]>("/trips")
  });

  return (
    <section>
      <header className="page-header row-between">
        <h1>{t("nav.trips")}</h1>
        <Link className="ms-btn ms-btn-primary" to="/trips/new">
          {t("trip.new")}
        </Link>
      </header>
      {data.length === 0 ? (
        <EmptyState title={t("nav.trips")} body={t("dashboard.empty")} />
      ) : (
        data.map((trip) => (
          <article key={trip.id} className="list-card ms-card" style={{ marginBottom: 12 }}>
            <div className="row-between">
              <strong>
                {trip.tripDate} · {t("trip.number")} {trip.tripNumber}
              </strong>
              <StatusChip label={t(`trip.${trip.status}`)} tone={trip.status === "completed" ? "success" : "warning"} />
            </div>
            <p className="muted">
              {trip.totalCrates} {t("trip.crates")} · {formatInrFromPaise(trip.totalFreightPaise)}
            </p>
          </article>
        ))
      )}
    </section>
  );
}
