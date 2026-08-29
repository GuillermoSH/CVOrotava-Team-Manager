import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_LOGO_CID } from "@/emails/brand";

export function loadEmailLogoAttachment(): {
  filename: string;
  content: Buffer;
  contentId: string;
  contentType: string;
} | null {
  try {
    const content = readFileSync(
      join(process.cwd(), "src/emails/assets/logo_email.png")
    );
    return {
      filename: "logo.png",
      content,
      contentId: EMAIL_LOGO_CID,
      contentType: "image/png",
    };
  } catch {
    return null;
  }
}
