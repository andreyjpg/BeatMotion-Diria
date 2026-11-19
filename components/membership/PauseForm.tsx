import FieldError from "@/components/FieldError";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import InfoRow from "@/components/ui/InfoRow";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatCurrency, formatDayMonth, plural } from "@/constants/helpers";
import { PAUSE_MONTHS, type PauseMonths } from "@/hooks/membership/schema";

// The canvas text without "ni invitar a nadie" (guests don't exist yet) and
// without promising no payment reminders: the usual one comes 10 days before
// the pause ends.
const DURING_PAUSE_TEXT =
  "Durante la pausa no llegan recordatorios de asistencia y no se puede matricular. El recordatorio de pago llega 10 días antes de volver, como siempre. Se puede volver antes en cualquier momento.";

/** "1 mes", "3 meses". */
export const pauseMonthsLabel = (months: PauseMonths) => plural(months, "mes", "meses");

const SEGMENTS = PAUSE_MONTHS.map((months) => ({ value: String(months), label: pauseMonthsLabel(months) }));

/** The end of a pause of `months` (`endDates` follows PAUSE_MONTHS); null until chosen. */
const endDateFor = (endDates: Date[], months: PauseMonths | null) =>
  months === null ? null : (endDates[PAUSE_MONTHS.indexOf(months)] ?? null);

type PauseFormProps = {
  months: PauseMonths | null;
  onMonthsChange: (months: PauseMonths | null) => void;
  /** Validation message for the length (pauseFormSchema). */
  error?: string;
  startDate: Date | null;
  /** The end of a pause of 1, 2 and 3 months, from the preview. */
  endDates: Date[];
  monthlyFare: number;
  /** An admin's pause that starts now: "Hoy" instead of the date. */
  startsToday?: boolean;
};

/**
 * The pause's length (1, 2 or 3 months) and what it means: when it starts and
 * ends, and the next payment. For the student's and the admin's pause screens.
 */
const PauseForm = ({ months, onMonthsChange, error, startDate, endDates, monthlyFare, startsToday = false }: PauseFormProps) => {
  const endDate = endDateFor(endDates, months);
  const startLabel = startsToday ? "Hoy" : startDate ? formatDayMonth(startDate) : "—";

  const handleChange = (value: string) =>
    onMonthsChange(PAUSE_MONTHS.find((option) => String(option) === value) ?? null);

  return (
    <>
      <Card className="mx-3 mt-4 gap-3">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          ¿Cuánto tiempo?
        </AppText>
        <SegmentedControl
          segments={SEGMENTS}
          value={months === null ? "" : String(months)}
          onChange={handleChange}
          accessibilityLabel="Duración de la pausa"
        />
        <FieldError message={error} className="" />
      </Card>

      <Card padded={false} className="mx-3 mt-2.5 px-4 pb-3 pt-1">
        <InfoRow label="Empieza">{startLabel}</InfoRow>
        <InfoRow label="Termina">{endDate ? formatDayMonth(endDate) : "Elige la duración"}</InfoRow>
        <InfoRow label="Vuelve a pagar">{endDate ? `${formatDayMonth(endDate)} · ${formatCurrency(monthlyFare)}` : "—"}</InfoRow>
        <AppText tone="muted" className="pt-2.5 text-[12.5px] leading-[17px]">
          {DURING_PAUSE_TEXT}
        </AppText>
      </Card>
    </>
  );
};

export default PauseForm;
