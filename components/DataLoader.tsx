import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

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

export default function DataLoader<T>({
  query,
  children,
  emptyMessage = "No data available",
}: DataLoaderProps<T>) {
  const { data, isLoading, isError, error, isRefetching, refetch } = query;

  // Spinner only until there's data: background refetches (pull to refresh,
  // invalidations) keep the content on screen, so forms keep their edits.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" />
        <Text className="mt-4 dark:text-white">Loading...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text style={{ color: "red", fontWeight: "bold" }}>Error</Text>
        <Text>{(error as Error)?.message ?? "Something went wrong"}</Text>
      </View>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <MaterialCommunityIcons
          name="dance-ballroom"
          size={48}
          color="#4b5563"
        />
        <Text className="text-white mt-3">{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children(data, isRefetching, refetch)}</>;
}
