export interface WorkoutPlanItem {
  userId: string;
  workoutPlan: Record<string, Record<string, number | string>>;
  date: string;
}

export interface WorkoutLogItem {
  userId: string;
  workoutPlan: Record<string, Record<string, number | string>>;
}

export interface UserDataItem {
  fullName: string;
  gender: "M" | "F" | "O";
  dob: string;
}
