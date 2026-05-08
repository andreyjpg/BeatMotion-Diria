import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Alert } from "react-native";

type CreateCourseInput = {
  title: string;
  teacher: string;
  description: string;
  level: string;
  day: string;
  branchId?: string | null;
  createdBy: string;
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      const docRef = await addDoc(collection(firestore, "courses"), {
        title: input.title,
        teacher: input.teacher,
        description: input.description,
        level: input.level,
        day: input.day,
        branchId: input.branchId ?? null,
        createdBy: input.createdBy,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      Alert.alert("Curso", "Curso agregado correctamente.");
    },
    onError: (error: any) => {
      console.error("Error creating course:", error);
      Alert.alert("Error", "No se pudo guardar el curso.");
    },
  });
};
