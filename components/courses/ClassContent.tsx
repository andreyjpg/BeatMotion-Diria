import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import SectionHeader from "@/components/ui/SectionHeader";
import VimeoVideoPlayer from "@/components/VimeoVideoPlayer";
import YouTubeVideoPlayer from "@/components/YoutubeVideoPlayer";
import {
  formatShortDate,
  formatYYYYMMDD,
  hhmmTo12h,
  parseLocalDate,
  sanitizeVimeoUrl,
  sanitizeYouTubeUrl,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { ClassesType } from "@/hooks/classes/classesSchema";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

/** What a class is about, read only: date, description, objectives, content and videos. */
const ClassContent = ({ cls }: { cls: ClassesType }) => {
  const date = parseLocalDate(cls.date);
  const isToday = cls.date === formatYYYYMMDD(new Date());
  const time = [hhmmTo12h(cls.startTime), hhmmTo12h(cls.endTime)].filter(Boolean).join("–");
  const objectives = (cls.objectives ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  const videos = cls.videoLinks ?? [];
  const isEmpty = !cls.description && objectives.length === 0 && !cls.content && videos.length === 0;

  return (
    <>
      <View className="flex-row flex-wrap gap-1.5 px-5 pt-3">
        <Chip
          label={date ? `${isToday ? "Hoy · " : ""}${formatShortDate(date).toLowerCase()}` : "Sin fecha"}
          tone={isToday ? "ok" : "line"}
        />
        {time ? <Chip label={time} /> : null}
      </View>

      {cls.description ? <AppText className="px-5 pt-4 text-[15px] leading-[22px]">{cls.description}</AppText> : null}

      {objectives.length > 0 && (
        <Card className="mx-3 mt-4 gap-2.5">
          <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
            Objetivos
          </AppText>
          {objectives.map((goal, i) => (
            <View key={`${i}-${goal}`} className="flex-row items-start gap-2.5">
              <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-ink">
                <Ionicons name="checkmark" size={13} color={palette.surface} />
              </View>
              <AppText className="flex-1 text-[14.5px] leading-[20px]">{goal}</AppText>
            </View>
          ))}
        </Card>
      )}

      {cls.content ? (
        <Card className="mx-3 mt-2.5 gap-2.5">
          <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
            Contenido
          </AppText>
          <AppText className="text-[14.5px] leading-[22px]">{cls.content}</AppText>
        </Card>
      ) : null}

      {videos.length > 0 && (
        <>
          <SectionHeader title="Videos" />
          <View className="gap-2.5 px-3">
            {videos.map((video, i) => (
              <Card key={`${i}-${video.url}`} padded={false} className="overflow-hidden">
                {video.platform === "youtube" ? (
                  <YouTubeVideoPlayer videoURL={sanitizeYouTubeUrl(video.url) || ""} />
                ) : (
                  <VimeoVideoPlayer videoId={sanitizeVimeoUrl(video.url) || ""} />
                )}
                {video.title ? (
                  <AppText variant="bold" className="px-3.5 py-3 text-[14.5px]">
                    {video.title}
                  </AppText>
                ) : null}
              </Card>
            ))}
          </View>
        </>
      )}

      {isEmpty && (
        <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
          Esta clase todavía no tiene contenido.
        </AppText>
      )}
    </>
  );
};

export default ClassContent;
