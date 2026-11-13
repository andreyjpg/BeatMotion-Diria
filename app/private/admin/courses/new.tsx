import CourseForm from "@/components/courses/CourseForm";
import { useCreateCourse } from "@/hooks/courses/useCreateCourse";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";

const NewCourseScreen = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const createCourse = useCreateCourse();

  return (
    <CourseForm
      heading="Nuevo curso"
      saveLabel="Guardar curso"
      saving={createCourse.isPending}
      onSave={({ branchId, ...values }) =>
        createCourse.mutate(
          {
            ...values,
            branchId: branchId || null,
            createdBy: user!.uid,
          },
          {
            onSuccess: (id) => router.replace({ pathname: "/private/admin/courses/[id]", params: { id } }),
          },
        )
      }
    />
  );
};

export default NewCourseScreen;
