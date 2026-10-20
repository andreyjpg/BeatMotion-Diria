import { formatCurrency } from "@/constants/helpers";
import type { Event } from "./schema";

export const formatEventPrice = (price: Event["price"]) => {
  if (price === null || price === 0) return "Gratuito";
  return formatCurrency(price, "CRC");
};

export const formatEventCapacity = (capacity: Event["capacity"]) => {
  if (capacity === null) return "Cupos ilimitados";
  return `Cupos: ${capacity}`;
};

export const formatEventAudience = (isPublic: boolean) =>
  isPublic ? "Abierto al publico" : "Solo miembros";

export const formatEventDateTime = (date: Date) =>
  date.toLocaleString("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
