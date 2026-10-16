import { Text } from "react-native";

type FieldErrorProps = {
  message?: string;
  /** Spacing; defaults to sitting just below the input, like SignIn. */
  className?: string;
};

/** Red validation message shown under a form field (renders nothing when empty). */
export default function FieldError({ message, className = "mt-1" }: FieldErrorProps) {
  if (!message) return null;
  return <Text className={`text-red-500 text-xs ml-3 ${className}`}>{message}</Text>;
}
