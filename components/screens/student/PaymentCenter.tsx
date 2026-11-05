import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import { useRouter } from "expo-router";
import { useState } from "react";
import Detail from "./PaymentDetail";
import History from "./PaymentHistory";

type PaymentView = "due" | "history";

const SEGMENTS: { value: PaymentView; label: string }[] = [
  { value: "due", label: "Por pagar" },
  { value: "history", label: "Historial" },
];

/** Student "Pagos" tab: what they owe this month and the payments they sent. */
const PaymentCenter = () => {
  const router = useRouter();
  const [view, setView] = useState<PaymentView>("due");

  return (
    <Screen scroll={false} inTabs>
      <ScreenHeader
        nav={false}
        title="Pagos"
        right={
          // TODO(ayuda): mock entry to the help section (app/private/help).
          SHOW_FEATURE_MOCKS ? (
            <IconButton
              icon="help-circle-outline"
              onPress={() => router.push("/private/help")}
              accessibilityLabel="Ayuda y soporte"
            />
          ) : undefined
        }
      />
      <SegmentedControl
        segments={SEGMENTS}
        value={view}
        onChange={setView}
        accessibilityLabel="Secciones de pagos"
        className="mx-5 mt-4"
      />
      {view === "due" ? <Detail /> : <History />}
    </Screen>
  );
};

export default PaymentCenter;
