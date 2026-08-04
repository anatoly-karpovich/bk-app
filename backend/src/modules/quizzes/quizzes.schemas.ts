import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

const resourceAmountSchema = z.object({ resourceId: z.string().trim().min(1).max(120), amount: z.number().finite().positive() });
const poolSchema = z.object({ mode: z.literal("all"), rewards: z.array(resourceAmountSchema).min(1) });
const regularRuleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all_accepted"), rewardPool: poolSchema }),
  z.object({ mode: z.literal("by_position"), positionRewards: z.array(z.object({ position: z.number().int().positive(), rewardPool: poolSchema })).min(1) }),
]);
const templateSchema = z.object({ template: z.string().max(10_000), variables: z.object({ emojiStart: z.string().max(200).optional(), emojiEnd: z.string().max(200).optional() }).default({}) });
const templatesSchema = z.object({ defaultTemplate: templateSchema, questionOverrides: z.array(z.object({ questionIndex: z.number().int().positive(), template: templateSchema })) });
const questionSchema = z.object({
  id: z.string().uuid(), questionIndex: z.number().int().positive(), title: z.string().max(500).nullable(), text: z.string().max(20_000),
  correctAnswer: z.string().max(20_000).nullable(), attachmentUrl: z.string().max(2_000).nullable(), notes: z.string().max(20_000).nullable(),
});
const createQuestionSchema = z.object({
  questionIndex: z.number().int().positive(),
  text: z.string().max(20_000),
  correctAnswer: z.string().max(20_000).nullable(),
  notes: z.string().max(20_000).nullable(),
});

export const projectIdParamsSchema = z.object({ projectId: objectIdSchema });
export const quizConfigParamsSchema = projectIdParamsSchema.extend({ configId: objectIdSchema });
export const quizParamsSchema = projectIdParamsSchema.extend({ quizId: objectIdSchema });
export const quizEventParamsSchema = projectIdParamsSchema.extend({ eventId: objectIdSchema });
export const quizEventQuestionParamsSchema = quizEventParamsSchema.extend({ questionId: z.string().uuid() });

export const saveQuizConfigSchema = z.object({
  name: z.string().max(160).default(""), description: z.string().max(2_000).default(""), questionCount: z.number().int().positive().nullable().default(null),
  defaultRegularRule: regularRuleSchema.nullable().default(null),
  regularRewardOverrides: z.array(z.object({ questionIndex: z.number().int().positive(), rule: regularRuleSchema })).default([]),
  bonusRules: z.array(z.object({ id: z.string().trim().min(1).max(160), questionIndex: z.number().int().positive(), position: z.number().int().positive(), rewardPool: poolSchema })).default([]),
  messageTemplates: templatesSchema.nullable().default(null), answerMessageTemplates: templatesSchema.nullable().default(null), isSystem: z.boolean().optional(),
});

export const createQuizSchema = z.object({
  configId: objectIdSchema,
  name: z.string().max(160).default(""),
  description: z.string().max(2_000).default(""),
  questions: z.array(createQuestionSchema),
});
export const updateQuizSchema = z.object({
  name: z.string().max(160), description: z.string().max(2_000), questions: z.array(questionSchema),
  effectiveMessageTemplates: templatesSchema, effectiveAnswerMessageTemplates: templatesSchema,
});

export const createQuizEventSchema = z.object({ name: z.string().max(160).optional() });
export const reorderQuizQuestionsSchema = z.object({ questionIds: z.array(z.string().uuid()) });
export const quizMessageSchema = z.object({ messageKind: z.enum(["question", "answer"]), text: z.string().max(30_000).nullable() });
export const quizMessageKindSchema = z.object({ messageKind: z.enum(["question", "answer"]) });
export const chatFragmentSchema = z.object({ mode: z.enum(["append", "replace"]), rawText: z.string().min(1).max(100_000), acceptedCanonicalKeys: z.array(z.string().min(1)).default([]) });
export const chatPreviewSchema = z.object({ rawText: z.string().min(1).max(100_000) });
export const answerStatusSchema = z.object({ answerId: z.string().uuid(), status: z.enum(["pending", "accepted", "rejected"]) });
export const bulkAnswerStatusSchema = z.object({ answerIds: z.array(z.string().uuid()).min(1), status: z.enum(["pending", "accepted", "rejected"]) });
