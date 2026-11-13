import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type CourseProgressHintProps = {
  onEditCourse: () => void;
};

/** Admin: where the progress card goes when the course has no class dates, with a way to add them. */
const CourseProgressHint = ({ onEditCourse }: CourseProgressHintProps) => (
  <Card className="mx-3 mt-4 gap-2.5">
    <AppText variant="label" tone="muted" className="text-[10px]">
      Progreso del curso
    </AppText>
    <AppText className="text-[14px] leading-[20px]">Agrega el día y las fechas del curso para ver su progreso.</AppText>
    <Button
      label="Editar curso"
      variant="secondary"
      size="sm"
      icon="create-outline"
      onPress={onEditCourse}
      className="self-start"
    />
  </Card>
);

export default CourseProgressHint;
