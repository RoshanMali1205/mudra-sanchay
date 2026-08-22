import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useSessionStore } from "./store";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TripsPage } from "./pages/TripsPage";
import { NewTripPage } from "./pages/NewTripPage";
import { FarmersPage } from "./pages/FarmersPage";
import { NewFarmerPage } from "./pages/NewFarmerPage";
import { FarmerProfilePage } from "./pages/FarmerProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { MorePage } from "./pages/MorePage";
import { NewPaymentPage } from "./pages/NewPaymentPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { SettingsPage } from "./pages/SettingsPage";

function GuestOnly({ children }: { children: ReactNode }) {
  const token = useSessionStore((state) => state.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/auth/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/auth/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/new" element={<NewTripPage />} />
        <Route path="/farmers" element={<FarmersPage />} />
        <Route path="/farmers/new" element={<NewFarmerPage />} />
        <Route path="/farmers/:farmerId" element={<FarmerProfilePage />} />
        <Route path="/payments/new" element={<NewPaymentPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpensesPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/receipts/new" element={<ReceiptsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/more" element={<MorePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
