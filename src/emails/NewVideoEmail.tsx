import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Heading } from "@react-email/heading";

type NewVideoEmailProps = {
  category: string;
  url: string;
  gender: string;
  season?: string;
};

export default function NewVideoEmail({
  category,
  url,
  gender,
  season,
}: Readonly<NewVideoEmailProps>) {
  return (
    <Html>
      <Container
        style={{
          backgroundColor: "#f7f7f7",
          padding: "32px",
          borderRadius: "12px",
          fontFamily: "Arial, sans-serif",
          color: "#222",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <Heading as="h2" style={{ color: "#E71F12" }}>
          ¡Nuevo video disponible! 🎥
        </Heading>

        <Text style={{ fontSize: "16px", marginBottom: "12px" }}>
          Se ha subido un nuevo video de{" "}
          <strong>{category === "match" ? "partido" : "entrenamiento"}</strong>{" "}
          para el Senior <strong>{gender === "male" ? "Masculino" : "Femenino"}</strong>
          {season ? ` (${season})` : ""}.
        </Text>

        <Button
          href={url}
          style={{
            backgroundColor: "#E71F12",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Ver video
        </Button>

        <Text style={{ marginTop: "24px", fontSize: "12px", color: "#666" }}>
          Este es un mensaje automático del club enviado el {new Date().toLocaleString('es-ES')}. Por favor, no respondas a este correo.
        </Text>
      </Container>
    </Html>
  );
}
