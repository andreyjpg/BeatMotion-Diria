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
