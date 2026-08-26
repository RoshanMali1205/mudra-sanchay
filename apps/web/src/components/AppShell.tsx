import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMe } from "../hooks";
import { api, ApiError } from "../api";
import { useSessionStore } from "../store";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useEffect } from "react";

const navItems = [
  { to: "/dashboard", key: "nav.home" },
  { to: "/trips", key: "nav.trips" },
  { to: "/farmers", key: "nav.farmers" },
  { to: "/expenses", key: "nav.expenses" },
  { to: "/more", key: "nav.more" }
];

export function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);
  const setToken = useSessionStore((state) => state.setToken);
  const { data, isError, error, isSuccess, refetch, isFetching } = useMe();

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
    return <div className="auth-layout">Loading…</div>;
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
              {t(item.key)}
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
        <main className="app-main">
          <Outlet />
        </main>
        <nav className="bottom-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
