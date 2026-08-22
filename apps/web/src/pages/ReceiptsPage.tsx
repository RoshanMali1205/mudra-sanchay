import { useTranslation } from "react-i18next";
import { EmptyState } from "@mudra-sanchay/ui";

export function ReceiptsPage() {
  const { t } = useTranslation();
  return (
    <section>
      <header className="page-header">
        <h1>{t("more.receipts")}</h1>
      </header>
      <EmptyState title={t("receipt.new")} body="Camera and gallery upload for private market receipts is planned in Phase 4." />
    </section>
  );
}
