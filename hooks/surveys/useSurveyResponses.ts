import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { surveyResponseListSchema } from "./surveySchema";

const fetchSurveyResponses = async (surveyId: string) => {
  try {
    const q = query(
      collection(firestore, "surveyResponses"),
      where("surveyId", "==", surveyId),
    );
    const snapshot = await getDocs(q);

    const responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return surveyResponseListSchema.parse(responses);
  } catch (error) {
    console.error("Error fetching survey responses:", error);
    throw error;
  }
};

export const useSurveyResponses = (surveyId: string) => {
  return useQuery({
    queryKey: ["surveyResponses", surveyId],
    queryFn: () => fetchSurveyResponses(surveyId),
    enabled: !!surveyId,
    staleTime: 1000 * 60 * 2,
  });
};
