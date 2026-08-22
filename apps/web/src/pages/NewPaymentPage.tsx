import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, rupeesToPaise, type FarmerSummary, type Payment } from "@mudra-sanchay/shared";
import { api, ApiError } from "../api";
import { ConfirmDialog, SaveStatus } from "../components/UiBits";

export function NewPaymentPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [correcting, setCorrecting] = useState<Payment | null>(null);
  const { data: farmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: () => api<FarmerSummary[]>("/farmers")
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => api<Payment[]>("/payments")
  });
  const selectedId = params.get("farmerId") ?? farmers[0]?.id;
  const selected = farmers.find((farmer) => farmer.id === selectedId);

  async function submit(body: Record<string, unknown>, confirmAdvance = false) {
    setState("saving");
    try {
      await api("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ ...body, confirmAdvance })
      });
      setState("saved");
      await queryClient.invalidateQueries();
    } catch (err) {
      if (err instanceof ApiError && err.code === "ADVANCE_CONFIRM") {
        setPending(body);
        setState("idle");
        return;
      }
      setState("error");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit({
      farmerId: form.get("farmerId"),
      paymentDate: form.get("paymentDate"),
      amountPaise: rupeesToPaise(Number(form.get("amount"))),
      mode: form.get("mode")
    });
  }

  return (
    <section>
      <header className="page-header">
        <h1>{t("payment.new")}</h1>
        {selected ? (
          <p className="muted">
            {t("payment.balance")}: {formatInrFromPaise(selected.outstandingPaise)}
          </p>
        ) : null}
      </header>
      <form className="ms-card list-card" onSubmit={onSubmit}>
        <label className="ms-field">
          <span className="ms-label">{t("farmer.name")}</span>
          <select name="farmerId" defaultValue={selectedId} required>
            {farmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>
                {farmer.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("trip.date")}</span>
          <input name="paymentDate" type="date" defaultValue={today} required />
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
            <option value="bank_transfer">Bank</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>
        <SaveStatus state={state} saved={t("status.saved")} saving={t("status.saving")} error={t("status.error")} />
        <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
          {t("action.save")}
        </button>
      </form>
      <h2>{t("payment.list")}</h2>
      {payments.map((payment) => (
        <article key={payment.id} className="list-card ms-card" style={{ marginBottom: 10 }}>
          <div className="row-between">
            <strong>
              {payment.farmerName} · {formatInrFromPaise(payment.amountPaise)}
            </strong>
            <button className="ms-btn ms-btn-ghost" onClick={() => setCorrecting(payment)}>
              {t("payment.correct")}
            </button>
          </div>
          <p className="muted">
            {payment.paymentDate} · {payment.mode}
            {payment.correctionReason ? ` · ${payment.correctionReason}` : ""}
          </p>
        </article>
      ))}
      {pending ? (
        <ConfirmDialog
          title={t("payment.new")}
          body={t("payment.advanceConfirm")}
          confirmLabel={t("action.confirm")}
          cancelLabel={t("action.cancel")}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const body = pending;
            setPending(null);
            void submit(body, true);
          }}
        />
      ) : null}
      {correcting ? (
        <ConfirmDialog
          title={t("payment.correct")}
          body={t("payment.reason")}
          confirmLabel={t("action.save")}
          cancelLabel={t("action.cancel")}
          onCancel={() => setCorrecting(null)}
          onConfirm={() => {
            const reason = window.prompt(t("payment.reason")) ?? "";
            const amount = window.prompt(t("payment.amount"), String(correcting.amountPaise / 100));
            if (reason.length >= 3 && amount) {
              void api(`/payments/${correcting.id}`, {
                method: "PATCH",
                body: JSON.stringify({ reason, amountPaise: rupeesToPaise(Number(amount)) })
              }).then(() => queryClient.invalidateQueries({ queryKey: ["payments"] }));
            }
            setCorrecting(null);
          }}
        />
      ) : null}
    </section>
  );
}
