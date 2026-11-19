/**
 * The academy's own details. They live in the app, so changing them needs a
 * new release.
 */

type TransferAccount = {
  /** Shown above the value and read by screen readers ("Copiar IBAN"). */
  label: string;
  /** As students read it. Copying strips its spaces and dashes (`withoutSeparators`). */
  value: string;
};

/** Where students send their transfers: the academy's real accounts as of 2026-10-31. */
export const TRANSFER_ACCOUNTS: readonly TransferAccount[] = [
  { label: "SINPE Móvil", value: "84709898" },
  { label: "Cédula", value: "1-1621-0301" },
  { label: "Cuenta BAC", value: "962233680" },
  { label: "IBAN", value: "CR10 0102 0000 9622 3368 07" },
];

/** The academy's WhatsApp, the same number as SINPE Móvil: as students read it, and for wa.me (+506). */
export const ACADEMY_WHATSAPP = { display: "8470-9898", international: "50684709898" } as const;

/** Opens a WhatsApp chat with the academy. */
export const ACADEMY_WHATSAPP_URL = `https://wa.me/${ACADEMY_WHATSAPP.international}`;

/** Where students write for help. Provisional until the academy picks one (TODO(ayuda) in TODO.md). */
export const ACADEMY_HELP_EMAIL = "andreydev.jpg@gmail.com";

/** Opens a new email to the help address. */
export const ACADEMY_HELP_EMAIL_URL = `mailto:${ACADEMY_HELP_EMAIL}`;
