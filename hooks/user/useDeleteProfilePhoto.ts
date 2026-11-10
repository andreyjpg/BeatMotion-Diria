import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { removeAvatars } from "../storage/avatarStorage";

/**
 * Takes the profile picture off the profile and deletes it from storage: the
 * user's own, or anyone's for an admin (a picture that isn't appropriate).
 */
export const useDeleteProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.from("profiles").update({ photo_path: null }).eq("id", uid);
      if (error) throw error;

      await removeAvatars(uid);
    },
    // Returned so the mutation stays pending until the initials are back on screen.
    onSuccess: (_data, uid) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user", uid] }),
        queryClient.invalidateQueries({ queryKey: ["activeUser"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["membersByCourse"] }),
        queryClient.invalidateQueries({ queryKey: ["availableStudents"] }),
        queryClient.invalidateQueries({ queryKey: ["eventSignups"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
      ]),
    onError: (error) => {
      console.error("Error removing profile picture:", error);
      Alert.alert("Error", "No se pudo quitar la foto de perfil.");
    },
  });
};
