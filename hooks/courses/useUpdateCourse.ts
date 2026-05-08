import { firestore } from "@/firebaseConfig";
import { useMutation } from "@tanstack/react-query";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Alert } from "react-native";

type IncomingData = {
  id: string;
  title: string;
  teacher: string;
  description: string;
  level: string;
  isDeleted: boolean;
  branchId?: string | null;
};

type UpdateCourseBody =
  | { id: string; patch: Partial<Omit<IncomingData, "id">> }
  | { id: string; patch: Partial<Pick<IncomingData, "isDeleted">> };

export const useUpdateCourse = () => {
  const updateCourse = async ({ id, patch }: UpdateCourseBody) => {
    try {
      await updateDoc(doc(firestore, "courses", id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Curso", "Actualizado correctamente.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo actualizar el curso.");
    }
  };
  const mutation = useMutation({
    mutationFn: updateCourse,
  });
  return mutation;
};
