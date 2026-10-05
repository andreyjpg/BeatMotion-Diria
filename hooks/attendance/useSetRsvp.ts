import { firestore } from "@/firebaseConfig";
import { useMutation } from "@tanstack/react-query";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

type RsvpStatus = "leaders" | "followers" | "no_asistira";

type SetRsvpParams = {
  classId: string;
  courseId: string;
  userId: string;
  rsvpStatus: RsvpStatus;
};

const setRsvp = async ({ classId, courseId, userId, rsvpStatus }: SetRsvpParams) => {
  const ref = doc(firestore, "attendance", `${classId}_${userId}`);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await setDoc(ref, { rsvpStatus, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, {
      classId,
      courseId,
      userId,
      attended: false,
      rsvpStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
};

export const useSetRsvp = () => {
  return useMutation({ mutationFn: setRsvp });
};
