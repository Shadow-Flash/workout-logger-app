import { z } from "zod";

export const userPkSchema = z.object({
  id: z.string().length(8),
  date: z.string().date(),
});

export type UserInput = z.infer<typeof userPkSchema>;
