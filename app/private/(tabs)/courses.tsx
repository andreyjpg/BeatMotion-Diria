import CoursesMenu from "@/components/screens/admin/CoursesMenu";
import MyCourses from "@/components/screens/student/MyCourses";
import { useActiveUser } from "@/hooks/user/UseActiveUser";

/** "Cursos" tab: the student's courses, or course management for admins. */
export default function CoursesTab() {
  const { user } = useActiveUser();
  return user?.role === "admin" ? <CoursesMenu /> : <MyCourses />;
}
