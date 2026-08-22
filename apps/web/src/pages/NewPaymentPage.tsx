import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { rupeesToPaise, type FarmerSummary } from "@mudra-sanchay/shared";
import { api } from "../api";

export function NewPaymentPage() {
  const { t } = useTranslation();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [message, setMessage] = useState("");
  const { data: farmers = [] } = useQuery({
    queryKey: ["farmers"],
    queryFn: () => api<FarmerSummary[]>("/farmers")
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/payments", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        farmerId: form.get("farmerId"),
        paymentDate: form.get("paymentDate"),
        amountPaise: rupeesToPaise(Number(form.get("amount"))),
        mode: form.get("mode")
      })
    });
    setMessage(t("status.saved"));
  }

  return (
    <section>
      <header className="page-header">
        <h1>{t("payment.new")}</h1>
      </header>
      <form className="ms-card list-card" onSubmit={onSubmit}>
        <label className="ms-field">
          <span className="ms-label">{t("farmer.name")}</span>
          <select name="farmerId" required>
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
        {message ? <p>{message}</p> : null}
        <button className="ms-btn ms-btn-primary">{t("action.save")}</button>
      </form>
    </section>
  );
}
