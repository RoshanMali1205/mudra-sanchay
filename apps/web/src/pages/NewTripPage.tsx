import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  calculateFreightPaise,
  formatInrFromPaise,
  rupeesToPaise,
  type FarmerSummary,
  type Route,
  type Trip,
  type Vehicle
} from "@mudra-sanchay/shared";
import { api } from "../api";
import { ConfirmDialog, SaveStatus } from "../components/UiBits";

export function NewTripPage() {
  const { t } = useTranslation();
  const { tripId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [crates, setCrates] = useState(50);
  const [rateRupees, setRateRupees] = useState(25);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => api<Vehicle[]>("/vehicles") });
  const { data: routes = [] } = useQuery({ queryKey: ["routes"], queryFn: () => api<Route[]>("/routes") });
  const { data: farmers = [] } = useQuery({ queryKey: ["farmers"], queryFn: () => api<FarmerSummary[]>("/farmers") });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => api<Trip[]>("/trips") });

  useQuery({
    queryKey: ["trip", tripId],
    enabled: Boolean(tripId),
    queryFn: async () => {
      const loaded = await api<Trip>(`/trips/${tripId}`);
      setTrip(loaded);
      return loaded;
    }
  });

  const preview = useMemo(() => {
    try {
      return calculateFreightPaise(crates, rupeesToPaise(rateRupees));
    } catch {
      return 0;
    }
  }, [crates, rateRupees]);

  const previousTrip = trips.find((item) => item.id !== trip?.id && item.entries.length > 0);

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("saving");
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
      setState("saved");
      navigate(`/trips/${created.id}`, { replace: true });
    } catch (err) {
      setState("error");
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
          ratePaise: rupeesToPaise(Number(form.get("rateRupees") || 25))
        })
      });
    },
    onSuccess: async () => {
      if (!trip) return;
      setTrip(await api<Trip>(`/trips/${trip.id}`));
      setState("saved");
    },
    onError: (err) => {
      setState("error");
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  });

  async function updateEntry(entryId: string, crateCount: number) {
    if (!trip) return;
    setState("saving");
    try {
      await api(`/trips/${trip.id}/entries/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({ crateCount })
      });
      setTrip(await api<Trip>(`/trips/${trip.id}`));
      setState("saved");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  }

  async function removeEntry(entryId: string) {
    if (!trip) return;
    await api(`/trips/${trip.id}/entries/${entryId}`, { method: "DELETE" });
    setTrip(await api<Trip>(`/trips/${trip.id}`));
  }

  async function completeTrip() {
    if (!trip) return;
    setState("saving");
    try {
      const completed = await api<Trip>(`/trips/${trip.id}/complete`, { method: "POST" });
      setTrip(completed);
      setState("saved");
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  }

  async function reopen() {
    if (!trip) return;
    const updated = await api<Trip>(`/trips/${trip.id}/reopen`, {
      method: "POST",
      body: JSON.stringify({ reason: reopenReason })
    });
    setTrip(updated);
  }

  async function copyFarmers() {
    if (!trip || !previousTrip) return;
    const updated = await api<Trip>(`/trips/${trip.id}/copy-farmers`, {
      method: "POST",
      body: JSON.stringify({
        sourceTripId: previousTrip.id,
        farmerIds: previousTrip.entries.map((entry) => entry.farmerId)
      })
    });
    setTrip(updated);
  }

  return (
    <section>
      <header className="page-header">
        <h1>{trip ? `${t("trip.number")} ${trip.tripNumber}` : t("trip.new")}</h1>
        <SaveStatus state={state} saved={t("status.saved")} saving={t("status.saving")} error={t("status.error")} />
      </header>
      {!trip ? (
        <form className="ms-card list-card" onSubmit={(event) => void createTrip(event)}>
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
          <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
            {t("action.continue")}
          </button>
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
              {t("trip.totals")}: {trip.farmerCount ?? new Set(trip.entries.map((entry) => entry.farmerId)).size}{" "}
              {t("trip.farmersCount")} · {trip.totalCrates} {t("trip.crates")} · {formatInrFromPaise(trip.totalFreightPaise)}
            </p>
            {trip.status === "draft" && previousTrip ? (
              <button className="ms-btn ms-btn-ghost" onClick={() => void copyFarmers()}>
                {t("trip.copyFarmers")}
              </button>
            ) : null}
          </article>
          {trip.status === "draft" ? (
            <form
              className="ms-card list-card"
              onSubmit={(event) => {
                event.preventDefault();
                setState("saving");
                addEntry.mutate(new FormData(event.currentTarget));
                event.currentTarget.reset();
                setCrates(50);
                setRateRupees(25);
              }}
            >
              <label className="ms-field">
                <span className="ms-label">{t("farmer.name")}</span>
                <select name="farmerId" required>
                  {farmers.filter((farmer) => farmer.active).map((farmer) => (
                    <option key={farmer.id} value={farmer.id}>
                      {farmer.fullName} · {farmer.village}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ms-field">
                <span className="ms-label">{t("trip.crates")}</span>
                <input
                  name="crateCount"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  required
                  value={crates}
                  onChange={(event) => setCrates(Number(event.target.value))}
                />
              </label>
              <label className="ms-field">
                <span className="ms-label">{t("trip.rate")}</span>
                <input
                  name="rateRupees"
                  type="number"
                  min={0}
                  value={rateRupees}
                  onChange={(event) => setRateRupees(Number(event.target.value))}
                />
              </label>
              <p>
                {t("trip.freightPreview")}: {formatInrFromPaise(preview)} · {t("trip.rateSource")}: manual
              </p>
              {error ? <p className="ms-error">{error}</p> : null}
              <button className="ms-btn ms-btn-primary" disabled={addEntry.isPending}>
                {t("trip.addEntry")}
              </button>
            </form>
          ) : null}
          {trip.entries.map((entry) => {
            const farmerDue = farmers.find((farmer) => farmer.id === entry.farmerId)?.outstandingPaise;
            return (
            <article key={entry.id} className="list-card ms-card" style={{ marginTop: 12 }}>
              <strong>{entry.farmerName}</strong>
              <p className="muted">
                {entry.crateCount || "—"} {t("trip.crates")} · {formatInrFromPaise(entry.freightAmountPaise)} · {entry.rateSource}
                {farmerDue != null ? (
                  <>
                    {" · "}
                    <span className={farmerDue > 0 ? "due-amount" : "due-zero"}>
                      {t("farmer.outstandingBalance")}: {formatInrFromPaise(farmerDue)}
                    </span>
                  </>
                ) : null}
              </p>
              {trip.status === "draft" ? (
                <div className="row-between">
                  <input
                    type="number"
                    min={1}
                    defaultValue={entry.crateCount || ""}
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (value > 0) void updateEntry(entry.id, value);
                    }}
                  />
                  <button className="ms-btn ms-btn-ghost" onClick={() => void removeEntry(entry.id)}>
                    {t("action.remove")}
                  </button>
                </div>
              ) : null}
            </article>
            );
          })}
          {trip.status === "draft" ? (
            <button className="ms-btn ms-btn-accent" style={{ marginTop: 16 }} onClick={() => setConfirmComplete(true)}>
              {t("action.completeTrip")}
            </button>
          ) : (
            <div className="ms-card list-card" style={{ marginTop: 16 }}>
              <label className="ms-field">
                <span className="ms-label">{t("trip.reopenReason")}</span>
                <input value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} />
              </label>
              <button className="ms-btn ms-btn-ghost" disabled={reopenReason.length < 3} onClick={() => void reopen()}>
                {t("action.reopen")}
              </button>
            </div>
          )}
          <p>
            <Link to="/trips">{t("nav.trips")}</Link>
          </p>
        </>
      )}
      {confirmComplete ? (
        <ConfirmDialog
          title={t("action.completeTrip")}
          body={`${t("trip.confirmComplete")} ${trip?.entries.length} ${t("nav.farmers")}, ${trip?.totalCrates} ${t("trip.crates")}, ${formatInrFromPaise(trip?.totalFreightPaise ?? 0)}.`}
          confirmLabel={t("action.confirm")}
          cancelLabel={t("action.cancel")}
          onCancel={() => setConfirmComplete(false)}
          onConfirm={() => {
            setConfirmComplete(false);
            void completeTrip();
          }}
        />
      ) : null}
    </section>
  );
}
