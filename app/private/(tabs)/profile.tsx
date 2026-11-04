import DataLoader from "@/components/DataLoader";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Field from "@/components/ui/Field";
import type { IconName } from "@/components/ui/IconButton";
import InfoRow from "@/components/ui/InfoRow";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { digitsOnly, PRIVACY_POLICY_URL, roleLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { FormErrors, profileFormSchema, validationErrors } from "@/constants/validationForms";
import { useDeleteAccount } from "@/hooks/auth/useDeleteAccount";
import { useSignOut } from "@/hooks/auth/useSignOut";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useUpdateProfile } from "@/hooks/user/useUpdateProfile";
import { useUserInfo } from "@/hooks/user/useUserInfo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";

const ActionRow = ({
  icon,
  label,
  onPress,
  chevron = false,
  divider = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  chevron?: boolean;
  divider?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-70 ${divider ? "border-b border-line-soft" : ""}`}
  >
    <Ionicons name={icon} size={20} color={palette.ink} />
    <AppText variant="semibold" className="flex-1 text-[15px]">
      {label}
    </AppText>
    {chevron && <Ionicons name="chevron-forward" size={18} color={palette.ink} />}
  </Pressable>
);

const ProfileScreen = () => {
  const { user: activeUser } = useActiveUser();
  const userInfo = useUserInfo(activeUser?.uid as string);
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof profileFormSchema>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleEdit = () => {
    setName(userInfo.data?.name ?? "");
    setLastName(userInfo.data?.lastName ?? "");
    setPhone(userInfo.data?.phone ?? "");
    setErrors({});
    setEditing(true);
  };

  const handleSave = async () => {
    const phoneDigits = digitsOnly(phone);
    const found = validationErrors(profileFormSchema, { name, lastName, phone: phoneDigits });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await updateProfile.mutateAsync({
      uid: activeUser?.uid || "",
      body: { name, lastName, phone: phoneDigits },
    });
    // Back to the saved data, not what it said before saving.
    await userInfo.refetch();
    setEditing(false);
  };

  // Signing out unmounts this screen (the root layout switches to the login
  // stack), so await mutateAsync() instead of relying on mutate() callbacks.
  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      router.replace("/public/login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "No se pudo cerrar la sesión. Inténtalo de nuevo.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync();
      router.replace("/public/login");
    } catch (error) {
      console.error("Delete account error:", error);
      Alert.alert("Error", "No se pudo eliminar la cuenta. Inténtalo de nuevo.");
    }
  };

  return (
    <Screen form inTabs>
      <ScreenHeader nav={false} title="Perfil" />
      <DataLoader query={userInfo} emptyMessage="No encontramos tu perfil.">
        {(profile) => (
          <>
            <Card className="mx-3 mt-4 flex-row items-center gap-3.5">
              <Avatar name={profile.name} lastName={profile.lastName} photoUrl={profile.photoURL} size={68} tone="dark" />
              <View className="flex-1 gap-1">
                <AppText variant="bold" className="text-[19px]">
                  {`${profile.name} ${profile.lastName}`.trim() || "Sin nombre"}
                </AppText>
                <AppText tone="muted" className="text-[13.5px]" numberOfLines={1}>
                  {profile.email || "Sin correo"}
                </AppText>
                {activeUser && <Chip label={roleLabel[activeUser.role] ?? activeUser.role} tone="ok" />}
              </View>
            </Card>

            {/* TODO(cumpleaños): the design also shows the birth date and age, which
                need birth_date on profiles (see TODO.md). */}
            {editing ? (
              <Card className="mx-3 mt-2.5 gap-3">
                <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
                  Editar datos
                </AppText>
                <View className="flex-row items-start gap-2.5">
                  <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" error={errors.name} className="flex-1" />
                  <Field label="Apellido" value={lastName} onChangeText={setLastName} placeholder="Tu apellido" error={errors.lastName} className="flex-1" />
                </View>
                <Field
                  label="Teléfono"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Tu teléfono"
                  error={errors.phone}
                />
                <View className="flex-row gap-2.5">
                  <Button
                    label="Cancelar"
                    variant="secondary"
                    onPress={() => setEditing(false)}
                    disabled={updateProfile.isPending}
                    className="flex-1"
                  />
                  <Button label="Guardar" onPress={handleSave} loading={updateProfile.isPending} className="flex-1" />
                </View>
              </Card>
            ) : (
              <Card className="mx-3 mt-2.5 py-2">
                <View className="flex-row items-center justify-between py-1.5">
                  <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
                    Mis datos
                  </AppText>
                  <Button label="Editar" icon="create-outline" variant="secondary" size="sm" onPress={handleEdit} />
                </View>
                <InfoRow label="Nombre">{profile.name || "—"}</InfoRow>
                <InfoRow label="Apellido">{profile.lastName || "—"}</InfoRow>
                <InfoRow label="Teléfono">{profile.phone || "—"}</InfoRow>
                <InfoRow label="Correo" divider={false}>
                  {profile.email || "—"}
                </InfoRow>
              </Card>
            )}

            <Card padded={false} className="mx-3 mt-2.5 py-1">
              <ActionRow
                icon="lock-closed-outline"
                label="Políticas de privacidad"
                onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                chevron
                divider
              />
              <ActionRow icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} />
            </Card>

            <Pressable
              onPress={() => setShowDeleteModal(true)}
              accessibilityRole="button"
              className="mt-2 items-center py-3.5 active:opacity-70"
            >
              <AppText variant="semibold" tone="danger" className="text-[14px]">
                Eliminar mi cuenta
              </AppText>
            </Pressable>
          </>
        )}
      </DataLoader>
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </Screen>
  );
};

export default ProfileScreen;
