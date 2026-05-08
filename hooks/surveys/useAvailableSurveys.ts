import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { surveyListSchema } from "./surveySchema";

const fetchAvailableSurveys = async (userId: string, courseIds: string[]) => {
  if (courseIds.length === 0) return [];

  try {
    const q = query(
      collection(firestore, "surveys"),
      where("courseId", "in", courseIds),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    );
    const snapshot = await getDocs(q);

    const responsesQuery = query(
      collection(firestore, "surveyResponses"),
      where("userId", "==", userId),
    );
    const responsesSnapshot = await getDocs(responsesQuery);
    const answeredSurveyIds = new Set(
      responsesSnapshot.docs.map((doc) => doc.data().surveyId),
    );

    const now = new Date();
    const surveys = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((survey: any) => {
        if (answeredSurveyIds.has(survey.id)) return false;

        if (survey.expiresAt) {
          const expiresAt =
            survey.expiresAt.toDate?.() || new Date(survey.expiresAt);
          if (expiresAt < now) return false;
        }

        return true;
      });

    return surveyListSchema.parse(surveys);
  } catch (error) {
    console.error("Error fetching available surveys:", error);
    throw error;
  }
};

export const useAvailableSurveys = (userId: string, courseIds: string[]) => {
  return useQuery({
    queryKey: ["surveys", "available", userId, courseIds],
    queryFn: () => fetchAvailableSurveys(userId, courseIds),
    enabled: !!userId && courseIds.length > 0,
    staleTime: 1000 * 60 * 3,
  });
};
