import React from "react";
import { Button, Link, Section, Text } from "@react-email/components";
import BrandLayout from "@/emails/BrandLayout";
import { emailBrand, emailFont } from "@/emails/brand";
import type { NewVideoEmailCopy } from "@/lib/videos/videoEmailCopy";

type NewVideoEmailProps = {
  copy: NewVideoEmailCopy;
  url: string;
  appUrl?: string;
  matchUrl?: string;
  logoSrc?: string;
  footer?: string;
};

export default function NewVideoEmail({
  copy,
  url,
  appUrl,
  matchUrl,
  logoSrc,
  footer,
}: Readonly<NewVideoEmailProps>) {
  const recap = copy.recap;
  const scoreColor =
    recap?.outcome === "win"
      ? emailBrand.accent
      : recap?.outcome === "loss"
        ? emailBrand.ink
        : emailBrand.ink;

  return (
    <BrandLayout preview={copy.preview} logoSrc={logoSrc} footer={footer}>
      <Text
        style={{
          color: emailBrand.ink,
          fontSize: "26px",
          fontWeight: 700,
          lineHeight: "1.2",
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
          fontFamily: emailFont,
        }}
      >
        {copy.headline}
      </Text>
      <Text
        style={{
          color: emailBrand.ink,
          fontSize: "15px",
          fontWeight: 700,
          lineHeight: "1.4",
          margin: recap ? "0 0 16px" : "0 0 12px",
          fontFamily: emailFont,
        }}
      >
        {copy.kicker}
      </Text>

      {recap ? (
        <Section
          style={{
            backgroundColor: "#efece7",
            borderRadius: "16px",
            padding: "16px 18px",
            margin: "0 0 16px",
          }}
        >
          <Text
            style={{
              color: emailBrand.inkSoft,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              margin: "0 0 4px",
              fontFamily: emailFont,
            }}
          >
            vs
          </Text>
          <Text
            style={{
              color: emailBrand.ink,
              fontSize: "20px",
              fontWeight: 700,
              lineHeight: "1.25",
              margin: "0 0 8px",
              fontFamily: emailFont,
            }}
          >
            {recap.opponent}
          </Text>
          {recap.score ? (
            <Text
              style={{
                color: scoreColor,
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: "1",
                margin: "0 0 6px",
                fontFamily: emailFont,
              }}
            >
              {recap.score}
            </Text>
          ) : null}
          {recap.outcomeLabel ? (
            <Text
              style={{
                color: emailBrand.ink,
                fontSize: "14px",
                fontWeight: 700,
                margin: "0 0 4px",
                fontFamily: emailFont,
              }}
            >
              {recap.outcomeLabel}
            </Text>
          ) : null}
          {recap.when ? (
            <Text
              style={{
                color: emailBrand.inkSoft,
                fontSize: "13px",
                lineHeight: "1.4",
                margin: recap.sets ? "0 0 4px" : "0",
                fontFamily: emailFont,
              }}
            >
              {recap.when}
            </Text>
          ) : null}
          {recap.sets ? (
            <Text
              style={{
                color: emailBrand.inkSoft,
                fontSize: "13px",
                lineHeight: "1.4",
                margin: "0",
                fontFamily: emailFont,
              }}
            >
              {recap.sets}
            </Text>
          ) : null}
        </Section>
      ) : null}

      <Text
        style={{
          color: emailBrand.inkSoft,
          fontSize: "15px",
          lineHeight: "1.45",
          margin: "0 0 8px",
          fontFamily: emailFont,
        }}
      >
        {copy.body}
      </Text>

      <Section style={{ textAlign: "center", margin: "20px 0 12px" }}>
        <div
          style={{
            width: "40px",
            height: "4px",
            backgroundColor: emailBrand.accent,
            borderRadius: "9999px",
            margin: "0 auto",
          }}
        />
      </Section>

      <Button
        href={url}
        style={{
          backgroundColor: emailBrand.night,
          color: emailBrand.onNight,
          display: "block",
          textAlign: "center",
          padding: "14px 20px",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "15px",
          fontFamily: emailFont,
          borderRadius: emailBrand.radiusButton,
        }}
      >
        Ver el vídeo
      </Button>

      {matchUrl ? (
        <Text
          style={{
            fontSize: "14px",
            margin: "14px 0 0",
            fontFamily: emailFont,
            textAlign: "center",
          }}
        >
          <Link
            href={matchUrl}
            style={{ color: emailBrand.accent, fontWeight: 700 }}
          >
            Ficha del partido
          </Link>
        </Text>
      ) : null}

      {appUrl ? (
        <Text
          style={{
            fontSize: "14px",
            margin: matchUrl ? "8px 0 0" : "16px 0 0",
            fontFamily: emailFont,
            textAlign: "center",
          }}
        >
          <Link
            href={appUrl}
            style={{ color: emailBrand.accent, fontWeight: 700 }}
          >
            Abrir en Team Manager
          </Link>
        </Text>
      ) : null}
    </BrandLayout>
  );
}
