import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { ProfilePayload } from "./userSchema";

// Only admins can change `role`; the database rejects it for everyone else.
const updateProfile = async ({ uid, body }: ProfilePayload) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: body.name,
        last_name: body.lastName,
        phone: body.phone,
        ...(body.role ? { role: body.role as "user" | "admin" | "teacher" } : {}),
      })
      .eq("id", uid);
    if (error) throw error;

    Alert.alert("Perfil", "Perfil actualizado correctamente.");
  } catch (err) {
    console.error("Error saving profile:", err);
    Alert.alert("Error", "No se pudo actualizar el perfil.");
  }
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (_data, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ["user", uid] });
      queryClient.invalidateQueries({ queryKey: ["activeUser"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
