import { string } from "yup";

import * as yup from "yup";

export const signInValidationSchema = {
  name: string().required("El nombre es obligatorio"),
  lastName: string().required("El apellido es obligatorio"),
  phone: string().required("El teléfono es obligatorio"),
  email: string()
    .email("El email no es válido")
    .required("El email es obligatorio"),
  password: string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .required("La contraseña es obligatoria")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-])[A-Za-z\d@$!%*?&\-]{8,}$/,
      "La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial [@$!%*?&-].",
    ),
};

export const ProfileAdminValidationSchema = {
  name: string()
    .required("El nombre es obligatorio")
    .min(2, "El nombre debe de contener un mínimo de 2 letras"),
  lastName: string()
    .required("El apellido es obligatorio")
    .min(2, "El apellido debe de contener un mínimo de 2 letras"),
  phone: string()
    .required("El teléfono es obligatorio")
    .min(8, "Debe de ingresar un número válido")
    .max(8, "Debe de ingresar un número válido"),
  role: string()
    .oneOf(["user", "admin", "teacher"], "Rol no válido")
    .required("El rol es obligatorio"),
};

export const DraftValidationSchema = {
  title: string().required("El título es obligatorio"),
  content: string().required("El contenido es obligatorio"),
};

export const UserProfileValidationSchema = {
  name: string()
    .required("El nombre es obligatorio")
    .min(2, "El nombre debe de contener un mínimo de 2 letras"),
  lastName: string()
    .required("El apellido es obligatorio")
    .min(2, "El apellido debe de contener un mínimo de 2 letras"),
  phone: string()
    .required("El teléfono es obligatorio")
    .min(8, "Debe de ingresar un número válido")
    .max(8, "Debe de ingresar un número válido"),
};

export const eventSchema = yup.object().shape({
  title: yup
    .string()
    .trim()
    .required("El título es obligatorio.")
    .min(3, "El título debe tener al menos 3 caracteres."),
  description: yup.string().nullable(),
  datetime: yup
    .date()
    .required("La fecha del evento es obligatoria.")
    .min(new Date(), "La fecha no puede ser en el pasado."),
  capacityInput: yup.string().when(["unlimited"], (values, schema) => {
    const [unlimited] = values as [boolean];

    return unlimited
      ? schema.nullable()
      : schema
          .required("Debe indicar los cupos disponibles.")
          .matches(/^[0-9]+$/, "Debe ser un número válido.")
          .test(
            "min-1",
            "La capacidad debe ser al menos 1.",
            (v) => Number(v) > 0,
          );
  }),
  unlimited: yup.boolean(),
  priceInput: yup.string().when(["isFree"], (values, schema) => {
    const [isFree] = values as [boolean];

    return isFree
      ? schema.nullable()
      : schema
          .required("Debe indicar un precio.")
          .matches(/^[0-9]+$/, "Debe ser un número válido.")
          .test(
            "min-price",
            "El precio debe ser mayor a 0.",
            (v) => Number(v) > 0,
          );
  }),
  isFree: yup.boolean(),
  isPublic: yup.boolean(),
  status: yup
    .string()
    .oneOf(["draft", "published"], "Estado no válido.")
    .required(),
  category: yup.string().required("Debe seleccionar una categoría."),

  location: yup
    .string()
    .trim()
    .required("La ubicación es obligatoria.")
    .min(3, "La ubicación es demasiado corta."),

  bannerUrl: yup.string().url("La imagen debe ser una URL válida.").nullable(),
});

/** One message per invalid field, as shown under each input. */
export type FormErrors<S extends yup.AnyObjectSchema> = Partial<
  Record<keyof yup.InferType<S>, string>
>;

/**
 * Validates every field at once (like SignIn) and returns the first message
 * for each invalid field; an empty object means the values are valid.
 */
export const validationErrors = <S extends yup.AnyObjectSchema>(
  schema: S,
  values: unknown,
): FormErrors<S> => {
  try {
    schema.validateSync(values, { abortEarly: false });
    return {};
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) throw error;
    const errors: FormErrors<S> = {};
    for (const issue of error.inner) {
      const field = issue.path as keyof yup.InferType<S> | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return errors;
  }
};

// Limits match the database constraints on public.branches.
export const branchFormSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("El nombre es obligatorio.")
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(100, "El nombre no puede superar 100 caracteres."),
  location: yup
    .string()
    .trim()
    .required("La ubicación es obligatoria.")
    .min(2, "La ubicación debe tener al menos 2 caracteres.")
    .max(200, "La ubicación no puede superar 200 caracteres."),
});

// Limits match the database constraints on public.courses.
export const courseFormSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required("El título es obligatorio.")
    .min(2, "El título debe tener al menos 2 caracteres.")
    .max(200, "El título no puede superar 200 caracteres."),
  teacherId: yup.string().required("Debes seleccionar un profesor."),
  level: yup.string().oneOf(["0", "1", "2", "3"], "Nivel no válido."),
  description: yup
    .string()
    .max(1000, "La descripción no puede superar 1000 caracteres."),
});

export const classFormSchema = yup.object({
  courseId: yup.string().required("Debes seleccionar un curso."),
  title: yup.string().trim().required("El título es obligatorio."),
  content: yup.string().trim().required("El contenido es obligatorio."),
  startTime: yup.string(),
  // "HH:MM" strings compare correctly as text.
  endTime: yup
    .string()
    .test(
      "after-start",
      "La hora de fin debe ser posterior a la de inicio.",
      (endTime, context) => {
        const startTime: string | undefined = context.parent.startTime;
        return !endTime || !startTime || endTime > startTime;
      },
    ),
});
