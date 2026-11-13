import AppText from "@/components/ui/AppText";
import InfoRow from "@/components/ui/InfoRow";
import { formatBirthDate } from "@/constants/helpers";

type BirthDateRowProps = {
  /** "YYYY-MM-DD", as stored in profiles.birth_date. */
  birthDate: string | null | undefined;
  divider?: boolean;
};

/** "NACIMIENTO ..... 14 mar 2003 · 23 años" row of a profile, or "Sin agregar". */
const BirthDateRow = ({ birthDate, divider = true }: BirthDateRowProps) => {
  const label = formatBirthDate(birthDate);
  return (
    <InfoRow label="Nacimiento" divider={divider}>
      {label ?? (
        <AppText variant="semibold" tone="muted" className="flex-1 text-right text-[14.5px]">
          Sin agregar
        </AppText>
      )}
    </InfoRow>
  );
};

export default BirthDateRow;
