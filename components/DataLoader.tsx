import AppText from "@/components/ui/AppText";
import palette from "@/constants/palette.json";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, View } from "react-native";

/** What DataLoader reads from a query (useQuery, or useInfiniteQuery with `select`). */
type LoadableQuery<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isRefetching: boolean;
  refetch: () => unknown;
};

type DataLoaderProps<T> = {
  query: LoadableQuery<T>;
  /** Only called with data: loading, errors and empty/null results render a message instead. */
  children: (
    data: NonNullable<T>,
    isRefetching: boolean,
    refetch: () => void
  ) => React.ReactNode;
  emptyMessage?: string;
};

// The "faint" gray reads on the new light screens and on the old dark ones
// still waiting for the redesign.
export default function DataLoader<T>({
  query,
  children,
  emptyMessage = "No hay datos disponibles",
}: DataLoaderProps<T>) {
  const { data, isLoading, isError, error, isRefetching, refetch } = query;

  // Spinner only until there's data: background refetches (pull to refresh,
  // invalidations) keep the content on screen, so forms keep their edits.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator size="large" color={palette.faint} />
        <AppText tone="faint" className="mt-3 text-[14px]">
          Cargando…
        </AppText>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-1 p-6">
        <AppText variant="bold" tone="faint" className="text-[15px]">
          No se pudo cargar
        </AppText>
        <AppText tone="faint" className="text-center text-[13px]">
          {error?.message ?? "Inténtalo de nuevo en un momento."}
        </AppText>
      </View>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <MaterialCommunityIcons name="dance-ballroom" size={44} color={palette.faint} />
        <AppText tone="faint" className="mt-3 text-center text-[14.5px]">
          {emptyMessage}
        </AppText>
      </View>
    );
  }

  return <>{children(data, isRefetching, refetch)}</>;
}
