import { describe, expect, it } from "vitest";
import { EMAIL_FROM_NAME, formatClubFrom } from "@/emails/brand";

describe("formatClubFrom", () => {
  it("wraps a bare address with the club display name, quoted", () => {
    expect(formatClubFrom("avisos@cvorotava.com")).toBe(
      `"${EMAIL_FROM_NAME}" <avisos@cvorotava.com>`
    );
  });

  it("keeps only the address when the env already has a display name", () => {
    expect(
      formatClubFrom("C.V. Orotava - Puerto de la Cruz <avisos@cvorotava.com>")
    ).toBe(`"${EMAIL_FROM_NAME}" <avisos@cvorotava.com>`);
  });
});
