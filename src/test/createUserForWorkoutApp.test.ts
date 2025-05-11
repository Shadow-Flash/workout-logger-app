import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../functions/createUserForWorkoutApp";
import * as dbService from "../utils/dbService";

// Mock the dependencies
jest.mock("../utils/dbService");

describe("createUserForWorkoutApp Lambda", () => {
  const mockCreateUserData = dbService.createUserData as jest.MockedFunction<
    typeof dbService.createUserData
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUserData.mockReset();
  });

  test("should return 404 when no body is provided", async () => {
    // Create a mock event without a body
    const mockEvent = {
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      message: "No body found !!",
    });
  });

  test("should successfully create a user with valid data", async () => {
    mockCreateUserData.mockResolvedValue({
      uId: "test123",
      $metadata: {
        attempts: 1,
      },
    });

    const mockEvent = {
      body: JSON.stringify({
        fullName: "John Doe",
        gender: "M",
        dob: "1990-01-01",
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: "User created successfully!",
      userId: "test123",
    });
    expect(mockCreateUserData).toHaveBeenCalledWith({
      fullName: "John Doe",
      gender: "M",
      dob: "1990-01-01",
    });
  });

  test("should return validation error for invalid user data", async () => {
    const mockEvent = {
      body: JSON.stringify({
        fullName: "Jo", // Too short
        gender: "X", // Invalid enum value
        dob: "not-a-date",
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toBe("Validation failed!");
    expect(body.errors).toBeDefined();
    expect(mockCreateUserData).not.toHaveBeenCalled();
  });

  test("should handle database errors gracefully", async () => {
    mockCreateUserData.mockRejectedValue(
      new Error("Database connection error")
    );

    const mockEvent = {
      body: JSON.stringify({
        fullName: "John Doe",
        gender: "M",
        dob: "1990-01-01",
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Error while creating a new user",
      error: "Database connection error",
    });
  });

  test("should handle JSON parse errors", async () => {
    const mockEvent = {
      body: "not-valid-json",
    } as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      "Error while creating a new user"
    );
    expect(JSON.parse(result.body).error).toContain("Unexpected token");
  });

  test("should handle unknown errors with 500 status code", async () => {
    mockCreateUserData.mockImplementation(() => {
      throw "Something went wrong";
    });

    const mockEvent = {
      body: JSON.stringify({
        fullName: "John Doe",
        gender: "M",
        dob: "1990-01-01",
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
    });
  });
});
