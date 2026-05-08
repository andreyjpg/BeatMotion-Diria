import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Alert } from "react-native";

const deleteSurvey = async (surveyId: string) => {
  const docRef = doc(firestore, "surveys", surveyId);
  await updateDoc(docRef, {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
};

export const useDeleteSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      Alert.alert("Éxito", "Encuesta eliminada correctamente.");
    },
    onError: (error: any) => {
      console.error("Error deleting survey:", error);
      Alert.alert("Error", "No se pudo eliminar la encuesta.");
    },
  });
};
