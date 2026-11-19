import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";
import { TRANSFER_ACCOUNTS } from "@/constants/academy";
import { withoutSeparators } from "@/constants/helpers";
import { useState } from "react";
import { View } from "react-native";

/** Where to send the transfer: one row per academy account, with a button that copies it. */
const TransferDetails = () => {
  // As in the design, the check stays on the last row copied until another one is.
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  return (
    <Card padded={false} className="mx-3 mt-2.5 px-4 py-1.5">
      {TRANSFER_ACCOUNTS.map((account, index) => {
        const isLast = index === TRANSFER_ACCOUNTS.length - 1;
        return (
          <View
            key={account.label}
            className={`flex-row items-center gap-2.5 py-2 ${isLast ? "" : "border-b border-line-soft"}`}
          >
            <View className="flex-1 gap-0.5">
              <AppText variant="label" tone="muted" className="text-[9.5px]">
                {account.label}
              </AppText>
              <AppText variant="label-bold" className="text-[14px] normal-case tracking-normal">
                {account.value}
              </AppText>
            </View>
            <CopyButton
              value={withoutSeparators(account.value)}
              accessibilityLabel={`Copiar ${account.label}`}
              copied={copiedLabel === account.label}
              onCopied={() => setCopiedLabel(account.label)}
            />
          </View>
        );
      })}
    </Card>
  );
};

export default TransferDetails;
