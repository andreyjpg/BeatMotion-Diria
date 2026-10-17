import { AntDesign, Ionicons } from "@expo/vector-icons";
import { JSX } from "react";
import { Image, Text, TouchableHighlight, View } from "react-native";

type PhotoCardProps<T extends { status: string }> = {
  onClickImage: (img: string) => void;
  showStatusApprovement?: boolean;
  onConfirmation?: (item: T, status: "approve" | "reject") => void;
  children: JSX.Element;
  item: T;
  image: string | null;
};
const PhotoCard = <T extends { status: string }>({
  onClickImage,
  image,
  item,
  showStatusApprovement,
  onConfirmation = () => {},
  children,
}: PhotoCardProps<T>) => {
  return (
    <TouchableHighlight
      className="bg-gray-900 rounded-3xl overflow-hidden flex-1"
      onPress={() => {
        if (image) onClickImage(image);
      }}
    >
      <>
        {item.status === "pending" && showStatusApprovement && (
          <View className="absolute top-2 right-2 z-10 flex-row gap-4">
            <TouchableHighlight
              className="w-12 h-12 rounded-full bg-green-600 items-center justify-center"
              onPress={() => onConfirmation(item, "approve")}
            >
              <AntDesign name="check" size={16} color="#fff" />
            </TouchableHighlight>
            <TouchableHighlight
              className="w-12 h-12 rounded-full bg-red-600 items-center justify-center"
              onPress={() => onConfirmation(item, "reject")}
            >
              <AntDesign name="close" size={16} color="#fff" />
            </TouchableHighlight>
          </View>
        )}
        <View className="h-36 w-full bg-gray-950">
          {image ? (
            <Image
              source={{ uri: image }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="image-outline" size={36} color="#4b5563" />
              <Text className="text-gray-500 mt-2 text-xs">Sin imagen</Text>
            </View>
          )}
        </View>
        <View className="p-4 gap-2">{children}</View>
      </>
    </TouchableHighlight>
  );
};

export default PhotoCard;
