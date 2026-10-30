import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Detail from "./PaymentDetail";
import History from "./PaymentHistory";

const OPTION_MENU = [
  { label: "Detalle de pago", value: "detail" },
  { label: "Pagos realizados", value: "history" },
];

const PaymentCenter = () => {
  const [menuValue, setMenuValue] = useState(OPTION_MENU[0].value);

  const handleMenuChange = (value: string) => {
    setMenuValue(value);
  };
  return (
    <SafeAreaView className="bg-gray-950 flex-1">
      <HeaderTitle title="Centro de pagos" />
      <View className="items-center mb-2">
        <FilterPills
          options={OPTION_MENU}
          selected={menuValue}
          onSelect={handleMenuChange}
        />
      </View>

      {menuValue === "detail" ? <Detail /> : <History />}
    </SafeAreaView>
  );
};

export default PaymentCenter;
