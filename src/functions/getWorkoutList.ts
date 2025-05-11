import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { userPkSchema } from "../schemas/userPkSchema";
import { response } from "../utils/response";
import { logger } from "../utils/logger";
import { getWorkoutList } from "../utils/dbService";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info(event);
  if (!event.pathParameters)
    return response(404, { message: "No path param found !!" });

  try {
    const pathParams = event.pathParameters;
    const userPkData = userPkSchema.safeParse(pathParams);

    if (userPkData.success) {
      const data = await getWorkoutList(
        userPkData.data.id,
        userPkData.data.date
      );
      return response(200, {
        userId: data?.userId,
        workoutPlan: data?.workoutPlan,
      });
    } else {
      const formattedErrors = userPkData.error.errors.map((err) => ({
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
        message: "Error while getting list of workout",
        error: error.message,
      });
    }

    return response(500, { message: "Internal server error" });
  }
};
