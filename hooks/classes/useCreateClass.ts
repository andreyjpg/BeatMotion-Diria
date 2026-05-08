import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Alert } from "react-native";

type VideoLink = {
  url: string;
  platform: "youtube" | "vimeo";
  title?: string | null;
};

type CreateClassInput = {
  courseId: string;
  title: string;
  description?: string | null;
  content: string;
  objectives?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  videoLinks?: VideoLink[];
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const docRef = await addDoc(collection(firestore, "classes"), {
        courseId: input.courseId,
        title: input.title,
        description: input.description ?? null,
        content: input.content,
        objectives: input.objectives ?? null,
        date: input.date ?? null,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        videoLinks: input.videoLinks ?? [],
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      Alert.alert("Clase", "Creada correctamente.");
    },
    onError: (error: any) => {
      console.error("Error creating class:", error);
      Alert.alert("Error", "No se pudo crear la clase.");
    },
  });
};
