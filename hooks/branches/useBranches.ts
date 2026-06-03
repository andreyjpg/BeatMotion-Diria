import { firestore } from "@/firebaseConfig";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { branchListSchema } from "./schema";

const branchQuery = query(
  collection(firestore, "branches"),
  where("isDeleted", "==", false),
);

const fetchBranches = async () => {
  const snapshot = await getDocs(branchQuery);
  const branches = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return branchListSchema.parse(branches);
};

export const useBranches = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const unsub = onSnapshot(branchQuery, (snapshot) => {
      const branches = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      try {
        queryClient.setQueryData(["branches"], branchListSchema.parse(branches));
      } catch {
        queryClient.setQueryData(["branches"], branches);
      }
    });
    return () => unsub();
  }, [queryClient]);

  return query;
};
