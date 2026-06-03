import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { Alert } from "react-native";
import { SurveyQuestion } from "./surveySchema";

type UpdateSurveyInput = {
  surveyId: string;
  title?: string;
  description?: string;
  questions?: SurveyQuestion[];
  isActive?: boolean;
  expiresAt?: Date | null;
};

const updateSurvey = async (input: UpdateSurveyInput) => {
  const { surveyId, ...updates } = input;

  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title) updateData.title = updates.title.trim();
  if (updates.description !== undefined)
    updateData.description = updates.description?.trim() || null;
  if (updates.questions) updateData.questions = updates.questions;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
  if (updates.expiresAt !== undefined) {
    updateData.expiresAt = updates.expiresAt
      ? Timestamp.fromDate(updates.expiresAt)
      : null;
  }

  const docRef = doc(firestore, "surveys", surveyId);
  await updateDoc(docRef, updateData);
};

export const useUpdateSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      Alert.alert("Éxito", "Encuesta actualizada correctamente.");
    },
    onError: (error: any) => {
      console.error("Error updating survey:", error);
      Alert.alert("Error", "No se pudo actualizar la encuesta.");
    },
  });
};
