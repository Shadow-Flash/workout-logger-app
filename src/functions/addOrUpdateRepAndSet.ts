import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { userWorkoutSchema } from "../schemas/userWokoutSchema";
import { response } from "../utils/response";
import { logger } from "../utils/logger";
import { addWorkoutLog } from "../utils/dbService";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info(event);
  if (!event.body) return response(404, { message: "No body found !!" });

  try {
    const body = JSON.parse(event.body);
    const pathParam = event.pathParameters;
    const userWorkoutData = userWorkoutSchema.safeParse({
      ...body,
      ...pathParam,
    });

    if (userWorkoutData.success) {
      const data = await addWorkoutLog({
        userId: userWorkoutData.data.id,
        date: userWorkoutData.data.date,
        workoutPlan: userWorkoutData.data.workoutPlan,
      });
      return response(200, {
        message: "Workout Updated!",
        data,
      });
    } else {
      const formattedErrors = userWorkoutData.error.errors.map((err) => ({
        [err.path.join(".")]: err.message,
      }));
      return response(400, {
        message: "Validation failed!",
        errors: formattedErrors,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return response(400, {
        message: "Error while updating the workout plan",
        error: error.message,
      });
    }

    return response(500, { message: "Internal server error" });
  }
};
