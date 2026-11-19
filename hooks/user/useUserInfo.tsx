import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "react-native";
import { signAvatarUrls, withPhotoUrl } from "../storage/avatarStorage";
import { PROFILE_COLUMNS, userSchema } from "./userSchema";

const fetchUser = async (userid: string) => {
  try {
    const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userid).single();
    if (error) throw error;
    const urls = await signAvatarUrls([data.photoPath]);
    return userSchema.parse(withPhotoUrl(data, urls));
  } catch (err) {
    console.error("Error loading user:", err);
    Alert.alert("Error", "No se pudo cargar el usuario.");
  }
};

export const useUserInfo = (userid: string) => {
  return useQuery({
    queryKey: ["user", userid],
    queryFn: () => fetchUser(userid),
    enabled: !!userid,
  });
};
