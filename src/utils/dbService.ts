import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  QueryCommand,
  PutItemCommandOutput,
  PutItemCommandInput,
  UpdateItemCommandInput,
  UpdateItemCommandOutput,
  GetItemCommandInput,
  QueryCommandInput,
  DeleteItemCommandInput,
  DeleteItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { nanoid } from "nanoid";
import { logger } from "./logger";
import { UserDataItem, WorkoutPlanItem, WorkoutLogItem } from "./types";
import sampleExerciseData from "../data/exercise.json";

// Initialize the DynamoDB client
const client = new DynamoDBClient({ region: process.env.REGION });
const tableName = process.env.TABLE_NAME;

const getFormattedDate = () => new Date().toISOString().split("T")[0];
/**
 * Create a new user to the DynamoDB table
 * @param userData The user data item to add to the table
 * @returns The response from DynamoDB
 */
export async function createUserData(
  userData: UserDataItem
): Promise<PutItemCommandOutput & { uId: string }> {
  const uId = nanoid(8);
  const params: PutItemCommandInput = {
    TableName: tableName,
    Item: marshall({
      UserId: uId,
      Date: getFormattedDate(),
      DateOfBirth: userData.dob,
      FullName: userData.fullName,
      Gender: userData.gender,
      WorkoutPlan: sampleExerciseData,
    }),
  };

  try {
    const data = await client.send(new PutItemCommand(params));
    return { ...data, uId };
  } catch (error) {
    logger.error({ message: "Error creating new user to DynamoDB:", error });
    throw new Error(error as string);
  }
}

/**
 * Add a new workout log to the DynamoDB table
 * @param workoutLog The workout log item to add to the table
 * @returns The response from DynamoDB
 */
export async function addWorkoutLog(
  data: WorkoutPlanItem
): Promise<UpdateItemCommandOutput["Attributes"]> {
  const params: UpdateItemCommandInput = {
    TableName: tableName,
    Key: marshall({
      UserId: data.userId,
      Date: data.date,
    }),
    ExpressionAttributeNames: {
      "#WP": "WorkoutPlan",
    },
    ExpressionAttributeValues: marshall({
      ":wp": data.workoutPlan,
    }),
    UpdateExpression: `
      SET #WP = :wp 
    `,
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const data = await client.send(new UpdateItemCommand(params));
    if (!data.Attributes) {
      throw new Error("No attributes returned from update operation");
    }
    return unmarshall(data.Attributes);
  } catch (error) {
    logger.error({ message: "Error adding workout log to DynamoDB:", error });
    throw new Error(error as string);
  }
}

/**
 * Get a workout log from the DynamoDB table by primary key
 * @param userId The user ID
 * @param date The date of the workout log
 * @returns The workout log from the table, or null if not found
 */
export async function getWorkoutList(
  userId: string,
  date: string
): Promise<WorkoutLogItem | null> {
  const params: GetItemCommandInput = {
    TableName: tableName,
    Key: marshall({
      UserId: userId,
      Date: date,
    }),
    ProjectionExpression: "WorkoutPlan",
  };

  try {
    const { Item } = await client.send(new GetItemCommand(params));
    if (!Item) {
      logger.error({ message: "No Data Present !!" });
      throw new Error("No Data Present !!");
    }
    const data: WorkoutLogItem = {
      workoutPlan: unmarshall(Item).WorkoutPlan,
      userId,
    };
    return data;
  } catch (error) {
    logger.error({
      message: "Error getting workout log from DynamoDB:",
      error,
    });
    throw new Error(error as string);
  }
}

/**
 * Delete all user data from the DynamoDB table by partition key
 * @param userId The user ID
 * @returns The response from DynamoDB
 */
export async function deleteUserData(userId: string) {
  const params: QueryCommandInput = {
    TableName: tableName,
    ExpressionAttributeValues: marshall({
      ":userId": userId,
    }),
    KeyConditionExpression: `UserId = :userId`,
  };

  try {
    const queryResult = await client.send(new QueryCommand(params));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info({ message: "No user found to delete." });
      throw new Error(`User with UserId: ${userId} not Found!!`);
    }

    const deletePromises: Array<Promise<DeleteItemCommandOutput | object>> =
      queryResult.Items.map((item) => {
        const dateSk = item.Date.S;
        if (!dateSk)
          return Promise.resolve({
            status: "skipped",
            reason: "Missing Date Sort Key",
          });

        const deleteParam: DeleteItemCommandInput = {
          TableName: tableName,
          Key: marshall({
            UserId: userId,
            Date: dateSk,
          }),
        };

        return client.send(new DeleteItemCommand(deleteParam));
      });

    const results = await Promise.allSettled(deletePromises);

    results.forEach((result, index) => {
      const item = queryResult.Items?.[index];
      const unmarshalledItem = item ? unmarshall(item) : undefined;
      const skDate: string = unmarshalledItem?.Date ?? "unknown";
      if (result.status === "fulfilled") {
        logger.info({ message: `Deleted record with date: ${skDate}` });
      } else {
        logger.error({
          message: `Failed to delete record with date ${skDate}`,
          error: result.reason,
        });
      }
    });

    logger.info({
      message: `Delete operation completed for userID: ${userId}.`,
    });
  } catch (error) {
    throw new Error(error as string);
  }
}

/**
 * Delete workout data from the DynamoDB table using primary key
 * @param userId The user ID
 * @param date The date
 * @returns The response from DynamoDB
 */
export async function deleteWorkoutData(userId: string, date: string) {
  const deleteParam: DeleteItemCommandInput = {
    TableName: tableName,
    Key: marshall({
      UserId: userId,
      Date: date,
    }),
  };
  try {
    return client.send(new DeleteItemCommand(deleteParam));
  } catch (error) {
    throw new Error(error as string);
  }
}
