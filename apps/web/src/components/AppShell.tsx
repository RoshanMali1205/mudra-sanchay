import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMe } from "../hooks";
import { api, ApiError } from "../api";
import { useSessionStore } from "../store";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { QuickEntrySheet } from "./QuickEntrySheet";

const navItems = [
  { to: "/dashboard", key: "nav.home", icon: "home" },
  { to: "/trips", key: "nav.trips", icon: "trips" },
  { to: "/farmers", key: "nav.farmers", icon: "farmers" },
  { to: "/expenses", key: "nav.expenses", icon: "expenses" },
  { to: "/more", key: "nav.more", icon: "more" }
] as const;

export function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSessionStore((state) => state.token);
  const setToken = useSessionStore((state) => state.setToken);
  const { data, isError, error, isSuccess, refetch, isFetching } = useMe();
  const [quickOpen, setQuickOpen] = useState(false);
  const hideQuick = /\/new$/.test(location.pathname) || /^\/trips\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    setQuickOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isError && error instanceof ApiError && error.status === 401) {
      setToken(null);
    }
  }, [isError, error, setToken]);

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  if (isError) {
    const apiError = error instanceof ApiError ? error : undefined;
    if (apiError?.status === 401) {
      return <Navigate to="/auth/login" replace />;
    }
    return (
      <div className="auth-layout">
        <div className="auth-card ms-card">
          <h1>{t("app.name")}</h1>
          <p className="ms-error">{apiError?.message ?? t("status.error")}</p>
          <button className="ms-btn ms-btn-primary" onClick={() => void refetch()}>
            {t("action.retry")}
          </button>
          <button
            className="ms-btn ms-btn-ghost"
            onClick={() => {
              setToken(null);
              navigate("/auth/login");
            }}
          >
            {t("action.login")}
          </button>
        </div>
      </div>
    );
  }

  if (!isSuccess || (isFetching && !data?.user)) {
    return (
      <div className="auth-layout">
        <p className="loading-line">{t("status.loading")}</p>
      </div>
    );
  }

  if (!data?.user) {
    return <Navigate to="/auth/login" replace />;
  }
  if (!data.user.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    navigate("/auth/login");
  }

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar ms-card">
        <div className="brand">
          <img src="/logo.svg" alt="" />
          <div>
            <strong>{t("app.name")}</strong>
            <small>{data.business?.printName ?? t("app.brand")}</small>
          </div>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <NavIcon name={item.icon} />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>
        <LanguageSwitcher />
        <button className="ms-btn ms-btn-ghost" onClick={() => void logout()}>
          {t("action.logout")}
        </button>
      </aside>
      <div>
        <header className="topbar ms-glass">
          <div className="brand">
            <img src="/logo.svg" alt="" />
            <div>
              <strong>{t("app.name")}</strong>
              <small>{data.user.fullName}</small>
            </div>
          </div>
          <LanguageSwitcher />
        </header>
        <main className={hideQuick ? "app-main" : "app-main has-fab"}>
          <Outlet />
        </main>
        <nav className="bottom-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <NavIcon name={item.icon} />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>
        {hideQuick || quickOpen ? null : (
          <button
            type="button"
            className="quick-fab"
            aria-label={t("dashboard.quickActions")}
            onClick={() => setQuickOpen(true)}
          >
            +
          </button>
        )}
        {quickOpen ? <QuickEntrySheet onClose={() => setQuickOpen(false)} /> : null}
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: (typeof navItems)[number]["icon"] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const
  };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "trips") {
    return (
      <svg {...common}>
        <path d="M3 7h11v8H3z" />
        <path d="M14 10h4l3 3v2h-7" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="17.5" cy="17.5" r="1.5" />
      </svg>
    );
  }
  if (name === "farmers") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19c1.4-3 3.4-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
      </svg>
    );
  }
  if (name === "expenses") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="13" rx="2" />
        <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
        <path d="M8 12h8M8 15h5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
