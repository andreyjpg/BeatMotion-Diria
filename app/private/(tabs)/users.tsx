import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import Chip, { statusTone, type ChipTone } from "@/components/ui/Chip";
import Field from "@/components/ui/Field";
import Pill from "@/components/ui/Pill";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { ageOrDash, formatDayMonth, parseLocalDate, roleLabel, standingLabel } from "@/constants/helpers";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useUsers } from "@/hooks/user/useUsers";
import type { PaymentStanding, UserListItem } from "@/hooks/user/userSchema";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, View } from "react-native";

type Filter = "all" | PaymentStanding;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "ok", label: "Al día" },
  { value: "pending", label: "Pendiente" },
  { value: "late", label: "Atrasado" },
];

const userChip = (user: UserListItem): { label: string; tone: ChipTone } => {
  if (!user.isActive) return { label: "Inactivo", tone: "muted" };
  if (user.role !== "user") return { label: roleLabel[user.role], tone: "line" };
  if (user.paymentStatus) return { label: standingLabel[user.paymentStatus], tone: statusTone(user.paymentStatus) };
  return { label: "Sin cursos", tone: "muted" };
};

/** What a student's row says after their age: their courses and next payment. */
const studentActivity = (user: UserListItem) => {
  if (!user.isActive) return "cuenta desactivada";
  if (user.courses.length === 0) return "sin cursos activos";
  const courses = user.courses.length === 1 ? "1 curso" : `${user.courses.length} cursos`;
  const nextPayment = parseLocalDate(user.nextPaymentDate);
  return nextPayment ? `${courses} · próximo pago ${formatDayMonth(nextPayment)}` : courses;
};

/** Second line of a user's row: a student's age and courses, or a teacher's or admin's email. */
const userDetail = (user: UserListItem) => {
  if (user.role !== "user") return user.isActive ? user.email : "Cuenta desactivada";
  return `${ageOrDash(user.birthDate)} · ${studentActivity(user)}`;
};

/** Ignores upper case and accents: "maria" finds "María". */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Admin "Usuarios" tab: everyone in the app, to search and filter by how their payments stand. */
const AdminUsersScreen = () => {
  const { user } = useActiveUser();
  const router = useRouter();
  const usersQuery = useUsers();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  if (user && user.role !== "admin") return <Redirect href="/private/home" />;

  const users = usersQuery.data ?? [];
  const activeStudents = users.filter((u) => u.role === "user" && u.isActive).length;
  const teachers = users.filter((u) => u.role === "teacher" && u.isActive).length;
  const countFor = (value: Filter) =>
    value === "all" ? undefined : users.filter((u) => u.isActive && u.paymentStatus === value).length;

  const query = normalize(search.trim());
  const shown = users.filter(
    (u) =>
      (filter === "all" || (u.isActive && u.paymentStatus === filter)) &&
      normalize(`${u.name} ${u.lastName} ${u.email}`).includes(query),
  );

  return (
    <Screen scroll={false} inTabs>
      <ScreenHeader
        nav={false}
        title="Usuarios"
        subtitle={
          usersQuery.data
            ? `${activeStudents} ${activeStudents === 1 ? "estudiante activo" : "estudiantes activos"} · ${teachers} ${teachers === 1 ? "profesor" : "profesores"}`
            : undefined
        }
      />
      <Field
        label="Buscar"
        hideLabel
        icon="search"
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre o correo"
        autoCapitalize="none"
        className="mx-5 mt-4"
      />
      <View className="pt-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel="Filtrar por estado de pago"
          contentContainerClassName="gap-1.5 px-5"
        >
          {FILTERS.map((option) => (
            <Pill
              key={option.value}
              label={option.label}
              count={countFor(option.value)}
              selected={option.value === filter}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      <DataLoader query={usersQuery} emptyMessage="No hay usuarios registrados.">
        {(_data, isRefetching, refetch) => (
          <FlatList
            data={shown}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-2 px-3 pb-8 pt-3.5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListEmptyComponent={
              <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
                Ningún usuario coincide con la búsqueda.
              </AppText>
            }
            renderItem={({ item }) => {
              const chip = userChip(item);
              const name = `${item.name} ${item.lastName}`.trim();
              return (
                <Card
                  onPress={() => router.push({ pathname: "/private/admin/user/[uid]", params: { uid: item.id } })}
                  accessibilityLabel={`${name}, ${chip.label}`}
                  padded={false}
                  className={`flex-row items-center gap-3 px-3.5 py-3 ${item.isActive ? "" : "opacity-60"}`}
                >
                  <Avatar name={item.name} lastName={item.lastName} photoUrl={item.photoURL} size={42} />
                  <View className="flex-1 gap-0.5">
                    <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
                      {name || "Sin nombre"}
                    </AppText>
                    <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
                      {userDetail(item)}
                    </AppText>
                  </View>
                  <View>
                    <Chip {...chip} />
                  </View>
                </Card>
              );
            }}
          />
        )}
      </DataLoader>
    </Screen>
  );
};

export default AdminUsersScreen;
