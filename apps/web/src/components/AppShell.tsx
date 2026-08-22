import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMe } from "../hooks";
import { api } from "../api";
import { useSessionStore } from "../store";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { QuickEntrySheet } from "./QuickEntrySheet";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", key: "nav.home" },
  { to: "/trips", key: "nav.trips" },
  { to: "/farmers", key: "nav.farmers" },
  { to: "/reports", key: "nav.reports" },
  { to: "/more", key: "nav.more" }
];

export function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useMe();
  const setToken = useSessionStore((state) => state.setToken);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading) {
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
        <button className="fab" aria-label={t("dashboard.quickActions")} onClick={() => setSheetOpen(true)}>
          +
        </button>
        {sheetOpen ? <QuickEntrySheet onClose={() => setSheetOpen(false)} /> : null}
      </div>
    </div>
  );
}
