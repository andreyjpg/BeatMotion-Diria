import ProgressBlocks, { type BlocksViewer, ProgressSwatch } from "@/components/courses/ProgressBlocks";
import AppText from "@/components/ui/AppText";
import { formatShortDate, hhmmTo12h } from "@/constants/helpers";
import type { ProgressBlock, ProgressBlockState } from "@/hooks/courses/courseProgress";
import { View } from "react-native";

const SWATCH_SIZE = 12;

/** The texts of the card. */
export type ProgressHeroTexts = {
  label: string;
  /** The big number. */
  value: string;
  /** Two lines on the right of the number. */
  top: string;
  bottom: string;
  /** Under a line at the bottom; left out when empty. */
  note: string;
};

export type ProgressLegendItem = { state: ProgressBlockState; label: string };

/** The bar of a course with class dates, and its legend. */
export type ProgressHeroBar = {
  blocks: ProgressBlock[];
  legend: ProgressLegendItem[];
  viewer: BlocksViewer;
};

/** "lun 2 nov" ("" without a date). */
export const dayLabel = (date: Date | null) => (date ? formatShortDate(date).toLowerCase() : "");

/** "Próxima · lun 26 oct · 7:00 p. m." */
export const nextClassLabel = (date: Date | null, startTime: string | null) =>
  ["Próxima", dayLabel(date), hhmmTo12h(startTime)].filter(Boolean).join(" · ");

type ProgressHeroMessageProps = {
  /** Loading or error. */
  message: string;
  /** Layout only (margins). */
  className?: string;
};

/** The card while its progress loads or when it failed. */
export const ProgressHeroMessage = ({ message, className = "" }: ProgressHeroMessageProps) => (
  <View className={`gap-2 rounded-[22px] bg-ink p-[18px] ${className}`}>
    <AppText variant="label" tone="hero-muted" className="text-[10px]">
      Progreso del curso
    </AppText>
    <AppText tone="hero-soft" className="text-[14px]">
      {message}
    </AppText>
  </View>
);

type ProgressHeroCardProps = {
  texts: ProgressHeroTexts;
  /** Left out for a course without class dates. */
  bar?: ProgressHeroBar;
  /** Layout only (margins). */
  className?: string;
};

/** Black card with a course's progress: a big number, one block per class date, a legend and a note. */
const ProgressHeroCard = ({ texts, bar, className = "" }: ProgressHeroCardProps) => (
  <View className={`gap-3.5 rounded-[22px] bg-ink p-[18px] ${className}`}>
    <View className="flex-row items-end justify-between gap-3">
      <View className="gap-1.5">
        <AppText variant="label" tone="hero-muted" className="text-[10px]">
          {texts.label}
        </AppText>
        <AppText variant="heavy" tone="inverse" className="text-[44px] leading-[48px]">
          {texts.value}
        </AppText>
      </View>
      <View className="flex-1 items-end">
        <AppText tone="hero-soft" className="text-right text-[13.5px] leading-[19px]">
          {texts.top}
        </AppText>
        <AppText variant="bold" tone="inverse" className="text-right text-[13.5px] leading-[19px]">
          {texts.bottom}
        </AppText>
      </View>
    </View>
    {bar && (
      <>
        <ProgressBlocks blocks={bar.blocks} theme="dark" viewer={bar.viewer} />
        <View className="flex-row flex-wrap gap-3.5">
          {bar.legend.map((item) => (
            <View key={item.state} className="flex-row items-center gap-1.5">
              <ProgressSwatch state={item.state} theme="dark" size={SWATCH_SIZE} />
              <AppText tone="hero-soft" className="text-[12.5px]">
                {item.label}
              </AppText>
            </View>
          ))}
        </View>
      </>
    )}
    {!!texts.note && (
      <AppText tone="hero-soft" className="border-t border-hero-line pt-3 text-[14px] leading-[20px]">
        {texts.note}
      </AppText>
    )}
  </View>
);

export default ProgressHeroCard;
