import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { removeAvatars, uploadAvatar } from "../storage/avatarStorage";
import type { PickedImage } from "../storage/compressImage";

type UpdateProfilePhotoInput = { uid: string; image: PickedImage };

/** Saves a new profile picture; the previous one is deleted from storage. */
export const useUpdateProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, image }: UpdateProfilePhotoInput) => {
      const path = await uploadAvatar(uid, image);
      const { error } = await supabase
        .from("profiles")
        .update({ photo_path: path })
        .eq("id", uid);
      if (error) throw error;

      await removeAvatars(uid, path);
    },
    // Returned so the mutation stays pending until the new picture is on screen.
    onSuccess: (_data, { uid }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user", uid] }),
        queryClient.invalidateQueries({ queryKey: ["activeUser"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]),
    onError: (error) => {
      console.error("Error saving profile picture:", error);
      Alert.alert("Error", "No se pudo guardar la foto de perfil.");
    },
  });
};
