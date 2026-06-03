import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { surveyListSchema } from "./surveySchema";

const fetchSurveysByCourse = async (courseId: string) => {
  try {
    const q = query(
      collection(firestore, "surveys"),
      where("courseId", "==", courseId),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(q);
    const surveys = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return surveyListSchema.parse(surveys);
  } catch (error) {
    console.error("Error fetching surveys by course:", error);
    throw error;
  }
};

export const useSurveysByCourse = (courseId: string) => {
  return useQuery({
    queryKey: ["surveys", courseId],
    queryFn: () => fetchSurveysByCourse(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });
};
