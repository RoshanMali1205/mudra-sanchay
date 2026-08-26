import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, rupeesToPaise, type FarmerSummary, type MarketReceipt, type Trip } from "@mudra-sanchay/shared";
import { EmptyState, StatusChip } from "@mudra-sanchay/ui";
import { api, ApiError } from "../api";
import { ConfirmDialog, SaveStatus } from "../components/UiBits";

export function ReceiptsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = location.pathname.endsWith("/new");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [rotation, setRotation] = useState(0);
  const [overpayBody, setOverpayBody] = useState<Record<string, unknown> | null>(null);
  const { data: farmers = [] } = useQuery({ queryKey: ["farmers"], queryFn: () => api<FarmerSummary[]>("/farmers") });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => api<Trip[]>("/trips") });
  const { data: receipts = [] } = useQuery({ queryKey: ["receipts"], queryFn: () => api<MarketReceipt[]>("/receipts") });
  const { data: current } = useQuery({
    queryKey: ["receipt", receiptId],
    enabled: Boolean(receiptId),
    queryFn: () => api<MarketReceipt>(`/receipts/${receiptId}`)
  });

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File | null;
    if (!file) return;
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      setState("error");
      return;
    }
    setState("saving");
    const previewDataUrl = await readFile(file);
    try {
      const created = await api<MarketReceipt>("/receipts", {
        method: "POST",
        body: JSON.stringify({
          farmerId: data.get("farmerId") || undefined,
          tripId: data.get("tripId") || undefined,
          fileName: file.name,
          mimeType: file.type,
          previewDataUrl,
          receiptNumber: data.get("receiptNumber") || undefined,
          receiptDate: data.get("receiptDate") || undefined,
          netAmountPaise: data.get("net") ? rupeesToPaise(Number(data.get("net"))) : 0
        })
      });
      setState("saved");
      await queryClient.invalidateQueries({ queryKey: ["receipts"] });
      navigate(`/receipts/${created.id}`);
    } catch {
      setState("error");
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const data = new FormData(event.currentTarget);
    setState("saving");
    try {
      await api(`/receipts/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          farmerId: data.get("farmerId") || undefined,
          tripId: data.get("tripId") || undefined,
          receiptNumber: data.get("receiptNumber"),
          receiptDate: data.get("receiptDate"),
          netAmountPaise: rupeesToPaise(Number(data.get("net") || 0)),
          reviewStatus: "linked",
          rotation
        })
      });
      setState("saved");
      await queryClient.invalidateQueries({ queryKey: ["receipt", current.id] });
    } catch {
      setState("error");
    }
  }

  async function addPayment(event: FormEvent<HTMLFormElement>, confirmOverpay = false) {
    event.preventDefault();
    if (!current) return;
    const data = new FormData(event.currentTarget);
    const body = {
      eventDate: data.get("eventDate"),
      amountPaise: rupeesToPaise(Number(data.get("amount"))),
      mode: data.get("mode"),
      notes: data.get("notes") || undefined,
      confirmOverpay
    };
    setState("saving");
    try {
      await api(`/receipts/${current.id}/payment-events`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      setState("saved");
      await queryClient.invalidateQueries({ queryKey: ["receipt", current.id] });
    } catch (err) {
      if (err instanceof ApiError && err.code === "OVERPAY_CONFIRM") {
        setOverpayBody(body);
        setState("idle");
        return;
      }
      setState("error");
    }
  }

  if (isNew) {
    return (
      <section>
        <header className="page-header">
          <h1>{t("receipt.new")}</h1>
        </header>
        <form className="ms-card form-card" onSubmit={(event) => void onUpload(event)}>
          <label className="ms-field">
            <span className="ms-label">{t("receipt.new")}</span>
            <input name="file" type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" required />
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("farmer.name")}</span>
            <select name="farmerId">
              <option value="">—</option>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("nav.trips")}</span>
            <select name="tripId">
              <option value="">—</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.tripDate} · {trip.tripNumber}
                </option>
              ))}
            </select>
          </label>
          <SaveStatus state={state} saved={t("status.saved")} saving={t("status.saving")} error={t("status.error")} />
          <div className="form-actions">
            <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
              {t("action.save")}
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (current) {
    return (
      <section>
        <header className="page-header">
          <h1>{current.fileName}</h1>
          <StatusChip label={current.paymentStatus} />
        </header>
        {current.mimeType.startsWith("image/") ? (
          <img
            className="scene-photo"
            src={current.previewDataUrl}
            alt={current.fileName}
            style={{ maxHeight: 320, objectFit: "contain", transform: `rotate(${rotation}deg)`, marginBottom: 12 }}
          />
        ) : (
          <p className="muted">PDF</p>
        )}
        <div className="toolbar-row" style={{ marginBottom: 14 }}>
          <button className="ms-btn ms-btn-ghost" onClick={() => setRotation((value) => value + 90)}>
            {t("receipt.zoom")}
          </button>
        </div>
        <form className="ms-card form-card" onSubmit={(event) => void saveDetails(event)}>
          <label className="ms-field">
            <span className="ms-label">{t("farmer.name")}</span>
            <select name="farmerId" defaultValue={current.farmerId}>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("receipt.number")}</span>
            <input name="receiptNumber" defaultValue={current.receiptNumber} />
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("trip.date")}</span>
            <input name="receiptDate" type="date" defaultValue={current.receiptDate} />
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("receipt.net")}</span>
            <input name="net" type="number" min={0} step="0.01" defaultValue={current.netAmountPaise / 100} />
          </label>
          <div className="form-actions">
            <button className="ms-btn ms-btn-primary">{t("action.save")}</button>
          </div>
        </form>
        <form className="ms-card form-card" style={{ marginTop: 14 }} onSubmit={(event) => void addPayment(event)}>
          <h2 style={{ margin: 0 }}>{t("receipt.recordPayment")}</h2>
          <label className="ms-field">
            <span className="ms-label">{t("trip.date")}</span>
            <input name="eventDate" type="date" required />
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("payment.amount")}</span>
            <input name="amount" type="number" min={1} step="0.01" required />
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("payment.mode")}</span>
            <select name="mode" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="ms-btn ms-btn-accent">{t("action.save")}</button>
          </div>
        </form>
        {overpayBody ? (
          <ConfirmDialog
            title={t("receipt.recordPayment")}
            body={t("receipt.overpay")}
            confirmLabel={t("action.confirm")}
            cancelLabel={t("action.cancel")}
            onCancel={() => setOverpayBody(null)}
            onConfirm={() => {
              void api(`/receipts/${current.id}/payment-events`, {
                method: "POST",
                body: JSON.stringify({ ...overpayBody, confirmOverpay: true })
              }).then(() => queryClient.invalidateQueries({ queryKey: ["receipt", current.id] }));
              setOverpayBody(null);
            }}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <header className="page-header row-between">
        <h1>{t("receipt.list")}</h1>
        <Link className="ms-btn ms-btn-primary" to="/receipts/new">
          {t("receipt.new")}
        </Link>
      </header>
      {receipts.length === 0 ? (
        <EmptyState title={t("receipt.list")} body={t("receipt.new")} imageSrc="/images/tile-receipt.svg" />
      ) : (
        <div className="stack-list">
          {receipts.map((receipt) => (
            <Link key={receipt.id} to={`/receipts/${receipt.id}`} className="ms-card entity-card">
              <img className="entity-card-media" src="/images/tile-receipt.svg" alt="" />
              <div className="entity-card-body">
                <div className="row-between">
                  <strong>{receipt.farmerName ?? receipt.fileName}</strong>
                  <StatusChip label={receipt.paymentStatus} />
                </div>
                <p className="muted">{formatInrFromPaise(receipt.netAmountPaise)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
