import { Resend } from "resend";
import NewVideoEmail from "@/emails/NewVideoEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNewVideoEmail({
  to,
  category,
  url,
  gender,
  season,
}: {
  to: string[];
  category: string;
  url: string;
  gender: string;
  season?: string;
}) {
  if (!to.length) return;
  const subject = category === "match"
      ? "🎥 Nuevo video de Partido disponible"
      : "🏋️ Nuevo video de Entrenamiento disponible";

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: subject,
    react: NewVideoEmail({ category, url, gender, season }),
  });
}
