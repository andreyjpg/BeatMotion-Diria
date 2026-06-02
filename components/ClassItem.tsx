import { sanitizeVimeoUrl, sanitizeYouTubeUrl } from "@/constants/helpers";
import { ClassesType } from "@/hooks/classes/classesSchema";
import VimeoVideoPlayer from "./VimeoVideoPlayer";
import YouTubeVideoPlayer from "./YoutubeVideoPlayer";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  item: ClassesType;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
};

const ClassItem = ({ item, index, isOpen, onToggle }: Props) => {
  return (
    <View className="mb-3">
      <Pressable
        className={`bg-gray-900 px-4 py-3 flex-row justify-between items-center ${
          isOpen ? "rounded-t-2xl" : "rounded-2xl"
        }`}
        onPress={onToggle}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center">
            <Text className="text-gray-400 text-xs font-bold">{index + 1}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-semibold">
              {item.title}
            </Text>
            <View className="flex-row items-center gap-3 mt-1 flex-wrap">
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                <Text className="text-gray-500 text-xs">{item.date}</Text>
              </View>
              {item.startTime && item.endTime && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="time-outline" size={12} color="#6b7280" />
                  <Text className="text-gray-500 text-xs">
                    {item.startTime} – {item.endTime}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6b7280"
        />
      </Pressable>

      {isOpen && (
        <View className="bg-gray-900 rounded-b-2xl px-4 pb-5 gap-4">
          <View className="h-px bg-gray-800" />

          {item.description ? (
            <View className="gap-1">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
                Descripción
              </Text>
              <Text className="text-gray-300 text-sm leading-5">
                {item.description}
              </Text>
            </View>
          ) : null}

          {item.objectives ? (
            <View className="gap-1">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
                Objetivos
              </Text>
              <Text className="text-gray-300 text-sm leading-5">
                {item.objectives}
              </Text>
            </View>
          ) : null}

          {item.content ? (
            <View className="gap-1">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
                Contenido
              </Text>
              <Text className="text-gray-300 text-sm leading-5">
                {item.content}
              </Text>
            </View>
          ) : null}

          {item.videoLinks && item.videoLinks.length > 0 && (
            <View className="gap-3">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
                Videos
              </Text>
              {item.videoLinks.map((link, i) => (
                <View key={`${link.title}-${i}`}>
                  {link.platform === "youtube" ? (
                    <YouTubeVideoPlayer
                      videoURL={sanitizeYouTubeUrl(link.url) || ""}
                    />
                  ) : (
                    <VimeoVideoPlayer
                      videoId={sanitizeVimeoUrl(link.url) || ""}
                    />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ClassItem;
