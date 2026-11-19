import Chip, { type ChipTone } from "@/components/ui/Chip";
import type { LiveMembershipChange } from "@/hooks/membership/schema";

/** What each change in progress reads as on the admin's screens. */
export const LIVE_CHANGE_CHIPS: Record<LiveMembershipChange, { label: string; tone: ChipTone }> = {
  paused: { label: "En pausa", tone: "muted" },
  pauseScheduled: { label: "Pausa programada", tone: "pending" },
  // Not the card's "Baja programada": the student's screens use it for a drop.
  cancelScheduled: { label: "Cancelación programada", tone: "pending" },
  dropScheduled: { label: "Deja un curso", tone: "line" },
};

type MembershipChangeChipProps = { change: LiveMembershipChange };

/** A student's change in progress, in the users list and on their profile. */
const MembershipChangeChip = ({ change }: MembershipChangeChipProps) => <Chip {...LIVE_CHANGE_CHIPS[change]} />;

export default MembershipChangeChip;
