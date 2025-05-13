import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { userIdSchema } from "../schemas/userIdSchema";
import { response } from "../utils/response";
import { logger } from "../utils/logger";
import { deleteUserData } from "../utils/dbService";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info(event);
  if (!event.pathParameters)
    return response(404, { message: "No path param found !!" });

  try {
    const pathParam = event.pathParameters;
    const userId = userIdSchema.safeParse(pathParam);

    if (userId.success) {
      await deleteUserData(userId.data.id);
      return response(200, {
        message: "User data deleted successfully!",
      });
    } else {
      const formattedErrors = {
        [userId.error.issues[0].path.join(".")]: userId.error.issues[0].message,
      };
      return response(400, {
        message: "Validation failed!",
        errors: formattedErrors,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return response(400, {
        message: "Error while deleting a user",
        error: error.message,
      });
    }

    return response(500, { message: "Internal server error" });
  }
};
