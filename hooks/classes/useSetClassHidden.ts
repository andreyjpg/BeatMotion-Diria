import { supabase } from "@/lib/supabase";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import type { ClassesType } from "./classesSchema";

type SetClassHiddenInput = { id: string; isHidden: boolean };

/** Writes the flag into every cached copy of the class: the class lists and the class itself. */
const setCachedHidden = (queryClient: QueryClient, { id, isHidden }: SetClassHiddenInput) => {
  const withFlag = (cls: ClassesType) => (cls.id === id ? { ...cls, isHidden } : cls);
  queryClient.setQueriesData<ClassesType[]>({ queryKey: ["classes"] }, (classes) => classes?.map(withFlag));
  queryClient.setQueryData<ClassesType | null>(["classInfo", id], (cls) => (cls ? withFlag(cls) : cls));
};

/**
 * Admin hides a class from students or shows it again (the eye on the course
 * screen). The cache changes before the save so the "Oculta" chip follows the
 * tap; a failed save puts the old value back.
 */
export const useSetClassHidden = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isHidden }: SetClassHiddenInput) => {
      const { error } = await supabase.from("classes").update({ is_hidden: isHidden }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (input) => {
      // A refetch already on its way would bring back the old value.
      await queryClient.cancelQueries({ queryKey: ["classes"] });
      await queryClient.cancelQueries({ queryKey: ["classInfo", input.id] });
      setCachedHidden(queryClient, input);
    },
    onError: (error, input) => {
      console.error("Error setting class visibility:", error);
      setCachedHidden(queryClient, { id: input.id, isHidden: !input.isHidden });
      Alert.alert("Error", input.isHidden ? "No se pudo ocultar la clase." : "No se pudo mostrar la clase.");
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["classInfo", id] });
    },
  });
};
