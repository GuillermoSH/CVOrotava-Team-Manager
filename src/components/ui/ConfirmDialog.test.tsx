import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("expone título, consecuencias y acción con nombre concreto", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Quitar acceso"
        description="El email dejará de poder entrar."
        confirmLabel="Quitar acceso"
        tone="danger"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(html).toContain("Quitar acceso");
    expect(html).toContain("El email dejará de poder entrar.");
    expect(html).toContain("Cancelar");
    expect(html).toContain('role="alertdialog"');
  });

  it("no pinta el panel cuando está cerrado", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open={false} title="X" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(html).not.toContain('role="alertdialog"');
  });
});
