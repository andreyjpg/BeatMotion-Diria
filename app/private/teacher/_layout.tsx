import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Redirect, Stack } from "expo-router";

// What a teacher can do with their courses: read them and take attendance.
// Admins reach the attendance sheet from here too. Creating and editing
// courses and classes lives in the admin stack (admins only).
export default function TeacherLayout() {
  const { user, isLoading } = useActiveUser();

  if (isLoading) return null;
  if (!user) return <Redirect href="/public/login" />;
  if (user.role !== "teacher" && user.role !== "admin") return <Redirect href="/private/home" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
