import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  calculateFreightPaise,
  CRATE_TYPE_CODES,
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
  const [rateRupees, setRateRupees] = useState(25);
  const [typeCounts, setTypeCounts] = useState<Record<string, string>>(emptyTypeCounts());
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => api<Vehicle[]>("/vehicles") });
  const { data: routes = [] } = useQuery({ queryKey: ["routes"], queryFn: () => api<Route[]>("/routes") });
  const { data: farmers = [] } = useQuery({ queryKey: ["farmers"], queryFn: () => api<FarmerSummary[]>("/farmers") });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => api<Trip[]>("/trips") });

  const {
    isLoading: tripLoading,
    isError: tripLoadError,
    error: tripError
  } = useQuery({
    queryKey: ["trip", tripId],
    enabled: Boolean(tripId),
    queryFn: async () => {
      const loaded = await api<Trip>(`/trips/${tripId}`);
      setTrip(loaded);
      return loaded;
    }
  });

  const previewCrates = CRATE_TYPE_CODES.reduce((sum, code) => sum + (Number(typeCounts[code]) || 0), 0);
  const preview = useMemo(() => {
    try {
      return previewCrates > 0 ? calculateFreightPaise(previewCrates, rupeesToPaise(rateRupees)) : 0;
    } catch {
      return 0;
    }
  }, [previewCrates, rateRupees]);

  const previousTrip = trips.find((item) => item.id !== trip?.id && item.entries.length > 0);
  const uniqueFarmerCount =
    trip?.farmerCount ?? (trip ? new Set(trip.entries.map((entry) => entry.farmerId)).size : 0);

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
    mutationFn: async (input: {
      farmerId: string;
      ratePaise: number;
      lines: Array<{ crateType: (typeof CRATE_TYPE_CODES)[number]; crateCount: number }>;
    }) => {
      if (!trip) throw new Error("Trip missing");
      let current = trip;
      for (const line of input.lines) {
        const existing = current.entries.find(
          (entry) => entry.farmerId === input.farmerId && entry.crateType === line.crateType
        );
        current = existing
          ? await api<Trip>(`/trips/${trip.id}/entries/${existing.id}`, {
              method: "PATCH",
              body: JSON.stringify({ crateCount: line.crateCount, ratePaise: input.ratePaise })
            })
          : await api<Trip>(`/trips/${trip.id}/entries`, {
              method: "POST",
              body: JSON.stringify({
                farmerId: input.farmerId,
                crateType: line.crateType,
                crateCount: line.crateCount,
                ratePaise: input.ratePaise
              })
            });
      }
      return current;
    },
    onSuccess: (updated) => {
      setTrip(updated);
      setState("saved");
      setError("");
      setRateRupees(25);
      setTypeCounts(emptyTypeCounts());
    },
    onError: (err) => {
      setState("error");
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  });

  async function updateEntry(entryId: string, crateCount: number) {
    if (!trip) return;
    const previous = trip;
    const entries = trip.entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            crateCount,
            freightAmountPaise: calculateFreightPaise(crateCount, entry.ratePaise)
          }
        : entry
    );
    // Optimistic update so freight totals refresh immediately while the API saves.
    setTrip({
      ...trip,
      entries,
      totalCrates: entries.reduce((sum, entry) => sum + entry.crateCount, 0),
      totalFreightPaise: entries.reduce((sum, entry) => sum + entry.freightAmountPaise, 0),
      farmerCount: new Set(entries.map((entry) => entry.farmerId)).size
    });
    setState("saving");
    try {
      const updated = await api<Trip>(`/trips/${trip.id}/entries/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({ crateCount })
      });
      setTrip(updated);
      setState("saved");
    } catch (err) {
      setTrip(previous);
      setState("error");
      setError(err instanceof Error ? err.message : t("status.error"));
    }
  }

  async function removeEntry(entryId: string) {
    if (!trip) return;
    const updated = await api<Trip>(`/trips/${trip.id}/entries/${entryId}`, { method: "DELETE" });
    setTrip(updated);
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
      {tripId && tripLoading ? <p className="muted">{t("status.saving")}</p> : null}
      {tripId && tripLoadError ? (
        <div className="ms-card form-card">
          <p className="ms-error">{tripError instanceof Error ? tripError.message : t("status.error")}</p>
          <Link className="ms-btn ms-btn-ghost" to="/trips">
            {t("nav.trips")}
          </Link>
        </div>
      ) : null}
      {!trip && !tripId ? (
        <form className="ms-card form-card" onSubmit={(event) => void createTrip(event)}>
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
          <div className="form-actions">
            <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
              {t("action.continue")}
            </button>
          </div>
        </form>
      ) : trip ? (
        <>
          <article className="ms-card form-card">
            <div className="row-between">
              <strong>
                {trip.tripDate} · {t("trip.number")} {trip.tripNumber}
              </strong>
              <span className="entity-code">{t(`trip.${trip.status}`)}</span>
            </div>
            <p style={{ margin: 0 }}>
              {t("trip.totals")}: {uniqueFarmerCount}{" "}
              {t("trip.farmersCount")} · {trip.totalCrates} {t("trip.crates")} · {formatInrFromPaise(trip.totalFreightPaise)}
            </p>
            {trip.status === "draft" && previousTrip ? (
              <div className="form-actions">
                <button className="ms-btn ms-btn-ghost" onClick={() => void copyFarmers()}>
                  {t("trip.copyFarmers")}
                </button>
              </div>
            ) : null}
          </article>
          {trip.status === "draft" ? (
            <form
              className="ms-card form-card"
              style={{ marginTop: 14 }}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const lines = CRATE_TYPE_CODES.flatMap((code) => {
                  const crateCount = Number(typeCounts[code]);
                  return crateCount > 0 ? [{ crateType: code, crateCount }] : [];
                });
                if (lines.length === 0) {
                  setState("error");
                  setError(t("trip.crateTypesRequired"));
                  return;
                }
                setState("saving");
                setError("");
                addEntry.mutate({
                  farmerId: String(form.get("farmerId")),
                  ratePaise: rupeesToPaise(Number(form.get("rateRupees") || 25)),
                  lines
                });
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
              <p className="muted" style={{ margin: 0 }}>
                {t("trip.crateTypesHint")}
              </p>
              {CRATE_TYPE_CODES.map((code) => (
                <label className="ms-field" key={code}>
                  <span className="ms-label">{t(`trip.crateType.${code}`)}</span>
                  <input
                    name={`count_${code}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={typeCounts[code] ?? ""}
                    onChange={(event) =>
                      setTypeCounts((current) => ({ ...current, [code]: event.target.value }))
                    }
                  />
                </label>
              ))}
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
              <p style={{ margin: 0 }}>
                {t("trip.freightPreview")}: {formatInrFromPaise(preview)} · {t("trip.rateSource")}: manual
              </p>
              {error ? <p className="ms-error">{error}</p> : null}
              <div className="form-actions">
                <button className="ms-btn ms-btn-primary" disabled={addEntry.isPending}>
                  {t("trip.addEntry")}
                </button>
              </div>
            </form>
          ) : null}
          <div className="stack-list" style={{ marginTop: 14 }}>
          {groupEntriesByFarmer(trip.entries).map((entries) => {
            const first = entries[0];
            if (!first) return null;
            const farmerDue = farmers.find((farmer) => farmer.id === first.farmerId)?.outstandingPaise;
            const farmerCrates = entries.reduce((sum, entry) => sum + entry.crateCount, 0);
            const farmerFreight = entries.reduce((sum, entry) => sum + entry.freightAmountPaise, 0);
            return (
            <article key={first.farmerId} className="ms-card form-card">
              <strong>{first.farmerName}</strong>
              <p className="muted">
                {farmerCrates} {t("trip.crates")} · {formatInrFromPaise(farmerFreight)}
                {farmerDue != null ? (
                  <>
                    {" · "}
                    <span className={farmerDue > 0 ? "due-amount" : "due-zero"}>
                      {t("farmer.outstandingBalance")}: {formatInrFromPaise(farmerDue)}
                    </span>
                  </>
                ) : null}
              </p>
              {entries.map((entry) => (
                <div key={entry.id} className="row-between" style={{ marginTop: 8 }}>
                  <span>
                    {entry.crateType ? t(`trip.crateType.${entry.crateType}`) : t("trip.crates")} · {entry.crateCount || "—"}
                  </span>
                  {trip.status === "draft" ? (
                    <span className="row-between" style={{ gap: 8 }}>
                      <input
                        className="ms-control"
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
                    </span>
                  ) : (
                    <span>{formatInrFromPaise(entry.freightAmountPaise)}</span>
                  )}
                </div>
              ))}
            </article>
            );
          })}
          </div>
          {trip.status === "draft" ? (
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="ms-btn ms-btn-accent" onClick={() => setConfirmComplete(true)}>
                {t("action.completeTrip")}
              </button>
            </div>
          ) : (
            <div className="ms-card form-card" style={{ marginTop: 16 }}>
              <label className="ms-field">
                <span className="ms-label">{t("trip.reopenReason")}</span>
                <input value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} />
              </label>
              <div className="form-actions">
                <button className="ms-btn ms-btn-ghost" disabled={reopenReason.length < 3} onClick={() => void reopen()}>
                  {t("action.reopen")}
                </button>
              </div>
            </div>
          )}
          <p>
            <Link to="/trips">{t("nav.trips")}</Link>
          </p>
        </>
      ) : null}
      {confirmComplete ? (
        <ConfirmDialog
          title={t("action.completeTrip")}
          body={`${t("trip.confirmComplete")} ${uniqueFarmerCount} ${t("nav.farmers")}, ${trip?.totalCrates} ${t("trip.crates")}, ${formatInrFromPaise(trip?.totalFreightPaise ?? 0)}.`}
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

function emptyTypeCounts() {
  return Object.fromEntries(CRATE_TYPE_CODES.map((code) => [code, ""]));
}

function groupEntriesByFarmer(entries: Trip["entries"]) {
  const groups = new Map<string, Trip["entries"]>();
  for (const entry of entries) {
    const current = groups.get(entry.farmerId) ?? [];
    current.push(entry);
    groups.set(entry.farmerId, current);
  }
  return [...groups.values()];
}
