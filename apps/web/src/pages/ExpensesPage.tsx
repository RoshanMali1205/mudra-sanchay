import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  EXPENSE_CATEGORY_CODES,
  formatInrFromPaise,
  kolkataToday,
  resolveDateRange,
  rupeesToPaise,
  type Expense,
  type Vehicle
} from "@mudra-sanchay/shared";
import { EmptyState } from "@mudra-sanchay/ui";
import { api } from "../api";
import { DateRangePicker, SaveStatus } from "../components/UiBits";
import { downloadExcel, expensePdfDocument } from "../lib/export";
import { downloadPdf } from "../lib/pdf";

export function ExpensesPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const showForm = location.pathname.endsWith("/new") || location.pathname === "/expenses/new";
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState("month");
  const [from, setFrom] = useState(resolveDateRange("month").from);
  const [to, setTo] = useState(kolkataToday());
  const [category, setCategory] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [exporting, setExporting] = useState(false);
  const range = useMemo(() => resolveDateRange(preset, from, to), [preset, from, to]);
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => api<Vehicle[]>("/vehicles") });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", range.from, range.to, category],
    queryFn: () =>
      api<Expense[]>(
        `/expenses?from=${range.from}&to=${range.to}${category ? `&category=${category}` : ""}`
      )
  });

  const total = expenses.reduce((sum, item) => sum + item.amountPaise, 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("saving");
    try {
      await api("/expenses", {
        method: "POST",
        body: JSON.stringify({
          expenseDate: form.get("expenseDate"),
          categoryCode: form.get("categoryCode"),
          amountPaise: rupeesToPaise(Number(form.get("amount"))),
          vendorName: form.get("vendorName") || undefined,
          vehicleId: form.get("vehicleId") || undefined,
          notes: form.get("notes") || undefined
        })
      });
      setState("saved");
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      event.currentTarget.reset();
    } catch {
      setState("error");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h1>{showForm ? t("expense.new") : t("expense.list")}</h1>
        <DateRangePicker
          preset={preset}
          onPreset={(value) => {
            setPreset(value);
            const next = resolveDateRange(value, from, to);
            setFrom(next.from);
            setTo(next.to);
          }}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          labels={{
            today: t("range.today"),
            week: t("range.week"),
            month: t("range.month"),
            quarter: t("range.quarter"),
            half_year: t("range.half_year"),
            year: t("range.year"),
            custom: t("range.custom")
          }}
        />
      </header>
      {showForm ? (
        <form className="ms-card form-card" onSubmit={(event) => void onSubmit(event)}>
          <div className="chip-row">
            {EXPENSE_CATEGORY_CODES.map((code) => (
              <label key={code} className="chip">
                <input type="radio" name="categoryCode" value={code} required />
                {t(`expense.category.${code}`)}
              </label>
            ))}
          </div>
          <label className="ms-field">
            <span className="ms-label">{t("payment.amount")}</span>
            <input name="amount" type="number" min={1} step="0.01" required />
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("trip.date")}</span>
            <input name="expenseDate" type="date" defaultValue={kolkataToday()} required />
          </label>
          <label className="ms-field">
            <span className="ms-label">Vehicle</span>
            <select name="vehicleId" defaultValue={vehicles[0]?.id}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("expense.vendor")}</span>
            <input name="vendorName" />
          </label>
          <label className="ms-field">
            <span className="ms-label">{t("expense.bill")}</span>
            <input name="bill" type="file" accept="image/*,application/pdf" />
          </label>
          <SaveStatus state={state} saved={t("status.saved")} saving={t("status.saving")} error={t("status.error")} />
          <div className="form-actions">
            <button className="ms-btn ms-btn-primary" disabled={state === "saving"}>
              {t("action.save")}
            </button>
          </div>
        </form>
      ) : null}
      <div className="filters-panel" style={{ marginTop: 14 }}>
        <div className="chip-row">
          <button type="button" className={category === "" ? "chip active" : "chip"} onClick={() => setCategory("")}>
            All
          </button>
          {EXPENSE_CATEGORY_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className={category === code ? "chip active" : "chip"}
              onClick={() => setCategory(code)}
            >
              {t(`expense.category.${code}`)}
            </button>
          ))}
        </div>
        <div className="toolbar-row">
          <strong>
            {t("reports.expenses")}: {formatInrFromPaise(total)}
          </strong>
          <button
            className="ms-btn ms-btn-primary"
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              void downloadPdf(
                expensePdfDocument(
                  expenses.map((item) => ({
                    date: item.expenseDate,
                    category: t(`expense.category.${item.categoryCode}`),
                    amount: formatInrFromPaise(item.amountPaise),
                    vendor: item.vendorName ?? ""
                  })),
                  formatInrFromPaise(total),
                  {
                    title: t("expense.list"),
                    date: t("trip.date"),
                    category: t("expense.categoryLabel"),
                    amount: t("payment.amount"),
                    vendor: t("expense.vendor"),
                    expenses: t("reports.expenses"),
                    from: range.from,
                    to: range.to
                  }
                )
              ).finally(() => setExporting(false));
            }}
          >
            {exporting ? t("status.saving") : t("action.pdf")}
          </button>
          <button
            className="ms-btn ms-btn-ghost"
            onClick={() =>
              downloadExcel("expenses", [
                {
                  name: "Summary",
                  rows: [
                    ["Category totals"],
                    ...EXPENSE_CATEGORY_CODES.map((code) => [
                      t(`expense.category.${code}`),
                      expenses.filter((item) => item.categoryCode === code).reduce((sum, item) => sum + item.amountPaise, 0) /
                        100
                    ])
                  ]
                },
                {
                  name: "Details",
                  rows: [
                    ["Date", "Category", "Amount", "Vendor"],
                    ...expenses.map((item) => [
                      item.expenseDate,
                      item.categoryCode,
                      item.amountPaise / 100,
                      item.vendorName ?? ""
                    ])
                  ]
                }
              ])
            }
          >
            {t("action.excel")}
          </button>
        </div>
      </div>
      {expenses.length === 0 ? (
        <EmptyState title={t("expense.list")} body={t("expense.new")} imageSrc="/images/tile-expense.svg" />
      ) : (
        <div className="stack-list" style={{ marginTop: 14 }}>
          {expenses.map((expense) => (
            <article key={expense.id} className="ms-card entity-card">
              <img className="entity-card-media" src="/images/tile-expense.svg" alt="" />
              <div className="entity-card-body">
                <div className="row-between">
                  <strong>{t(`expense.category.${expense.categoryCode}`)}</strong>
                  <strong>{formatInrFromPaise(expense.amountPaise)}</strong>
                </div>
                <p className="muted">
                  {expense.expenseDate} {expense.vendorName ? `· ${expense.vendorName}` : ""}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
