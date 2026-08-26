import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { AuditLog } from "@mudra-sanchay/shared";
import { EmptyState } from "@mudra-sanchay/ui";
import { api } from "../api";

export function AuditPage() {
  const { t } = useTranslation();
  const { data = [], error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => api<AuditLog[]>("/audit")
  });

  return (
    <section>
      <header className="page-header">
        <h1>{t("more.audit")}</h1>
        <p className="muted">{t("more.auditHint")}</p>
      </header>
      {error ? <p className="ms-error">{error instanceof Error ? error.message : t("status.error")}</p> : null}
      {data.length === 0 && !error ? (
        <EmptyState title={t("more.audit")} body={t("more.auditHint")} imageSrc="/images/tile-audit.svg" />
      ) : (
        <div className="stack-list">
          {data.map((item) => (
            <article key={item.id} className="ms-card entity-card">
              <img className="entity-card-media" src="/images/tile-audit.svg" alt="" />
              <div className="entity-card-body">
                <div className="row-between">
                  <strong>
                    {item.action} · {item.entityType}
                  </strong>
                  <span className="muted">{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <p className="muted">{item.actorName}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
