import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { surveyResponseListSchema } from "./surveySchema";

const fetchResponsesByCourse = async (courseId: string) => {
  try {
    const q = query(
      collection(firestore, "surveyResponses"),
      where("courseId", "==", courseId),
    );
    const snapshot = await getDocs(q);

    const responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return surveyResponseListSchema.parse(responses);
  } catch (error) {
    console.error("Error fetching responses by course:", error);
    throw error;
  }
};

export const useResponsesByCourse = (courseId: string) => {
  return useQuery({
    queryKey: ["surveyResponses", courseId],
    queryFn: () => fetchResponsesByCourse(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });
};
