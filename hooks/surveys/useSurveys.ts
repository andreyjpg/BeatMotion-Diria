import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { surveyListSchema } from "./surveySchema";

const fetchSurveys = async () => {
  try {
    const q = query(
      collection(firestore, "surveys"),
      where("isDeleted", "==", false),
    );
    const snapshot = await getDocs(q);
    const surveys = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return surveyListSchema.parse(surveys);
  } catch (error) {
    console.error("Error fetching surveys:", error);
    throw error;
  }
};

export const useSurveys = () => {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: fetchSurveys,
    staleTime: 1000 * 60 * 5,
  });
};
