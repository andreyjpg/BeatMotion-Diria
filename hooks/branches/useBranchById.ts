import { firestore } from "@/firebaseConfig";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { branchSchema } from "./schema";

const fetchBranchById = async (id: string) => {
  const snapshot = await getDoc(doc(firestore, "branches", id));
  if (!snapshot.exists()) throw new Error("Sucursal no encontrada");
  return branchSchema.parse({ id: snapshot.id, ...snapshot.data() });
};

export const useBranchById = (id: string) => {
  return useQuery({
    queryKey: ["branches", id],
    queryFn: () => fetchBranchById(id),
    enabled: !!id,
  });
};
