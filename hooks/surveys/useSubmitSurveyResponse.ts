import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Alert } from "react-native";
import { QuestionResponse } from "./surveySchema";

type SubmitSurveyResponseInput = {
  surveyId: string;
  userId: string;
  courseId: string;
  responses: QuestionResponse[];
  completionTimeSeconds?: number;
};

const submitSurveyResponse = async (input: SubmitSurveyResponseInput) => {
  const responseData = {
    surveyId: input.surveyId,
    userId: input.userId,
    courseId: input.courseId,
    responses: input.responses,
    submittedAt: serverTimestamp(),
    completionTimeSeconds: input.completionTimeSeconds || null,
  };

  const docRef = await addDoc(
    collection(firestore, "surveyResponses"),
    responseData,
  );
  return docRef.id;
};

export const useSubmitSurveyResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitSurveyResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveyResponses"] });
      queryClient.invalidateQueries({ queryKey: ["surveys", "available"] });
      Alert.alert(
        "¡Gracias!",
        "Tu respuesta ha sido enviada correctamente. Tu opinión nos ayuda a mejorar.",
      );
    },
    onError: (error: any) => {
      console.error("Error submitting survey response:", error);
      Alert.alert("Error", "No se pudo enviar tu respuesta. Intenta de nuevo.");
    },
  });
};
