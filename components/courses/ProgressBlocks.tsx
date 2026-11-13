import { plural } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { ProgressBlock, ProgressBlockState } from "@/hooks/courses/courseProgress";
import { useWindowDimensions, View } from "react-native";

/** "light" on white cards, "dark" on the black progress card. */
export type BlocksTheme = "light" | "dark";

/** Whose bar it is: a student's counts the classes they attended and missed; staff's, the classes given. */
export type BlocksViewer = "student" | "staff";

type BlockLook = {
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
  /** Diagonal stripes: a class date with no class held, or from before the student joined. */
  stripeColor?: string;
};

const NO_CLASS_LIGHT: BlockLook = { backgroundColor: palette.ground, stripeColor: palette.line.strong };
// muted, not hero.line: hero.line was almost invisible on the black card.
const NO_CLASS_DARK: BlockLook = {
  backgroundColor: palette.ink,
  borderColor: palette.muted,
  borderWidth: 1,
  stripeColor: palette.muted,
};

const LOOKS: Record<BlocksTheme, Record<ProgressBlockState, BlockLook>> = {
  light: {
    attended: { backgroundColor: palette.ink },
    missed: { backgroundColor: palette.faint },
    noClass: NO_CLASS_LIGHT,
    beforeJoining: NO_CLASS_LIGHT,
    given: { backgroundColor: palette.sand.strong },
    today: { backgroundColor: palette.surface, borderColor: palette.ink, borderWidth: 2 },
    upcoming: { backgroundColor: palette.surface, borderColor: palette.line.strong, borderWidth: 1 },
  },
  dark: {
    attended: { backgroundColor: palette.surface },
    missed: { backgroundColor: palette.muted },
    noClass: NO_CLASS_DARK,
    beforeJoining: NO_CLASS_DARK,
    // Sand, not white: white is a student's "Asististe".
    given: { backgroundColor: palette.sand.strong },
    today: { backgroundColor: palette.ink, borderColor: palette.surface, borderWidth: 2.5 },
    upcoming: { backgroundColor: palette.ink, borderColor: palette.muted, borderWidth: 1.5 },
  },
};

const BAR_SIZE: Record<BlocksTheme, { height: number; gap: number; radius: number }> = {
  light: { height: 10, gap: 3, radius: 3 },
  dark: { height: 16, gap: 4, radius: 4 },
};

const SWATCH_RADIUS = 3;
const STRIPE_WIDTH = 1.5;
const STRIPE_SPACING = 5;

type StripesProps = { color: string; height: number; width: number };

/** Diagonal stripes across a block of up to `width`: React Native has no repeating gradients. */
const Stripes = ({ color, height, width }: StripesProps) => {
  const count = Math.ceil((width + 2 * height) / STRIPE_SPACING) + 1;
  return (
    <>
      {Array.from({ length: count }, (_, position) => (
        <View
          key={position}
          style={{
            position: "absolute",
            top: -height / 2,
            left: position * STRIPE_SPACING - height,
            width: STRIPE_WIDTH,
            height: height * 2,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      ))}
    </>
  );
};

type BlockProps = {
  look: BlockLook;
  height: number;
  radius: number;
  /** Fixed width (legend swatches); bar blocks share the row instead. */
  width?: number;
  /** The widest the block can be, so the stripes cover it. */
  maxWidth: number;
};

const Block = ({ look, height, radius, width, maxWidth }: BlockProps) => (
  <View
    className={`overflow-hidden ${width === undefined ? "flex-1" : ""}`}
    style={{
      width,
      height,
      borderRadius: radius,
      backgroundColor: look.backgroundColor,
      borderColor: look.borderColor,
      borderWidth: look.borderWidth ?? 0,
    }}
  >
    {!!look.stripeColor && <Stripes color={look.stripeColor} height={height} width={maxWidth} />}
  </View>
);

/**
 * What the bar shows, for screen readers: "6 clases asistidas, 1 falta, hoy la
 * clase 8, quedan 4 después de hoy" (student) or "6 clases dadas, 1 sin clase…" (staff).
 */
const blocksDescription = (blocks: ProgressBlock[], viewer: BlocksViewer) => {
  const count = (state: ProgressBlockState) => blocks.filter((block) => block.state === state).length;
  const upcoming = count("upcoming");
  if (upcoming === blocks.length) return `${plural(upcoming, "clase", "clases")} por venir`;
  const todayPosition = blocks.findIndex((block) => block.state === "today");
  const pastParts =
    viewer === "staff"
      ? [plural(count("given"), "clase dada", "clases dadas")]
      : [plural(count("attended"), "clase asistida", "clases asistidas"), plural(count("missed"), "falta", "faltas")];
  const parts = [
    ...pastParts,
    count("noClass") > 0 && `${count("noClass")} sin clase`,
    count("beforeJoining") > 0 && `${count("beforeJoining")} antes de tu ingreso`,
    todayPosition >= 0 && `hoy la clase ${todayPosition + 1}`,
    upcoming > 0 && `quedan ${upcoming}${todayPosition >= 0 ? " después de hoy" : ""}`,
  ];
  return parts.filter(Boolean).join(", ");
};

type ProgressBlocksProps = {
  blocks: ProgressBlock[];
  theme?: BlocksTheme;
  /** What the bar counts, for screen readers. */
  viewer?: BlocksViewer;
};

/** A course's progress bar: one block per class date (attended or given, missed, no class, today, to come). */
const ProgressBlocks = ({ blocks, theme = "light", viewer = "student" }: ProgressBlocksProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const size = BAR_SIZE[theme];
  // The bar is narrower than the window, so this is the most a block can take.
  const maxBlockWidth = windowWidth / Math.max(blocks.length, 1);
  return (
    <View
      className="flex-row"
      style={{ gap: size.gap, height: size.height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={blocksDescription(blocks, viewer)}
    >
      {blocks.map((block) => (
        // The state is part of the key: a block that changes state mounts
        // again instead of gaining a border (Android drops rounded corners).
        <Block
          key={`${block.date}-${block.state}`}
          look={LOOKS[theme][block.state]}
          height={size.height}
          radius={size.radius}
          maxWidth={maxBlockWidth}
        />
      ))}
    </View>
  );
};

type ProgressSwatchProps = {
  state: ProgressBlockState;
  theme?: BlocksTheme;
  /** Side in px. */
  size: number;
};

/** The small square that names a block state in a legend. */
export const ProgressSwatch = ({ state, theme = "light", size }: ProgressSwatchProps) => (
  <Block look={LOOKS[theme][state]} height={size} width={size} radius={SWATCH_RADIUS} maxWidth={size} />
);

export default ProgressBlocks;
