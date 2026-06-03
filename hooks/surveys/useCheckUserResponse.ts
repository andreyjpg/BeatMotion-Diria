import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

const checkIfUserResponded = async (surveyId: string, userId: string) => {
  try {
    const q = query(
      collection(firestore, "surveyResponses"),
      where("surveyId", "==", surveyId),
      where("userId", "==", userId),
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user response:", error);
    return false;
  }
};

export const useCheckUserResponse = (surveyId: string, userId: string) => {
  return useQuery({
    queryKey: ["surveyResponse", "check", surveyId, userId],
    queryFn: () => checkIfUserResponded(surveyId, userId),
    enabled: !!surveyId && !!userId,
  });
};
