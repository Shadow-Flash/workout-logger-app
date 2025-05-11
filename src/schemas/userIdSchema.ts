import { z } from "zod";

export const userIdSchema = z.object({
  id: z.string().length(8),
});

export type UserIdInput = z.infer<typeof userIdSchema>;
