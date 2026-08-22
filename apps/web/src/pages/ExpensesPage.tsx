import { useTranslation } from "react-i18next";
import { EmptyState } from "@mudra-sanchay/ui";

export function ExpensesPage() {
  const { t } = useTranslation();
  return (
    <section>
      <header className="page-header">
        <h1>{t("more.expenses")}</h1>
      </header>
      <EmptyState title={t("expense.new")} body="Diesel, puncture, repair, oil and helper salary will be recorded here." />
    </section>
  );
}
