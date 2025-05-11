import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../functions/deleteAllWorkouts";
import { userIdSchema } from "../schemas/userIdSchema";
import { deleteUserData } from "../utils/dbService";
import { logger } from "../utils/logger";

// Mock dependencies
jest.mock("../utils/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock("../utils/dbService", () => ({
  deleteUserData: jest.fn(),
}));

jest.mock("../schemas/userIdSchema", () => ({
  userIdSchema: {
    safeParse: jest.fn(),
  },
}));

describe("deleteAllWorkouts lambda handler", () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create a mock event
  const createMockEvent = (
    pathParameters: { id?: string } | null = null
  ): Partial<APIGatewayProxyEvent> => ({
    pathParameters,
  });

  test("should return 404 when no path parameters are provided", async () => {
    const mockEvent = createMockEvent() as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      message: "No path param found !!",
    });
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
  });

  test("should return 200 when user data is successfully deleted", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userIdSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock successful database operation
    (deleteUserData as jest.Mock).mockResolvedValue(undefined);

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userIdSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(deleteUserData).toHaveBeenCalledWith("user123");
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: "User data deleted successfully!",
    });
  });

  test("should return 400 when validation fails", async () => {
    // Mock path parameters with invalid data
    const mockPathParams = { id: "" }; // Assuming empty ID is invalid
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock validation failure
    (userIdSchema.safeParse as jest.Mock).mockReturnValue({
      success: false,
      error: {
        issues: [{ path: ["id"], message: "ID cannot be empty" }],
      },
    });

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userIdSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(deleteUserData).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Validation failed!",
      errors: { id: "ID cannot be empty" },
    });
  });

  test("should handle Error instances specifically", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userIdSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock database operation that throws an Error
    const errorMessage = "Database connection failed";
    (deleteUserData as jest.Mock).mockRejectedValue(new Error(errorMessage));

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userIdSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(deleteUserData).toHaveBeenCalledWith("user123");
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Error while deleting a user",
      error: errorMessage,
    });
  });

  test("should return 500 for unknown errors", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userIdSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock database operation that throws a non-Error object
    (deleteUserData as jest.Mock).mockRejectedValue("Unknown error type");

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
    });
  });
});
