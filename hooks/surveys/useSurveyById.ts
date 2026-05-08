import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { surveySchema } from "./surveySchema";

const fetchSurveyById = async (surveyId: string) => {
  try {
    const docRef = doc(firestore, "surveys", surveyId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error("Encuesta no encontrada");
    }

    const survey = {
      id: snapshot.id,
      ...snapshot.data(),
    };

    return surveySchema.parse(survey);
  } catch (error) {
    console.error("Error fetching survey:", error);
    throw error;
  }
};

export const useSurveyById = (surveyId: string) => {
  return useQuery({
    queryKey: ["survey", surveyId],
    queryFn: () => fetchSurveyById(surveyId),
    enabled: !!surveyId,
  });
};
