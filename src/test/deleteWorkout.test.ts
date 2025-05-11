import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../functions/deleteWorkout";
import { userPkSchema } from "../schemas/userPkSchema";
import { deleteWorkoutData } from "../utils/dbService";
import { logger } from "../utils/logger";

// Mock dependencies
jest.mock("../utils/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock("../utils/dbService", () => ({
  deleteWorkoutData: jest.fn(),
}));

jest.mock("../schemas/userPkSchema", () => ({
  userPkSchema: {
    safeParse: jest.fn(),
  },
}));

describe("deleteWorkout lambda handler", () => {
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

  test("should return 200 when workout is successfully deleted", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123", date: "2025-05-10" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userPkSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock successful database operation
    (deleteWorkoutData as jest.Mock).mockResolvedValue(undefined);

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userPkSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(deleteWorkoutData).toHaveBeenCalledWith("user123", "2025-05-10");
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: "Workout data deleted successfully!",
    });
  });

  test("should return 400 when validation fails", async () => {
    // Mock path parameters with invalid data
    const mockPathParams = { id: "user123", date: "invalid-date" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock validation failure
    (userPkSchema.safeParse as jest.Mock).mockReturnValue({
      success: false,
      error: {
        errors: [{ path: ["date"], message: "Invalid date format" }],
      },
    });

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userPkSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(deleteWorkoutData).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Validation failed!",
      errors: [{ date: "Invalid date format" }],
    });
  });

  test("should handle Error instances specifically", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123", date: "2025-05-10" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userPkSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock database operation that throws an Error
    const errorMessage = "Database connection failed";
    (deleteWorkoutData as jest.Mock).mockRejectedValue(new Error(errorMessage));

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userPkSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(deleteWorkoutData).toHaveBeenCalledWith("user123", "2025-05-10");
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Error while deleting a workout",
      error: errorMessage,
    });
  });

  test("should return 500 for unknown errors", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123", date: "2025-05-10" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userPkSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock database operation that throws a non-Error object
    (deleteWorkoutData as jest.Mock).mockRejectedValue("Unknown error type");

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
    });
  });
});
