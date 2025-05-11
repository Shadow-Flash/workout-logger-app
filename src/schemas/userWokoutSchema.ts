import { z } from "zod";

export const userWorkoutSchema = z.object({
  id: z.string().length(8),
  date: z.string().date(),
  workoutPlan: z.record(
    z.string().min(3),
    z.object({
      weight: z.number().gt(0),
      reps: z.number().gt(0),
      sets: z.number().gt(0),
      metric: z.enum(["KGS", "LBS", "BODYWEIGHT"]),
    })
  ),
});

export type UserWorkoutInput = z.infer<typeof userWorkoutSchema>;
