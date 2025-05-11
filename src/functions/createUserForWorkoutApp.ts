import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { userSchema } from "../schemas/userSchema";
import { response } from "../utils/response";
import { logger } from "../utils/logger";
import { createUserData } from "../utils/dbService";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info(event);
  if (!event.body) return response(404, { message: "No body found !!" });

  try {
    const body = JSON.parse(event.body);
    const userData = userSchema.safeParse(body);

    if (userData.success) {
      const data = await createUserData(userData.data);
      return response(200, {
        message: "User created successfully!",
        userId: data.uId,
      });
    } else {
      const formattedErrors = userData.error.errors.map((err) => ({
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
        message: "Error while creating a new user",
        error: error.message,
      });
    }

    return response(500, { message: "Internal server error" });
  }
};
