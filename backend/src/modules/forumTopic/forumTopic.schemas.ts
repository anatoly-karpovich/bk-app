import { z } from "zod";

export const forumTopicQuerySchema = z.object({
  topicId: z.string().trim().min(1),
});
