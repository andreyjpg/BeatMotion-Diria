import zod from "zod";
import { dateTimeSchema } from "../enrollment/schema";

/**
 * public.surveys columns renamed to the fields the app uses, with the course
 * title and the questions (public.survey_questions; `order` is the position).
 */
export const SURVEY_COLUMNS =
  "id, courseId:course_id, title, description, isActive:is_active, expiresAt:expires_at, createdBy:created_by, isDeleted:is_deleted, createdAt:created_at, updatedAt:updated_at, course:courses(title), questions:survey_questions(id, order:position, questionText:question_text, questionType:question_type, required, options)";

/** A student's response with their name and answers, for the results screen. */
export const SURVEY_RESPONSE_COLUMNS =
  "id, surveyId:survey_id, userId:user_id, completionTimeSeconds:completion_time_seconds, submittedAt:submitted_at, user:profiles!survey_responses_user_id_fkey(name, lastName:last_name), answers:survey_answers(questionId:question_id, rating, textValue:text_value)";

/** Database row -> screen shape: course name and questions in display order. */
export function toSurvey<
  T extends { course: { title: string } | null; questions: { order: number }[] },
>(row: T) {
  const { course, ...survey } = row;
  return {
    ...survey,
    courseName: course?.title ?? null,
    questions: [...row.questions].sort((a, b) => a.order - b.order),
  };
}

/** Database row -> screen shape: the student's name. */
export function toSurveyResponse<T extends { user: { name: string; lastName: string } | null }>(
  row: T,
) {
  const { user, ...response } = row;
  return { ...response, userName: user ? `${user.name} ${user.lastName}`.trim() : "" };
}

export const questionTypeSchema = zod.enum(["rating", "multiple_choice", "text"]);

export type QuestionType = zod.infer<typeof questionTypeSchema>;

export const surveyQuestionSchema = zod.object({
  id: zod.string(),
  questionText: zod.string(),
  questionType: questionTypeSchema,
  required: zod.boolean(),
  options: zod.array(zod.string()).nullable(),
  order: zod.number().int().min(0),
});

export type SurveyQuestion = zod.infer<typeof surveyQuestionSchema>;

export const surveySchema = zod.object({
  id: zod.string(),
  title: zod.string(),
  description: zod.string().nullable(),
  courseId: zod.string(),
  courseName: zod.string().nullable(),
  isActive: zod.boolean(),
  questions: zod.array(surveyQuestionSchema),
  createdBy: zod.string().nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  expiresAt: dateTimeSchema.nullable(),
  isDeleted: zod.boolean(),
});

export type Survey = zod.infer<typeof surveySchema>;

export const surveyListSchema = zod.array(surveySchema);

export const surveyResponseSchema = zod.object({
  id: zod.string(),
  surveyId: zod.string(),
  userId: zod.string(),
  userName: zod.string(),
  completionTimeSeconds: zod.number().nullable(),
  submittedAt: dateTimeSchema,
  answers: zod.array(
    zod.object({
      questionId: zod.string(),
      rating: zod.number().nullable(),
      textValue: zod.string().nullable(),
    }),
  ),
});

export type SurveyResponse = zod.infer<typeof surveyResponseSchema>;

export const surveyResponseListSchema = zod.array(surveyResponseSchema);

/** A question in the editor: `id` is set for questions already saved. */
export type SurveyQuestionInput = {
  id?: string;
  questionText: string;
  questionType: QuestionType;
  required: boolean;
  options?: string[];
};

/** What the survey editor saves (useCreateSurvey / useUpdateSurvey). */
export type SurveyInput = {
  courseId: string;
  title: string;
  description: string;
  expiresAt: Date | null;
  questions: SurveyQuestionInput[];
};

/** SurveyInput -> save_survey arguments. */
export const toSaveSurveyArgs = (input: SurveyInput) => ({
  p_course_id: input.courseId,
  p_title: input.title,
  p_description: input.description.trim() || undefined,
  p_expires_at: input.expiresAt?.toISOString(),
  p_questions: input.questions.map((question) => ({
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    required: question.required,
    options: question.questionType === "multiple_choice" ? question.options : undefined,
  })),
});

/** Errors raised by submit_survey_response, as shown to the student. */
export const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  SURVEY_CLOSED: "Esta encuesta ya no está disponible.",
  NOT_ENROLLED: "Esta encuesta es solo para los estudiantes del curso.",
  MISSING_ANSWERS: "Responde todas las preguntas obligatorias.",
  INVALID_ANSWER: "Alguna respuesta no es válida. Revisa tus respuestas.",
};
