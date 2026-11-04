import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DateTimeField from "@/components/ui/DateTimeField";
import Field from "@/components/ui/Field";
import FieldError from "@/components/FieldError";
import FormActions from "@/components/ui/FormActions";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SelectField from "@/components/ui/SelectField";
import { courseFormSchema, FormErrors, validationErrors } from "@/constants/validationForms";
import { useBranches } from "@/hooks/branches/useBranches";
import { useTeachers } from "@/hooks/user/useTeachers";
import { useState } from "react";
import { Pressable, View } from "react-native";

const DAYS = [
  { value: "lunes", short: "L", label: "Lunes" },
  { value: "martes", short: "K", label: "Martes" },
  { value: "miércoles", short: "M", label: "Miércoles" },
  { value: "jueves", short: "J", label: "Jueves" },
  { value: "viernes", short: "V", label: "Viernes" },
  { value: "sábado", short: "S", label: "Sábado" },
  { value: "domingo", short: "D", label: "Domingo" },
];

type Level = "0" | "1" | "2" | "3";

const LEVELS: { value: Level; label: string }[] = [
  { value: "0", label: "Nivel 0" },
  { value: "1", label: "Nivel 1" },
  { value: "2", label: "Nivel 2" },
  { value: "3", label: "Nivel 3" },
];

export type CourseFormValues = {
  title: string;
  description: string;
  level: string;
  day: string;
  teacherId: string;
  branchId: string;
  startDate: Date | null;
};

type CourseFormProps = {
  heading: string;
  /** The course being edited; without it the form creates a new one. */
  initial?: CourseFormValues;
  saveLabel: string;
  saving: boolean;
  onSave: (values: CourseFormValues) => void;
  /** Editing only: asks for confirmation first, on the screen. */
  onDelete?: () => void;
};

/** The course form, for creating and for editing. */
export default function CourseForm({ heading, initial, saveLabel, saving, onSave, onDelete }: CourseFormProps) {
  const branchesQuery = useBranches();
  const teachersQuery = useTeachers();
  const teachers = teachersQuery.data ?? [];

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [level, setLevel] = useState(initial?.level ?? "0");
  const [day, setDay] = useState(initial?.day ?? "lunes");
  const [chosenTeacherId, setTeacherId] = useState(initial?.teacherId ?? "");
  const [branchId, setBranchId] = useState(initial?.branchId ?? "");
  const [startDate, setStartDate] = useState<Date | null>(initial?.startDate ?? null);
  const [errors, setErrors] = useState<FormErrors<typeof courseFormSchema>>({});

  // A new course starts with the first teacher; an edited one keeps its own (or none).
  const teacherId = chosenTeacherId || (initial ? "" : (teachers[0]?.id ?? ""));

  const save = () => {
    const found = validationErrors(courseFormSchema, { title, teacherId, level, description });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({ title: title.trim(), description: description.trim(), level, day, teacherId, branchId, startDate });
  };

  const teacherHint = teachersQuery.isError
    ? "No se pudieron cargar los profesores."
    : teachersQuery.isSuccess && teachers.length === 0
      ? "No hay profesores. Asigna el rol de profesor a un usuario."
      : undefined;

  return (
    <Screen
      form
      footer={
        <FormActions
          saveLabel={saveLabel}
          onSave={save}
          loading={saving}
          disabled={teachers.length === 0}
          hasErrors={Object.keys(errors).length > 0}
        />
      }
    >
      <ScreenHeader
        nav="close"
        eyebrow="Cursos"
        title={heading}
        subtitle="Los campos con * son obligatorios."
      />

      <Card className="mx-3 mt-4 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Información
        </AppText>
        <Field label="Título *" value={title} onChangeText={setTitle} placeholder="Salsa Nivel 1" error={errors.title} />
        <Field
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="De qué trata el curso"
          multiline
          error={errors.description}
        />
        <View>
          <AppText variant="semibold" className="mb-1.5 text-[13px]">
            Nivel *
          </AppText>
          <SegmentedControl
            segments={LEVELS}
            value={level as Level}
            onChange={setLevel}
            tone="dark"
            accessibilityLabel="Nivel"
          />
          <FieldError message={errors.level} />
        </View>
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Horario
        </AppText>
        <View>
          <AppText variant="semibold" className="mb-1.5 text-[13px]">
            Día *
          </AppText>
          <View accessibilityRole="radiogroup" accessibilityLabel="Día" className="flex-row gap-[5px]">
            {DAYS.map((option) => {
              const selected = option.value === day;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setDay(option.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: selected }}
                  className={`h-10 flex-1 items-center justify-center rounded-xl border-[1.5px] ${
                    selected ? "border-ink bg-ink" : "border-field-line bg-surface"
                  }`}
                >
                  <AppText variant="semibold" tone={selected ? "inverse" : "ink"} className="text-[13.5px]">
                    {option.short}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <DateTimeField
          label="Inicia"
          mode="date"
          value={startDate}
          onChange={setStartDate}
          onClear={() => setStartDate(null)}
        />
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Asignación
        </AppText>
        <SelectField
          label="Profesor *"
          value={teacherId}
          onChange={setTeacherId}
          options={teachers.map((t) => ({ value: t.id, label: `${t.name} ${t.lastName}` }))}
          placeholder={teachersQuery.isLoading ? "Cargando profesores…" : "Sin asignar"}
          disabled={teachers.length === 0}
          hint={teacherHint}
          error={errors.teacherId}
        />
        <SelectField
          label="Sede"
          value={branchId}
          onChange={setBranchId}
          options={[
            { value: "", label: "Sin sede" },
            ...(branchesQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
      </Card>

      {onDelete && (
        <Button label="Eliminar curso" variant="danger" icon="trash-outline" onPress={onDelete} className="mx-3 mt-4" />
      )}
    </Screen>
  );
}
