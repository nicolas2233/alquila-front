export function buildWhatsappLink(phoneRaw: string, message: string) {
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}
