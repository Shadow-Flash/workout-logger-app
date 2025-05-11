import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../functions/getWorkoutList";
import { userPkSchema } from "../schemas/userPkSchema";
import { getWorkoutList } from "../utils/dbService";
import { logger } from "../utils/logger";

// Mock dependencies
jest.mock("../utils/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock("../utils/dbService", () => ({
  getWorkoutList: jest.fn(),
}));

jest.mock("../schemas/userPkSchema", () => ({
  userPkSchema: {
    safeParse: jest.fn(),
  },
}));

describe("getWorkoutList lambda handler", () => {
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

  test("should return 200 with workout data when successfully retrieved", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123", date: "2025-05-10" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userPkSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock database response
    const mockDbResponse = {
      userId: "user123",
      workoutPlan: [
        {
          exerciseId: "ex123",
          sets: [{ reps: 10, weight: 100 }],
        },
      ],
    };
    (getWorkoutList as jest.Mock).mockResolvedValue(mockDbResponse);

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userPkSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(getWorkoutList).toHaveBeenCalledWith("user123", "2025-05-10");
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      userId: "user123",
      workoutPlan: [
        {
          exerciseId: "ex123",
          sets: [{ reps: 10, weight: 100 }],
        },
      ],
    });
  });

  test("should handle null response from database", async () => {
    // Mock path parameters
    const mockPathParams = { id: "user123", date: "2025-05-10" };
    const mockEvent = createMockEvent(mockPathParams) as APIGatewayProxyEvent;

    // Mock successful validation
    (userPkSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockPathParams,
    });

    // Mock null database response (e.g., no workout found)
    (getWorkoutList as jest.Mock).mockResolvedValue(null);

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userPkSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(getWorkoutList).toHaveBeenCalledWith("user123", "2025-05-10");
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      userId: undefined,
      workoutPlan: undefined,
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
    expect(getWorkoutList).not.toHaveBeenCalled();
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
    (getWorkoutList as jest.Mock).mockRejectedValue(new Error(errorMessage));

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userPkSchema.safeParse).toHaveBeenCalledWith(mockPathParams);
    expect(getWorkoutList).toHaveBeenCalledWith("user123", "2025-05-10");
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Error while getting list of workout",
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
    (getWorkoutList as jest.Mock).mockRejectedValue("Unknown error type");

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
    });
  });
});
