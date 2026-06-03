import { firestore } from "@/firebaseConfig";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { courseSchema } from "./schema/courseSchema";

const courseQuery = query(
  collection(firestore, "courses"),
  where("isDeleted", "==", false),
  orderBy("createdAt", "desc"),
);

const fetchCoursesAvailable = async () => {
  const snapshot = await getDocs(courseQuery);
  const courses = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return courseSchema.parse(courses).filter((c) => !!c.branchId);
};

export const useCoursesAvailable = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["courses", "available"],
    queryFn: fetchCoursesAvailable,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const unsub = onSnapshot(courseQuery, (snapshot) => {
      const courses = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => !!c.branchId);
      queryClient.setQueryData(["courses", "available"], courses);
    });
    return () => unsub();
  }, [queryClient]);

  return query;
};
