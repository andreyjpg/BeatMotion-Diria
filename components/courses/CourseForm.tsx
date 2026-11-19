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
import { formatYYYYMMDD, to24h } from "@/constants/helpers";
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
  /** Null on courses saved before the schedule existed: the form asks for them. */
  startTime: Date | null;
  endTime: Date | null;
  teacherId: string;
  branchId: string;
  startDate: Date | null;
  endDate: Date | null;
};

/** What the hooks save: the times and dates as Postgres takes them. */
export type CourseFormOutput = Omit<CourseFormValues, "startTime" | "endTime" | "startDate" | "endDate"> & {
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null; // "YYYY-MM-DD"
};

type CourseFormErrors = FormErrors<typeof courseFormSchema>;

type CourseFormProps = {
  heading: string;
  /** The course being edited; without it the form creates a new one. */
  initial?: CourseFormValues;
  saveLabel: string;
  saving: boolean;
  onSave: (values: CourseFormOutput) => void;
  /** Editing only: asks for confirmation first, on the screen. */
  onDelete?: () => void;
};

/** The course form, for creating and for editing. */
const CourseForm = ({ heading, initial, saveLabel, saving, onSave, onDelete }: CourseFormProps) => {
  const branchesQuery = useBranches();
  const teachersQuery = useTeachers();
  const teachers = teachersQuery.data ?? [];

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [level, setLevel] = useState(initial?.level ?? "0");
  const [day, setDay] = useState(initial?.day ?? "lunes");
  const [chosenTeacherId, setTeacherId] = useState(initial?.teacherId ?? "");
  const [branchId, setBranchId] = useState(initial?.branchId ?? "");
  const [startTime, setStartTime] = useState<Date | null>(initial?.startTime ?? null);
  const [endTime, setEndTime] = useState<Date | null>(initial?.endTime ?? null);
  const [startDate, setStartDate] = useState<Date | null>(initial?.startDate ?? null);
  const [endDate, setEndDate] = useState<Date | null>(initial?.endDate ?? null);
  const [errors, setErrors] = useState<CourseFormErrors>({});

  // A new course starts with the first teacher; an edited one keeps its own (or none).
  const teacherId = chosenTeacherId || (initial ? "" : (teachers[0]?.id ?? ""));

  // A picker's message goes as soon as its value changes; the others stay until the next save.
  const clearError = (field: keyof CourseFormErrors) =>
    setErrors(({ [field]: _cleared, ...otherErrors }) => otherErrors);

  const handleStartTimeChange = (time: Date) => {
    setStartTime(time);
    clearError("startTime");
  };

  const handleEndTimeChange = (time: Date) => {
    setEndTime(time);
    clearError("endTime");
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    clearError("endDate");
  };

  const save = () => {
    const values = {
      title: title.trim(),
      description: description.trim(),
      level,
      day,
      startTime: startTime ? to24h(startTime) : "",
      endTime: endTime ? to24h(endTime) : "",
      teacherId,
      branchId,
      startDate: startDate ? formatYYYYMMDD(startDate) : null,
      endDate: endDate ? formatYYYYMMDD(endDate) : null,
    };
    // The schema compares the picked dates, not their "YYYY-MM-DD" text.
    const found = validationErrors(courseFormSchema, { ...values, startDate, endDate });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(values);
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
        <View className="flex-row gap-2.5">
          <DateTimeField
            label="Hora de inicio *"
            mode="time"
            value={startTime}
            onChange={handleStartTimeChange}
            error={errors.startTime}
            className="flex-1"
          />
          <DateTimeField
            label="Hora de fin *"
            mode="time"
            value={endTime}
            onChange={handleEndTimeChange}
            error={errors.endTime}
            className="flex-1"
          />
        </View>
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <View className="flex-row items-baseline justify-between">
          <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
            Fechas
          </AppText>
          <AppText tone="muted" className="text-[11px]">
            Opcional
          </AppText>
        </View>
        <View>
          <View className="flex-row gap-2.5">
            <DateTimeField
              label="Inicia"
              mode="date"
              value={startDate}
              onChange={setStartDate}
              onClear={() => setStartDate(null)}
              className="flex-1"
            />
            <DateTimeField
              label="Termina"
              mode="date"
              value={endDate}
              onChange={handleEndDateChange}
              onClear={() => handleEndDateChange(null)}
              initialDate={startDate ?? undefined}
              error={errors.endDate}
              className="flex-1"
            />
          </View>
          {!errors.endDate && (
            <AppText tone="muted" className="mt-1.5 text-[12.5px] leading-[17px]">
              Déjalas vacías si el curso es continuo y no tiene cierre.
            </AppText>
          )}
        </View>
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
};

export default CourseForm;
