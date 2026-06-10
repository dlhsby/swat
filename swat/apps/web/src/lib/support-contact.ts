/**
 * Support contact channels for the "forgot password" info page. SWAT has no
 * self-service password recovery — a reset is requested from the administrator.
 *
 * Configure via env (placeholders below are obviously fake — replace them):
 *   NEXT_PUBLIC_SUPPORT_WHATSAPP  E.164 digits, e.g. 628123456789
 *   NEXT_PUBLIC_SUPPORT_EMAIL     admin@example.go.id
 *   NEXT_PUBLIC_SUPPORT_PHONE     +62 31 0000000
 * A channel left blank is hidden on the page.
 */
export const SUPPORT_CONTACT = {
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '6281200000000',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'admin@dlhsby.go.id',
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '+62 31 0000000',
} as const;

/** `https://wa.me/<digits>` deep link (strips non-digits from the number). */
export function whatsappLink(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}`;
}

/** `tel:` deep link (keeps a leading + and digits). */
export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** `mailto:` deep link with an optional pre-filled subject. */
export function mailtoLink(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
