import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [farmerId, setFarmerId] = useState(params.get("farmerId") ?? "");
  const [farmerQuery, setFarmerQuery] = useState("");
  const [amount, setAmount] = useState("");
  const { data: farmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: () => api<FarmerSummary[]>("/farmers")
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => api<Payment[]>("/payments")
  });
  useEffect(() => {
    if (!farmerId && farmers[0]) setFarmerId(farmers[0].id);
  }, [farmerId, farmers]);

  const selected = farmers.find((farmer) => farmer.id === farmerId);
  const farmerNeedle = farmerQuery.trim().toLowerCase();
  const visibleFarmers = useMemo(
    () =>
      farmers.filter((farmer) => {
        if (!farmerNeedle) return true;
        const hay = `${farmer.fullName} ${farmer.village} ${farmer.mobile ?? ""} ${farmer.farmerCode}`.toLowerCase();
        return hay.includes(farmerNeedle) || farmer.id === farmerId;
      }),
    [farmers, farmerNeedle, farmerId]
  );

  async function submit(body: Record<string, unknown>, confirmAdvance = false) {
    setState("saving");
    try {
      await api("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ ...body, confirmAdvance })
      });
      setState("saved");
      setAmount("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["farmers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer"] })
      ]);
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
      farmerId,
      paymentDate: form.get("paymentDate"),
      amountPaise: rupeesToPaise(Number(amount)),
      mode: form.get("mode")
    });
  }

  return (
    <section>
      <header className="page-header">
        <h1>{t("payment.new")}</h1>
      </header>
      <form className="ms-card form-card" onSubmit={onSubmit}>
        <label className="ms-field">
          <span className="ms-label">{t("action.search")}</span>
          <input
            type="search"
            value={farmerQuery}
            onChange={(event) => setFarmerQuery(event.target.value)}
            placeholder={t("farmer.searchPlaceholder")}
            autoComplete="off"
          />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("farmer.name")}</span>
          <select name="farmerId" value={farmerId} required onChange={(event) => setFarmerId(event.target.value)}>
            {visibleFarmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>
                {farmer.fullName} · {farmer.village}
              </option>
            ))}
          </select>
        </label>
        {visibleFarmers.length === 0 ? <p className="ms-error">{t("farmer.noMatches")}</p> : null}
        {selected ? (
          <div className="balance-banner">
            <span>
              {t("payment.balance")}
              <strong className={selected.outstandingPaise > 0 ? "due-amount" : "due-zero"}>
                {" "}
                {formatInrFromPaise(selected.outstandingPaise)}
              </strong>
            </span>
            <button
              type="button"
              className="ms-btn ms-btn-ghost"
              disabled={selected.outstandingPaise <= 0}
              onClick={() => setAmount((selected.outstandingPaise / 100).toFixed(2))}
            >
              {t("payment.payBalance")}
            </button>
          </div>
        ) : null}
        <label className="ms-field">
          <span className="ms-label">{t("trip.date")}</span>
          <input name="paymentDate" type="date" defaultValue={today} required />
        </label>
        <label className="ms-field">
          <span className="ms-label">{t("payment.amount")}</span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
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
        <div className="form-actions">
          <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
            {t("action.save")}
          </button>
        </div>
      </form>
      <div className="section-block">
        <h2>{t("payment.list")}</h2>
        <div className="stack-list">
          {payments.map((payment) => (
            <article key={payment.id} className="ms-card entity-card">
              <img className="entity-card-media" src="/images/tile-payment.svg" alt="" />
              <div className="entity-card-body">
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
              </div>
            </article>
          ))}
        </div>
      </div>
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
