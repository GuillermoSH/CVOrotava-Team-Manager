import NewVideoEmail from "@/emails/NewVideoEmail";
import {
  EMAIL_LOGO_CID,
  clubEmailFooter,
  formatClubFrom,
} from "@/emails/brand";
import { loadEmailLogoAttachment } from "@/emails/loadLogo";
import { buildNewVideoEmailCopy } from "@/lib/videos/videoEmailCopy";
import type { VideoEmailMatchInput } from "@/lib/videos/videoEmailCopy";
import type { VideoType } from "@/lib/videos/constants";
import { Resend } from "resend";

const SEND_CONCURRENCY = 2;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { resend: new Resend(apiKey), from: formatClubFrom(from) };
}

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

function appVideosUrl() {
  const origin = siteOrigin();
  return origin ? `${origin}/videos` : undefined;
}

function matchPageUrl(matchId?: string) {
  const origin = siteOrigin();
  return origin && matchId ? `${origin}/matches/${matchId}` : undefined;
}

function recipientTag(email: string) {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map(worker));
  }
}

export async function sendNewVideoEmail({
  to,
  video_type,
  url,
  gender,
  season,
  match,
}: {
  to: string[];
  video_type: VideoType;
  url: string;
  gender: string;
  season?: string;
  match?: VideoEmailMatchInput | null;
}) {
  const unique = [...new Set(to.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return;

  const client = getResend();
  if (!client) {
    console.warn("Resend no configurado: se omite el aviso de vídeo");
    return;
  }

  const copy = buildNewVideoEmailCopy({
    videoType: video_type,
    gender,
    season,
    match,
  });
  const logo = loadEmailLogoAttachment();
  const sentAt = new Date();
  const batchRef = [
    "video",
    video_type,
    gender,
    season ?? "",
    match?.id ?? "",
    sentAt.getTime().toString(36),
  ].join("-");
  const react = NewVideoEmail({
    copy,
    url,
    appUrl: appVideosUrl(),
    matchUrl: matchPageUrl(match?.id),
    logoSrc: logo ? `cid:${EMAIL_LOGO_CID}` : undefined,
    footer: clubEmailFooter(sentAt),
  });

  await mapPool(unique, SEND_CONCURRENCY, async (recipient) => {
    const { error } = await client.resend.emails.send({
      from: client.from,
      to: recipient,
      subject: copy.subject,
      react,
      headers: {
        "X-Entity-Ref-ID": `${batchRef}-${recipientTag(recipient)}`,
      },
      ...(logo ? { attachments: [logo] } : {}),
    });

    if (error) {
      console.error("Resend send error:", error);
    }
  });
}
