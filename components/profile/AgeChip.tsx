import Chip from "@/components/ui/Chip";
import { ageLabel } from "@/constants/helpers";

type AgeChipProps = {
  /** "YYYY-MM-DD", as stored in profiles.birth_date. */
  birthDate: string | null | undefined;
};

/** "23 años" tag for a profile; nothing when there's no birth date. */
const AgeChip = ({ birthDate }: AgeChipProps) => {
  const age = ageLabel(birthDate);
  return age ? <Chip label={age} /> : null;
};

export default AgeChip;
