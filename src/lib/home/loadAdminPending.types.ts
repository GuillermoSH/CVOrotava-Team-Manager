import type { LastFedSync } from "@/lib/fed/lastSync";
import type { Birthday, PendingDocs } from "./adminPending";

export type AdminPendingData = {
  docs: PendingDocs[];
  birthdays: Birthday[];
  invited: { count: number; emails: string[] };
  venuesToReview: number;
  lastSync: LastFedSync;
};
