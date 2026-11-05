import type { ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";

type ReportScrollProps = {
  isRefetching: boolean;
  refetch: () => void;
  children: ReactNode;
};

/** A report's content, scrolling and with pull to refresh. */
const ReportScroll = ({ isRefetching, refetch, children }: ReportScrollProps) => (
  <ScrollView
    contentContainerClassName="gap-2.5 px-3 pb-8 pt-3.5"
    showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
  >
    {children}
  </ScrollView>
);

export default ReportScroll;
