import { z } from "zod";

export const userSchema = z.object({
  fullName: z.string().min(3),
  gender: z.enum(["M", "F", "O"]),
  dob: z.string().date(),
});

export type UserInput = z.infer<typeof userSchema>;
