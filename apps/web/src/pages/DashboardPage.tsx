import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatInrFromPaise, kolkataToday, resolveDateRange, type DashboardSummary } from "@mudra-sanchay/shared";
import { EmptyState, MetricCard } from "@mudra-sanchay/ui";
import { api } from "../api";
import { DateRangePicker } from "../components/UiBits";

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-IN" : i18n.language === "hi" ? "hi-IN" : "mr-IN";
  const [preset, setPreset] = useState("today");
  const [from, setFrom] = useState(kolkataToday());
  const [to, setTo] = useState(kolkataToday());
  const range = useMemo(() => resolveDateRange(preset, from, to), [preset, from, to]);
  const { data } = useQuery({
    queryKey: ["dashboard", range.label, range.from, range.to],
    queryFn: () =>
      api<DashboardSummary>(`/dashboard/summary?preset=${range.label}&from=${range.from}&to=${range.to}`)
  });

  const money = (paise = 0) => formatInrFromPaise(paise, locale);

  return (
    <section>
      <header className="page-header">
        <figure className="hero-scene">
          <img src="/images/farm-fields.png" alt="Tomato farm in Ugaon" />
          <figcaption>
            <h1>{t("dashboard.today")}</h1>
            <p>{t("app.brand")}</p>
          </figcaption>
        </figure>
        <div className="photo-strip" aria-hidden="false">
          <img src="/images/tomato-crates.png" alt="Tomato crates" />
          <img src="/images/tomato-crate-square.png" alt="Fresh tomatoes" />
        </div>
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
      <div className="metric-grid">
        <MetricCard label={t("dashboard.todayIncome")} value={money(data?.freightPaise)} tone="income" />
        <MetricCard label={t("dashboard.received")} value={money(data?.receivedPaise)} />
        <MetricCard label={t("dashboard.expenses")} value={money(data?.expensesPaise)} tone="expense" />
        <MetricCard label={t("dashboard.netCash")} value={money(data?.cashSurplusPaise)} tone="accent" hint={t("dashboard.cashHint")} />
        <MetricCard label={t("dashboard.crates")} value={String(data?.crates ?? 0)} />
        <MetricCard label={t("dashboard.trips")} value={String(data?.trips ?? 0)} />
        <MetricCard label={t("dashboard.outstanding")} value={money(data?.outstandingPaise)} />
        <MetricCard
          label={t("dashboard.accrualProfit")}
          value={money(data?.accrualProfitPaise)}
          hint={t("dashboard.accrualHint")}
        />
      </div>
      <div className="quick-grid" style={{ marginTop: 16 }}>
        <Link className="action-card action-card-primary" to="/trips/new">
          {t("trip.new")}
        </Link>
        <Link className="action-card action-card-primary" to="/farmers/new">
          {t("farmer.new")}
        </Link>
        <Link className="action-card action-card-accent" to="/payments/new">
          {t("payment.new")}
        </Link>
        <Link className="action-card action-card-accent" to="/expenses/new">
          {t("expense.new")}
        </Link>
      </div>
      {data && data.trips === 0 ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState
            title={t("dashboard.today")}
            body={t("dashboard.empty")}
            imageSrc="/images/tomato-crates.png"
            imageAlt="Tomato crates"
          />
        </div>
      ) : null}
    </section>
  );
}
