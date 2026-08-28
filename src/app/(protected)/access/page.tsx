import AccessView from "./AccessView";
import { listAllowedEmails } from "@/lib/access/listAllowedEmails";

export default async function AccessPage() {
  const initialRows = await listAllowedEmails();
  return <AccessView initialRows={initialRows} />;
}
