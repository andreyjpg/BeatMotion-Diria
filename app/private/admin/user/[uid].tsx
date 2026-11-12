import DataLoader from "@/components/DataLoader";
import AgeChip from "@/components/profile/AgeChip";
import BirthDateRow from "@/components/profile/BirthDateRow";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { statusTone } from "@/components/ui/Chip";
import DateTimeField from "@/components/ui/DateTimeField";
import Field from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import IconButton from "@/components/ui/IconButton";
import InfoRow from "@/components/ui/InfoRow";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SelectField from "@/components/ui/SelectField";
import SwitchRow from "@/components/ui/SwitchRow";
import { capitalize, digitsOnly, formatYYYYMMDD, parseLocalDate, roleLabel, standingLabel } from "@/constants/helpers";
import { adminProfileFormSchema, FormErrors, validationErrors } from "@/constants/validationForms";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCourses } from "@/hooks/courses/useCourses";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useManualEnrollment } from "@/hooks/enrollment/useManualEnrollment";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useDeleteProfilePhoto } from "@/hooks/user/useDeleteProfilePhoto";
import { useSetUserActive } from "@/hooks/user/useSetUserActive";
import { useUpdateProfile } from "@/hooks/user/useUpdateProfile";
import { useUserInfo } from "@/hooks/user/useUserInfo";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, View } from "react-native";

type Role = "user" | "teacher" | "admin";

const ROLES: { value: Role; label: string }[] = [
  { value: "user", label: roleLabel.user },
  { value: "teacher", label: roleLabel.teacher },
  { value: "admin", label: roleLabel.admin },
];

/** Admin: one person's details, role, courses and whether their account is active. */
const AdminUserProfile = () => {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user: activeUser } = useActiveUser();
  const userQuery = useUserInfo(uid);
  const coursesQuery = useCoursesByUserMember(uid);
  const allCoursesQuery = useCourses();
  const branchesQuery = useBranches();
  const updateProfile = useUpdateProfile();
  const setUserActive = useSetUserActive();
  const deletePhoto = useDeleteProfilePhoto();
  const manualEnrollment = useManualEnrollment();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<FormErrors<typeof adminProfileFormSchema>>({});

  const profile = userQuery.data;
  const fullName = profile ? `${profile.name} ${profile.lastName}`.trim() || "Sin nombre" : "Usuario";
  // Admins can't lock themselves out: no changing their own role or deactivating themselves.
  const isSelf = activeUser?.uid === uid;

  const courses = coursesQuery.data ?? [];
  const available = (allCoursesQuery.data ?? []).filter((course) => !courses.some((c) => c.courseId === course.id));
  const standing = courses.some((c) => c.paymentStatus === "late")
    ? "late"
    : courses.some((c) => c.paymentStatus === "pending")
      ? "pending"
      : courses.length > 0
        ? "ok"
        : null;

  const startEditing = () => {
    if (!profile) return;
    setName(profile.name);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? "");
    setBirthDate(parseLocalDate(profile.birthDate));
    setErrors({});
    setEditing(true);
  };

  const save = () => {
    const phoneDigits = digitsOnly(phone);
    const found = validationErrors(adminProfileFormSchema, { name, lastName, phone: phoneDigits, birthDate });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    updateProfile.mutate(
      {
        uid,
        body: {
          name: name.trim(),
          lastName: lastName.trim(),
          phone: phoneDigits,
          birthDate: birthDate ? formatYYYYMMDD(birthDate) : null,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const confirmRole = (role: Role) => {
    if (!profile || role === profile.role) return;
    Alert.alert("Cambiar rol", `¿Cambiar el rol de ${fullName} a ${roleLabel[role]}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cambiar",
        onPress: () =>
          updateProfile.mutate({
            uid,
            body: { name: profile.name, lastName: profile.lastName, phone: profile.phone ?? "", role },
          }),
      },
    ]);
  };

  const confirmAssign = (courseId: string) => {
    const course = available.find((c) => c.id === courseId);
    if (!course) return;
    Alert.alert("Asignar a un curso", `¿Asignar a ${fullName} a ${course.title}? No se le cobra esta matrícula.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Asignar", onPress: () => manualEnrollment.mutate({ userId: uid, courseId }) },
    ]);
  };

  const confirmRemovePhoto = () => {
    Alert.alert("Quitar foto de perfil", `¿Quitar la foto de ${fullName}? Podrá subir otra.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: () =>
          deletePhoto.mutate(uid, {
            onSuccess: () => Alert.alert("Foto quitada", `Se quitó la foto de perfil de ${fullName}.`),
          }),
      },
    ]);
  };

  const refresh = () => {
    userQuery.refetch();
    coursesQuery.refetch();
  };

  return (
    <Screen
      form={editing}
      refreshControl={editing ? undefined : <RefreshControl refreshing={userQuery.isRefetching} onRefresh={refresh} />}
      footer={
        editing ? (
          <FormActions
            saveLabel="Guardar cambios"
            onSave={save}
            onCancel={() => setEditing(false)}
            loading={updateProfile.isPending}
            hasErrors={Object.keys(errors).length > 0}
          />
        ) : undefined
      }
    >
      <ScreenHeader
        eyebrow="Perfil de usuario"
        title={fullName}
        leading={profile ? <Avatar name={profile.name} lastName={profile.lastName} photoUrl={profile.photoURL} tone="dark" size={64} /> : undefined}
        right={
          profile && !editing ? (
            <IconButton icon="create-outline" onPress={startEditing} accessibilityLabel="Editar datos" />
          ) : undefined
        }
      />
      <DataLoader query={userQuery} emptyMessage="No encontramos este usuario.">
        {(profile) =>
          editing ? (
            <Card className="mx-3 mt-4 gap-3.5">
              <Field label="Nombre *" value={name} onChangeText={setName} error={errors.name} />
              <Field label="Apellido *" value={lastName} onChangeText={setLastName} error={errors.lastName} />
              <Field
                label="Teléfono *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                error={errors.phone}
              />
              <DateTimeField
                label="Fecha de nacimiento"
                mode="date"
                value={birthDate}
                onChange={setBirthDate}
                onClear={() => setBirthDate(null)}
                error={errors.birthDate}
              />
            </Card>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-1.5 px-5 pt-3">
                <AgeChip birthDate={profile.birthDate} />
                <Chip label={roleLabel[profile.role]} />
                {standing && <Chip label={standingLabel[standing]} tone={statusTone(standing)} />}
                {!profile.isActive && <Chip label="Inactivo" tone="muted" />}
              </View>

              <Card padded={false} className="mx-3 mt-4 px-4 py-1">
                <InfoRow label="Teléfono">{profile.phone || "—"}</InfoRow>
                <InfoRow label="Correo">{profile.email}</InfoRow>
                <BirthDateRow birthDate={profile.birthDate} divider={false} />
              </Card>

              {!isSelf && (
                <Card className="mx-3 mt-2.5 gap-2.5">
                  <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
                    Rol
                  </AppText>
                  <SegmentedControl
                    segments={ROLES}
                    value={profile.role}
                    onChange={confirmRole}
                    tone="dark"
                    accessibilityLabel="Rol del usuario"
                  />
                </Card>
              )}

              <Card className="mx-3 mt-2.5 gap-1">
                <AppText variant="label-bold" accessibilityRole="header" className="pb-1 text-[12px]">
                  Cursos
                </AppText>
                {courses.length === 0 && !coursesQuery.isLoading && (
                  <AppText tone="muted" className="py-2 text-[14px]">
                    Sin cursos activos.
                  </AppText>
                )}
                {courses.map((course) => {
                  const branch = branchesQuery.data?.find((b) => b.id === course.branchId);
                  return (
                    <View key={course.id} className="flex-row items-center gap-2.5 border-b border-line-soft py-2.5">
                      <View className="flex-1">
                        <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
                          {course.title}
                        </AppText>
                        <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                          {[course.day && capitalize(course.day), branch?.name].filter(Boolean).join(" · ")}
                        </AppText>
                      </View>
                      <View>
                        <Chip
                          label={standingLabel[course.paymentStatus] ?? course.paymentStatus}
                          tone={statusTone(course.paymentStatus)}
                        />
                      </View>
                    </View>
                  );
                })}
                <SelectField
                  label="Asignar a un curso"
                  value=""
                  onChange={confirmAssign}
                  options={available.map((course) => ({ value: course.id, label: course.title }))}
                  placeholder="Elegir curso"
                  disabled={available.length === 0 || manualEnrollment.isPending}
                  hint={allCoursesQuery.isSuccess && available.length === 0 ? "Ya está en todos los cursos." : undefined}
                  className="pt-2"
                />
              </Card>

              {!isSelf && profile.photoPath && (
                <Card className="mx-3 mt-2.5 flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <AppText variant="bold" className="text-[15px]">
                      Foto de perfil
                    </AppText>
                    <AppText tone="muted" className="text-[12.5px]">
                      Quítala si no es apropiada
                    </AppText>
                  </View>
                  <Button
                    label="Quitar"
                    variant="danger"
                    size="sm"
                    onPress={confirmRemovePhoto}
                    loading={deletePhoto.isPending}
                  />
                </Card>
              )}

              {!isSelf && (
                <Card className="mx-3 mt-2.5">
                  <SwitchRow
                    title="Cuenta activa"
                    hint={profile.isActive ? "Puede entrar a la app" : "No puede entrar a la app"}
                    value={profile.isActive}
                    onChange={(isActive) => setUserActive.mutate({ userId: uid, isActive })}
                    disabled={setUserActive.isPending}
                  />
                </Card>
              )}
            </>
          )
        }
      </DataLoader>
    </Screen>
  );
};

export default AdminUserProfile;
