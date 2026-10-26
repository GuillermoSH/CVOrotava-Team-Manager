import type { LastFedSync } from "@/lib/fed/lastSync";
import type { Birthday, PendingDocs } from "./adminPending";
import type { ExemptWithPending } from "@/lib/payments/exemptPending";

export type AdminPendingData = {
  docs: PendingDocs[];
  birthdays: Birthday[];
  invited: { count: number; emails: string[] };
  venuesToReview: number;
  /** Exentos de pagos de la temporada que aún tienen pagos pendientes registrados. */
  exemptWithPending: ExemptWithPending[];
  lastSync: LastFedSync;
};
