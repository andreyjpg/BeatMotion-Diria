import ClassForm from "@/components/courses/ClassForm";
import { useCreateClass } from "@/hooks/classes/useCreateClass";
import { useLocalSearchParams, useRouter } from "expo-router";

const NewClassScreen = () => {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const createClass = useCreateClass();

  return (
    <ClassForm
      heading="Nueva clase"
      preselectedCourseId={courseId}
      saveLabel="Guardar clase"
      saving={createClass.isPending}
      onSave={({ videos, description, objectives, ...values }) =>
        createClass.mutate(
          {
            ...values,
            description: description || null,
            objectives: objectives || null,
            videoLinks: videos,
          },
          { onSuccess: () => router.back() },
        )
      }
    />
  );
};

export default NewClassScreen;
