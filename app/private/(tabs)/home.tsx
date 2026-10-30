import HomeAdmin from "@/components/screens/admin/HomeAdmin";
import HomeUser from "@/components/screens/student/HomeUser";
import HomeTeacher from "@/components/screens/teacher/HomeTeacher";
import { useActiveUser } from "@/hooks/user/UseActiveUser";

/** First tab: each role has its own home. */
export default function HomeScreen() {
  const { user } = useActiveUser();

  if (user?.role === "admin") return <HomeAdmin />;
  if (user?.role === "teacher") return <HomeTeacher />;
  return <HomeUser />;
}
