import { describe, expect, it } from "vitest";
import { isTrustedReportUrl } from "./reportUrl";

describe("isTrustedReportUrl", () => {
  it("acepta el enlace de acta de la federación", () => {
    expect(isTrustedReportUrl("https://competitionmanager.clupik.com/matches/145586831/pdf-url-redirect")).toBe(true);
    expect(isTrustedReportUrl("https://clupik.com/x")).toBe(true);
  });

  it("rechaza otros dominios, parecidos y protocolos", () => {
    expect(isTrustedReportUrl("https://evil.com/clupik.com")).toBe(false);
    expect(isTrustedReportUrl("https://clupik.com.evil.com/x")).toBe(false);
    expect(isTrustedReportUrl("https://notclupik.com/x")).toBe(false);
    expect(isTrustedReportUrl("http://competitionmanager.clupik.com/x")).toBe(false);
    expect(isTrustedReportUrl("https://user@evil.com@clupik.com.evil.com/")).toBe(false);
    expect(isTrustedReportUrl("not a url")).toBe(false);
    expect(isTrustedReportUrl("")).toBe(false);
  });
});
