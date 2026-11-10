import { pickImage } from "@/components/pickImage";
import Avatar from "@/components/ui/Avatar";
import palette from "@/constants/palette.json";
import { useDeleteProfilePhoto } from "@/hooks/user/useDeleteProfilePhoto";
import { useUpdateProfilePhoto } from "@/hooks/user/useUpdateProfilePhoto";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

const PERMISSION_MESSAGE = "Necesitamos acceso a tu galería para que puedas elegir tu foto de perfil.";

type ProfilePhotoProps = {
  uid: string;
  name: string;
  lastName: string;
  photoUrl?: string | null;
};

/** The user's own picture: tap it to add, change or remove it. */
const ProfilePhoto = ({ uid, name, lastName, photoUrl }: ProfilePhotoProps) => {
  const updatePhoto = useUpdateProfilePhoto();
  const deletePhoto = useDeleteProfilePhoto();
  const saving = updatePhoto.isPending || deletePhoto.isPending;

  const choosePhoto = async () => {
    const image = await pickImage(PERMISSION_MESSAGE, true);
    if (image) updatePhoto.mutate({ uid, image });
  };

  const handlePress = () => {
    if (!photoUrl) {
      choosePhoto();
      return;
    }
    // On Android the last button is the main one, so "Cambiar foto" goes last.
    Alert.alert("Foto de perfil", undefined, [
      { text: "Quitar foto", style: "destructive", onPress: () => deletePhoto.mutate(uid) },
      { text: "Cancelar", style: "cancel" },
      { text: "Cambiar foto", onPress: choosePhoto },
    ]);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={photoUrl ? "Cambiar foto de perfil" : "Agregar foto de perfil"}
      accessibilityState={{ busy: saving }}
      className="active:opacity-70"
    >
      <Avatar name={name} lastName={lastName} photoUrl={photoUrl} size={68} tone="dark" />
      <View className="absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full border border-line bg-surface">
        {saving ? (
          <ActivityIndicator size="small" color={palette.ink} />
        ) : (
          <Ionicons name="camera" size={13} color={palette.ink} />
        )}
      </View>
    </Pressable>
  );
};

export default ProfilePhoto;
