import AppText from "@/components/ui/AppText";

type FieldErrorProps = {
  message?: string;
  /** Spacing; defaults to sitting just below the input. */
  className?: string;
};

/** Validation message shown under a form field (renders nothing when empty). */
export default function FieldError({ message, className = "mt-1.5" }: FieldErrorProps) {
  if (!message) return null;
  return (
    <AppText tone="danger" className={`text-[12.5px] leading-[17px] ${className}`}>
      {message}
    </AppText>
  );
}
