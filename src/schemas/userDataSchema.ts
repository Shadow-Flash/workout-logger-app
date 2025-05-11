import { z } from "zod";

export const userDataSchema = z.object({
  fullName: z.string().min(3),
  gender: z.enum(["M", "F", "O"]),
  dob: z.string().date(),
});

export type UserDataInput = z.infer<typeof userDataSchema>;
