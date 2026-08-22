import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { calculateFreightPaise, formatInrFromPaise, type FarmerSummary, type Route, type Trip, type Vehicle } from "@mudra-sanchay/shared";
import { api } from "../api";

export function NewTripPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => api<Vehicle[]>("/vehicles") });
  const { data: routes = [] } = useQuery({ queryKey: ["routes"], queryFn: () => api<Route[]>("/routes") });
  const { data: farmers = [] } = useQuery({ queryKey: ["farmers"], queryFn: () => api<FarmerSummary[]>("/farmers") });

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const created = await api<Trip>("/trips", {
        method: "POST",
        body: JSON.stringify({
          tripDate: form.get("tripDate"),
          vehicleId: form.get("vehicleId"),
          routeId: form.get("routeId")
        })
      });
      setTrip(created);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  }

  const addEntry = useMutation({
    mutationFn: async (form: FormData) => {
      if (!trip) throw new Error("Trip missing");
      return api(`/trips/${trip.id}/entries`, {
        method: "POST",
        body: JSON.stringify({
          farmerId: form.get("farmerId"),
          crateCount: Number(form.get("crateCount")),
          ratePaise: Number(form.get("ratePaise") || 2500)
        })
      });
    },
    onSuccess: async () => {
      if (!trip) return;
      const latest = await api<Trip>(`/trips/${trip.id}`);
      setTrip(latest);
    }
  });

  async function completeTrip() {
    if (!trip) return;
    const completed = await api<Trip>(`/trips/${trip.id}/complete`, { method: "POST" });
    setTrip(completed);
    await queryClient.invalidateQueries({ queryKey: ["trips"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <section>
      <header className="page-header">
        <h1>{t("trip.new")}</h1>
      </header>
      {!trip ? (
        <form className="ms-card list-card" onSubmit={createTrip}>
          <label className="ms-field">
            <span className="ms-label">{t("trip.date")}</span>
            <input name="tripDate" type="date" defaultValue={today} required />
          </label>
          <label className="ms-field">
            <span className="ms-label">Vehicle</span>
            <select name="vehicleId" required>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.displayName} · {vehicle.registrationNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="ms-field">
            <span className="ms-label">Route</span>
            <select name="routeId" required>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.originName} → {route.destinationName}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="ms-error">{error}</p> : null}
          <button className="ms-btn ms-btn-primary">{t("action.continue")}</button>
        </form>
      ) : (
        <>
          <article className="ms-card list-card">
            <div className="row-between">
              <strong>
                {trip.tripDate} · {t("trip.number")} {trip.tripNumber}
              </strong>
              <span>{t(`trip.${trip.status}`)}</span>
            </div>
            <p>
              {t("trip.totals")}: {trip.totalCrates} {t("trip.crates")} · {formatInrFromPaise(trip.totalFreightPaise)}
            </p>
          </article>
          {trip.status === "draft" ? (
            <form
              className="ms-card list-card"
              onSubmit={(event) => {
                event.preventDefault();
                addEntry.mutate(new FormData(event.currentTarget));
                event.currentTarget.reset();
              }}
            >
              <label className="ms-field">
                <span className="ms-label">{t("farmer.name")}</span>
                <select name="farmerId" required>
                  {farmers.map((farmer) => (
                    <option key={farmer.id} value={farmer.id}>
                      {farmer.fullName} · {farmer.village}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ms-field">
                <span className="ms-label">{t("trip.crates")}</span>
                <input name="crateCount" type="number" min={1} inputMode="numeric" required />
              </label>
              <label className="ms-field">
                <span className="ms-label">Rate (paise)</span>
                <input name="ratePaise" type="number" min={0} defaultValue={2500} />
              </label>
              <p className="muted">
                50 × INR 25 = {formatInrFromPaise(calculateFreightPaise(50, 2500))}
              </p>
              <button className="ms-btn ms-btn-primary">{t("trip.addEntry")}</button>
            </form>
          ) : null}
          {trip.entries.map((entry) => (
            <article key={entry.id} className="list-card ms-card" style={{ marginTop: 12 }}>
              <strong>{entry.farmerName}</strong>
              <p className="muted">
                {entry.crateCount} {t("trip.crates")} · {formatInrFromPaise(entry.freightAmountPaise)}
              </p>
            </article>
          ))}
          {trip.status === "draft" ? (
            <button className="ms-btn ms-btn-accent" style={{ marginTop: 16 }} onClick={() => void completeTrip()}>
              {t("action.completeTrip")}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
