/** El enlace `tel:` solo lleva dígitos y "+"; el texto visible conserva el formato original. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
