import { Resend } from "resend";
import NewVideoEmail from "@/emails/NewVideoEmail";
import { EMAIL_LOGO_CID, clubEmailFooter } from "@/emails/brand";
import { loadEmailLogoAttachment } from "@/emails/loadLogo";
import { buildNewVideoEmailCopy } from "@/lib/videos/videoEmailCopy";
import type { VideoEmailMatchInput } from "@/lib/videos/videoEmailCopy";
import type { VideoType } from "@/lib/videos/constants";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { resend: new Resend(apiKey), from };
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

  const [primary, ...rest] = unique;
  if (!primary) return;

  const copy = buildNewVideoEmailCopy({
    videoType: video_type,
    gender,
    season,
    match,
  });
  const logo = loadEmailLogoAttachment();
  const sentAt = new Date();
  const entityRef = [
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

  const { error } = await client.resend.emails.send({
    from: client.from,
    to: primary,
    ...(rest.length ? { bcc: rest } : {}),
    subject: copy.subject,
    react,
    headers: {
      "X-Entity-Ref-ID": entityRef,
    },
    ...(logo ? { attachments: [logo] } : {}),
  });

  if (error) {
    console.error("Resend send error:", error);
  }
}
