import ImageModal from "@/components/ImageModal";
import AppText from "@/components/ui/AppText";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

type ReceiptPreviewProps = {
  url: string | null;
  /** Height of the preview in px. */
  height: number;
  /** Why there's no image. */
  emptyMessage: string;
};

/** A receipt to review: tapping it opens it full screen. */
const ReceiptPreview = ({ url, height, emptyMessage }: ReceiptPreviewProps) => {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setZoomed(true)}
        disabled={!url}
        accessibilityRole="button"
        accessibilityLabel="Ampliar comprobante"
        className="mx-3 mt-2.5 overflow-hidden rounded-[18px] bg-control"
        style={{ height }}
      >
        {url ? (
          <Image source={{ uri: url }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center gap-2 px-6">
            <Ionicons name="image-outline" size={32} color={palette.faint} />
            <AppText tone="muted" className="text-center text-[13px]">
              {emptyMessage}
            </AppText>
          </View>
        )}
        <View className="absolute left-3 top-3 rounded-md bg-surface px-2 py-1">
          <AppText variant="label" tone="muted" className="text-[10px]">
            Comprobante
          </AppText>
        </View>
        {url && (
          <View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="expand-outline" size={18} color={palette.ink} />
          </View>
        )}
      </Pressable>
      <ImageModal isVisible={zoomed} imageSelected={url ?? ""} toggleVisibility={() => setZoomed(false)} />
    </>
  );
};

export default ReceiptPreview;
