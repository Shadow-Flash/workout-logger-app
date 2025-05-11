import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../functions/addOrUpdateRepAndSet";
import { userWorkoutSchema } from "../schemas/userWokoutSchema";
import { addWorkoutLog } from "../utils/dbService";
import { logger } from "../utils/logger";

jest.mock("../utils/dbService", () => ({
  addWorkoutLog: jest.fn(),
}));

jest.mock("../utils/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock("../schemas/userWokoutSchema", () => ({
  userWorkoutSchema: {
    safeParse: jest.fn(),
  },
}));

describe("addOrUpdateRepAndSet lambda handler", () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create a mock event
  interface WorkoutBody {
    date?: string;
    workoutPlan?: Array<{
      exerciseId: string;
      sets: Array<{ reps: number; weight: number }>;
    }>;
  }

  const createMockEvent = (
    body: WorkoutBody | null = null,
    pathParameters: { id?: string } | null = null
  ): Partial<APIGatewayProxyEvent> => ({
    body: body ? JSON.stringify(body) : null,
    pathParameters,
  });

  test("should return 404 when no body is provided", async () => {
    const mockEvent = createMockEvent() as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ message: "No body found !!" });
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
  });

  test("should return 200 with workout data when validation succeeds", async () => {
    // Mock input data
    const mockBody = {
      date: "2025-05-10",
      workoutPlan: [
        {
          exerciseId: "ex123",
          sets: [{ reps: 10, weight: 100 }],
        },
      ],
    };
    const mockPathParams = { id: "user123" };
    const mockEvent = createMockEvent(
      mockBody,
      mockPathParams
    ) as APIGatewayProxyEvent;

    // Mock successful validation
    const mockValidatedData = {
      id: "user123",
      date: "2025-05-10",
      workoutPlan: [
        {
          exerciseId: "ex123",
          sets: [{ reps: 10, weight: 100 }],
        },
      ],
    };
    (userWorkoutSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: mockValidatedData,
    });

    // Mock database response
    const mockDbResponse = {
      userId: "user123",
      date: "2025-05-10",
      workoutId: "workout123",
      exercises: [
        {
          exerciseId: "ex123",
          sets: [{ reps: 10, weight: 100 }],
        },
      ],
    };
    (addWorkoutLog as jest.Mock).mockResolvedValue(mockDbResponse);

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userWorkoutSchema.safeParse).toHaveBeenCalledWith({
      ...mockBody,
      ...mockPathParams,
    });
    expect(addWorkoutLog).toHaveBeenCalledWith({
      userId: mockValidatedData.id,
      date: mockValidatedData.date,
      workoutPlan: mockValidatedData.workoutPlan,
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: "Workout Updated!",
      data: mockDbResponse,
    });
  });

  test("should return 400 when validation fails", async () => {
    // Mock input data with intentionally invalid types for testing
    const mockBody = {
      date: "invalid-date",
      workoutPlan: "not-an-array",
    } as unknown as WorkoutBody;
    const mockPathParams = { id: "user123" };
    const mockEvent = createMockEvent(
      mockBody,
      mockPathParams
    ) as APIGatewayProxyEvent;

    // Mock validation failure
    (userWorkoutSchema.safeParse as jest.Mock).mockReturnValue({
      success: false,
      error: {
        errors: [
          { path: ["date"], message: "Invalid date format" },
          { path: ["workoutPlan"], message: "Expected array, received string" },
        ],
      },
    });

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(userWorkoutSchema.safeParse).toHaveBeenCalledWith({
      ...mockBody,
      ...mockPathParams,
    });
    expect(addWorkoutLog).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Validation failed!",
      errors: [
        { date: "Invalid date format" },
        { workoutPlan: "Expected array, received string" },
      ],
    });
  });

  test("should return 400 when JSON parsing fails", async () => {
    // Create an event with invalid JSON
    const mockEvent = {
      body: "{ invalid json",
      pathParameters: { id: "user123" },
    } as unknown as APIGatewayProxyEvent;

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith(mockEvent);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty(
      "message",
      "Error while updating the workout plan"
    );
    expect(JSON.parse(result.body)).toHaveProperty("error");
  });

  test("should return 500 for unknown errors", async () => {
    // Mock input data
    const mockEvent = createMockEvent(
      { date: "2025-05-10" },
      { id: "user123" }
    ) as APIGatewayProxyEvent;

    // Mock validation success but DB operation throws non-Error object
    (userWorkoutSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: { id: "user123", date: "2025-05-10", workoutPlan: [] },
    });
    (addWorkoutLog as jest.Mock).mockRejectedValue("Unknown error type");

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
    });
  });

  test("should handle Error instances specifically", async () => {
    // Mock input data
    const mockEvent = createMockEvent(
      { date: "2025-05-10" },
      { id: "user123" }
    ) as APIGatewayProxyEvent;

    // Mock validation success but DB operation throws an Error
    (userWorkoutSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: { id: "user123", date: "2025-05-10", workoutPlan: [] },
    });
    (addWorkoutLog as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    // Execute handler
    const result = await handler(mockEvent);

    // Assertions
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Error while updating the workout plan",
      error: "Database connection failed",
    });
  });
});
