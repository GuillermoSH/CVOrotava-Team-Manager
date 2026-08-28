import { Resend } from "resend";
import NewVideoEmail from "@/emails/NewVideoEmail";
import {
  VIDEO_TYPE_LABELS,
  type VideoType,
} from "@/lib/videos/constants";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNewVideoEmail({
  to,
  video_type,
  url,
  gender,
  season,
}: {
  to: string[];
  video_type: VideoType;
  url: string;
  gender: string;
  season?: string;
}) {
  if (!to.length) return;
  const subject = `Nuevo video de ${VIDEO_TYPE_LABELS[video_type].toLowerCase()} disponible`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: subject,
    react: NewVideoEmail({ video_type, url, gender, season }),
  });
}
