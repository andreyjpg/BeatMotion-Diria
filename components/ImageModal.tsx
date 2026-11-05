import IconButton from "@/components/ui/IconButton";
import { Image, Modal, View } from "react-native";

type ImageModalProps = {
  isVisible: boolean;
  imageSelected: string;
  toggleVisibility: () => void;
};

/** A photo (receipt, banner) full screen on black, with a close button. */
const ImageModal = ({
  isVisible,
  imageSelected,
  toggleVisibility,
}: ImageModalProps) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={isVisible}
      onRequestClose={toggleVisibility}
    >
      <View className="flex-1 items-center justify-center bg-ink">
        <Image
          source={{ uri: imageSelected || "" }}
          className="h-full w-full"
          resizeMode="contain"
        />
        <View className="absolute right-4 top-16">
          <IconButton
            icon="close"
            onPress={toggleVisibility}
            accessibilityLabel="Cerrar"
          />
        </View>
      </View>
    </Modal>
  );
};

export default ImageModal;
