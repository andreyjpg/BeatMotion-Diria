import type { SurveyQuestionInput } from "@/hooks/surveys/surveySchema";

type SurveyTemplate = {
  title: string;
  description: string;
  questions: SurveyQuestionInput[];
};

/** Ready-made surveys the admin can start from (create screen). */
export const quickSurveyTemplate = {
  satisfactionBasic: {
    title: "Encuesta de Satisfacción Básica",
    description: "Ayúdanos a mejorar tu experiencia en el curso",
    questions: [
      {
        questionText: "¿Qué tan satisfecho estás con el curso en general?",
        questionType: "rating",
        required: true,
      },
      {
        questionText: "¿Recomendarías este curso a otros?",
        questionType: "multiple_choice",
        required: true,
        options: [
          "Definitivamente sí",
          "Probablemente sí",
          "No estoy seguro",
          "Probablemente no",
          "Definitivamente no",
        ],
      },
      {
        questionText: "¿Qué podemos mejorar?",
        questionType: "text",
        required: false,
      },
    ],
  },
  instructorEvaluation: {
    title: "Evaluación del Instructor",
    description: "Tu opinión nos ayuda a mejorar la calidad de enseñanza",
    questions: [
      { questionText: "Calidad de la enseñanza", questionType: "rating", required: true },
      { questionText: "Claridad en las explicaciones", questionType: "rating", required: true },
      { questionText: "Disponibilidad para resolver dudas", questionType: "rating", required: true },
      { questionText: "Comentarios adicionales", questionType: "text", required: false },
    ],
  },
  courseContent: {
    title: "Evaluación del Contenido",
    description: "Cuéntanos sobre el material y contenido del curso",
    questions: [
      {
        questionText: "El contenido cumplió con tus expectativas",
        questionType: "rating",
        required: true,
      },
      {
        questionText: "Nivel de dificultad del contenido",
        questionType: "multiple_choice",
        required: true,
        options: ["Muy fácil", "Fácil", "Adecuado", "Difícil", "Muy difícil"],
      },
      {
        questionText: "¿Qué tema te gustó más?",
        questionType: "text",
        required: false,
      },
    ],
  },
} satisfies Record<string, SurveyTemplate>;
