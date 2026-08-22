import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { AuditLog } from "@mudra-sanchay/shared";
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
      </header>
      {error ? <p className="ms-error">{error instanceof Error ? error.message : t("status.error")}</p> : null}
      {data.map((item) => (
        <article key={item.id} className="list-card ms-card" style={{ marginBottom: 10 }}>
          <div className="row-between">
            <strong>
              {item.action} · {item.entityType}
            </strong>
            <span className="muted">{new Date(item.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <p className="muted">{item.actorName}</p>
        </article>
      ))}
    </section>
  );
}
