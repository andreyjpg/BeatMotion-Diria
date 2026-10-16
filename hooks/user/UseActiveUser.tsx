import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { PROFILE_COLUMNS } from "./userSchema";

const fetchActiveUser = async (userId: string) => {
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? { ...data, uid: data.id } : null;
};

/** The signed-in user's profile, with `uid` (same as `id`) for older screens. */
export type UserType = NonNullable<Awaited<ReturnType<typeof fetchActiveUser>>>;

// undefined = session not restored from storage yet; null = signed out.
const SessionContext = createContext<Session | null | undefined>(undefined);

/** Tracks the Supabase session for the whole app. Mount once, at the root. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Fires INITIAL_SESSION right away with the stored session, then on every
    // sign-in, sign-out and token refresh. Only store the session here: calling
    // other Supabase methods inside this callback can deadlock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Drop everything cached for the previous user.
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** The signed-in user's profile (with `uid`), or null when signed out. */
export const useActiveUser = () => {
  const session = useContext(SessionContext);
  const userId = session?.user.id;

  const { data: user, isLoading } = useQuery({
    queryKey: ["activeUser", userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: () => fetchActiveUser(userId!),
  });

  return {
    user: userId ? (user ?? null) : null,
    session,
    isLoading: session === undefined || (!!userId && isLoading),
  };
};
