import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { surveyResponseListSchema, SurveyResults } from "./surveySchema";

const calculateSurveyResults = async (
  surveyId: string,
): Promise<SurveyResults> => {
  try {
    const q = query(
      collection(firestore, "surveyResponses"),
      where("surveyId", "==", surveyId),
    );
    const snapshot = await getDocs(q);
    const responses = surveyResponseListSchema.parse(
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    );

    if (responses.length === 0) {
      return {
        surveyId,
        totalResponses: 0,
        averageRatings: {},
        responseDistribution: {},
        textResponses: {},
        completionRate: 0,
      };
    }

    const averageRatings: Record<string, number> = {};
    const responseDistribution: Record<string, Record<string, number>> = {};
    const textResponses: Record<string, string[]> = {};

    responses.forEach((response) => {
      response.responses.forEach((qResponse) => {
        const { questionId, questionType, response: answer } = qResponse;

        if (questionType === "rating") {
          if (!averageRatings[questionId]) averageRatings[questionId] = 0;
          averageRatings[questionId] += Number(answer);
        } else if (questionType === "multiple_choice") {
          if (!responseDistribution[questionId])
            responseDistribution[questionId] = {};
          const option = String(answer);
          responseDistribution[questionId][option] =
            (responseDistribution[questionId][option] || 0) + 1;
        } else if (questionType === "text") {
          if (!textResponses[questionId]) textResponses[questionId] = [];
          textResponses[questionId].push(String(answer));
        }
      });
    });

    Object.keys(averageRatings).forEach((questionId) => {
      averageRatings[questionId] =
        Math.round((averageRatings[questionId] / responses.length) * 10) / 10;
    });

    return {
      surveyId,
      totalResponses: responses.length,
      averageRatings,
      responseDistribution,
      textResponses,
      completionRate: 100,
    };
  } catch (error) {
    console.error("Error calculating survey results:", error);
    throw error;
  }
};

export const useSurveyResults = (surveyId: string) => {
  return useQuery({
    queryKey: ["surveyResults", surveyId],
    queryFn: () => calculateSurveyResults(surveyId),
    enabled: !!surveyId,
    staleTime: 1000 * 60 * 5,
  });
};
