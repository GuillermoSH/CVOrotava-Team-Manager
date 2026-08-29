import React, { Fragment, type ReactNode } from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { emailBrand, emailFont } from "@/emails/brand";

type BrandLayoutProps = {
  preview: string;
  children: ReactNode;
  logoSrc?: string;
  footer?: string;
};

export default function BrandLayout({
  preview,
  children,
  logoSrc,
  footer,
}: Readonly<BrandLayoutProps>) {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailBrand.stone,
          fontFamily: emailFont,
          margin: 0,
          padding: "28px 16px",
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            backgroundColor: emailBrand.paper,
            borderRadius: emailBrand.radiusCard,
            overflow: "hidden",
            boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
          }}
        >
          <Section
            style={{
              backgroundColor: emailBrand.night,
              padding: "0",
              borderRadius: `${emailBrand.radiusCard} ${emailBrand.radiusCard} 0 0`,
            }}
          >
            <Row>
              <Column
                style={{
                  width: "104px",
                  padding: "22px 8px 22px 22px",
                  verticalAlign: "middle",
                }}
              >
                {logoSrc ? (
                  <Img
                    src={logoSrc}
                    width={80}
                    height={80}
                    alt="Escudo C.V. Orotava"
                    style={{
                      display: "block",
                      borderRadius: emailBrand.radiusLogo,
                    }}
                  />
                ) : null}
              </Column>
              <Column
                style={{
                  padding: "22px 22px 22px 8px",
                  verticalAlign: "middle",
                }}
              >
                <Text
                  style={{
                    color: emailBrand.onNight,
                    fontSize: "22px",
                    fontWeight: 700,
                    lineHeight: "1.15",
                    margin: "0",
                    fontFamily: emailFont,
                  }}
                >
                  C.V. Orotava - Puerto de la Cruz
                </Text>
                <Text
                  style={{
                    color: emailBrand.onNightSoft,
                    fontSize: "13px",
                    lineHeight: "1.35",
                    margin: "6px 0 0",
                    fontFamily: emailFont,
                  }}
                >
                  Anima · Educa · Respeta
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ padding: "28px 24px 8px" }}>{children}</Section>

          {footer ? (
            <Section style={{ padding: "8px 24px 28px" }}>
              {footer.split(/\n\n+/).map((para, i) => (
                <Text
                  key={para}
                  style={{
                    color: emailBrand.inkSoft,
                    fontSize: "12px",
                    lineHeight: "1.55",
                    margin: i === 0 ? "0" : "10px 0 0",
                    fontFamily: emailFont,
                    textAlign: "center",
                    ...(i === 0
                      ? {
                          borderTop: `1px solid ${emailBrand.line}`,
                          paddingTop: "16px",
                        }
                      : {}),
                  }}
                >
                  {para.split("\n").map((line, j) => (
                    <Fragment key={line}>
                      {j > 0 ? <br /> : null}
                      {line}
                    </Fragment>
                  ))}
                </Text>
              ))}
            </Section>
          ) : (
            <Section style={{ padding: "0 24px 24px" }} />
          )}
        </Container>
      </Body>
    </Html>
  );
}
