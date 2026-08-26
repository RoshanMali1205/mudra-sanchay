import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  formatInrFromPaise,
  kolkataToday,
  resolveDateRange,
  type DailySheet,
  type DashboardSummary
} from "@mudra-sanchay/shared";
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
  const { data: sheet } = useQuery({
    queryKey: ["daily-sheet", range.label, range.from, range.to],
    queryFn: () =>
      api<DailySheet>(`/reports/daily-sheet?preset=${range.label}&from=${range.from}&to=${range.to}`)
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
        <MetricCard
          label={t("dashboard.todayIncome")}
          value={money(data?.freightPaise)}
          tone="income"
          imageSrc="/images/farm-fields.png"
          imageAlt=""
          imagePosition="center 35%"
        />
        <MetricCard
          label={t("dashboard.received")}
          value={money(data?.receivedPaise)}
          imageSrc="/images/tomato-crates.png"
          imageAlt=""
          imagePosition="center 40%"
        />
        <MetricCard
          label={t("dashboard.expenses")}
          value={money(data?.expensesPaise)}
          tone="expense"
          imageSrc="/images/tile-expense.svg"
          imageAlt=""
        />
        <MetricCard
          label={t("dashboard.netCash")}
          value={money(data?.cashSurplusPaise)}
          tone="accent"
          hint={t("dashboard.cashHint")}
          imageSrc="/images/tile-payment.svg"
          imageAlt=""
        />
        <MetricCard
          label={t("dashboard.crates")}
          value={String(data?.crates ?? 0)}
          imageSrc="/images/tomato-crate-square.png"
          imageAlt=""
          imagePosition="center"
        />
        <MetricCard
          label={t("dashboard.trips")}
          value={String(data?.trips ?? 0)}
          imageSrc="/images/tile-trip.svg"
          imageAlt=""
        />
        <MetricCard
          label={t("dashboard.farmersToday")}
          value={String(data?.farmerCount ?? sheet?.farmerCount ?? 0)}
          imageSrc="/images/tile-farmer.svg"
          imageAlt=""
        />
        <MetricCard
          label={t("dashboard.outstanding")}
          value={money(data?.outstandingPaise)}
          imageSrc="/images/farm-fields.png"
          imageAlt=""
          imagePosition="70% 60%"
        />
        <MetricCard
          label={t("dashboard.accrualProfit")}
          value={money(data?.accrualProfitPaise)}
          hint={t("dashboard.accrualHint")}
          imageSrc="/images/tomato-crates.png"
          imageAlt=""
          imagePosition="left center"
        />
      </div>
      {sheet?.farmers?.length ? (
        <div style={{ marginTop: 16 }}>
          <h2>{range.label === "today" ? t("dashboard.farmersToday") : t("dashboard.dayFarmers")}</h2>
          {sheet.farmers.map((farmer) => (
            <Link
              key={farmer.farmerId}
              to={`/farmers/${farmer.farmerId}`}
              className="list-card ms-card"
              style={{ marginTop: 12, display: "block" }}
            >
              <div className="row-between">
                <strong>{farmer.fullName}</strong>
                <strong className={farmer.outstandingPaise > 0 ? "due-amount" : "due-zero"}>
                  {money(farmer.outstandingPaise)}
                </strong>
              </div>
              <p className="muted">
                {farmer.village}
                {` · ${farmer.crates} ${t("trip.crates")}`}
                {` · ${money(farmer.freightPaise)}`}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
      <div className="quick-grid" style={{ marginTop: 16 }}>
        <Link className="action-card action-card-primary" to="/trips/new">
          <img className="action-card-media" src="/images/tile-trip.svg" alt="" />
          <p className="action-card-kicker">{t("dashboard.quickActions")}</p>
          <p className="action-card-label">{t("trip.new")}</p>
        </Link>
        <Link className="action-card action-card-primary" to="/farmers/new">
          <img className="action-card-media" src="/images/tile-farmer.svg" alt="" />
          <p className="action-card-kicker">{t("dashboard.quickActions")}</p>
          <p className="action-card-label">{t("farmer.new")}</p>
        </Link>
        <Link className="action-card action-card-accent" to="/payments/new">
          <img className="action-card-media" src="/images/tile-payment.svg" alt="" />
          <p className="action-card-kicker">{t("dashboard.quickActions")}</p>
          <p className="action-card-label">{t("payment.new")}</p>
        </Link>
        <Link className="action-card action-card-accent" to="/expenses/new">
          <img className="action-card-media" src="/images/tile-expense.svg" alt="" />
          <p className="action-card-kicker">{t("dashboard.quickActions")}</p>
          <p className="action-card-label">{t("expense.new")}</p>
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
