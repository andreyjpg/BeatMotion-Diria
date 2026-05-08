import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { Alert } from "react-native";
import { SurveyQuestion } from "./surveySchema";

type CreateSurveyInput = {
  title: string;
  description?: string;
  courseId: string;
  questions: Omit<SurveyQuestion, "id">[];
  createdBy: string;
  expiresAt?: Date | null;
};

const createSurvey = async (input: CreateSurveyInput) => {
  const questionsWithIds = input.questions.map((q, index) => ({
    ...q,
    id: `q${index + 1}_${Date.now()}`,
  }));

  const surveyData = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    courseId: input.courseId,
    questions: questionsWithIds,
    isActive: true,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
    isDeleted: false,
  };

  const docRef = await addDoc(collection(firestore, "surveys"), surveyData);
  return docRef.id;
};

export const useCreateSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      Alert.alert("Éxito", "Encuesta creada correctamente.");
    },
    onError: (error: any) => {
      console.error("Error creating survey:", error);
      Alert.alert("Error", "No se pudo crear la encuesta.");
    },
  });
};
