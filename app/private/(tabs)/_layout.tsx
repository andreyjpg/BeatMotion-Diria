import TabBar, { type TabItem } from "@/components/ui/TabBar";
import { useCreateFCMToken } from "@/hooks/notifications/useCreateFCMToken";
import { useMyNotifications } from "@/hooks/notifications/useMyNotifications";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Tabs } from "expo-router";

/** Tab routes in this folder; each role sees only some of them. */
type TabName = "home" | "courses" | "payments" | "notices" | "users" | "profile";

const tabsFor = (role: string | undefined, unreadNotices: boolean): (TabItem & { name: TabName })[] => {
  const home = { name: "home", label: "Inicio", icon: "home-outline" } as const;
  const profile = { name: "profile", label: "Perfil", icon: "person-outline" } as const;
  const notices = { name: "notices", label: "Avisos", icon: "notifications-outline", badge: unreadNotices } as const;

  if (role === "admin") {
    return [
      home,
      { name: "payments", label: "Cobros", icon: "card-outline" },
      { name: "courses", label: "Cursos", icon: "book-outline" },
      { name: "users", label: "Usuarios", icon: "people-outline" },
      profile,
    ];
  }
  if (role === "teacher") return [{ ...home, label: "Clases", icon: "book-outline" }, notices, profile];
  return [
    home,
    { name: "courses", label: "Cursos", icon: "book-outline" },
    { name: "payments", label: "Pagos", icon: "card-outline" },
    notices,
    profile,
  ];
};

/** Main navigation once signed in: a bottom tab bar per role. */
export default function TabsLayout() {
  const { user } = useActiveUser();
  const notificationsQuery = useMyNotifications();
  useCreateFCMToken();

  const unread = notificationsQuery.data?.some((n) => !n.read) ?? false;
  const items = tabsFor(user?.role, unread);
  const visible = new Set<TabName>(items.map((i) => i.name));
  // Tabs of other roles can't be opened, not even by URL.
  const hrefFor = (name: TabName) => (visible.has(name) ? undefined : null);

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} items={items} />}>
      <Tabs.Screen name="home" options={{ href: hrefFor("home") }} />
      <Tabs.Screen name="courses" options={{ href: hrefFor("courses") }} />
      <Tabs.Screen name="payments" options={{ href: hrefFor("payments") }} />
      <Tabs.Screen name="notices" options={{ href: hrefFor("notices") }} />
      <Tabs.Screen name="users" options={{ href: hrefFor("users") }} />
      <Tabs.Screen name="profile" options={{ href: hrefFor("profile") }} />
    </Tabs>
  );
}
