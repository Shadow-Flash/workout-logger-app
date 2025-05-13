# Workout Logger API

A serverless Node.js CRUD API for logging and tracking workouts, built with AWS Lambda, API Gateway, and DynamoDB using the Serverless Framework.

## Prerequisites

- Node.js (v20.x)
- AWS CLI configured with appropriate credentials
- Serverless Framework CLI
- npm package manager (10.9.2)

## Project Setup

1. Clone the repository
2. You can choose either of one 2.1 or 2.2, The script mentioned in point 2.2 is for easier deployment.
   Change region before you proceed further in package.json
   
   2.1. Install dependencies:

    ```bash
    # Install project dependencies
    npm install

    # Install serverless framework globally (if not already installed)
    npm install -g serverless

    # Once your aws credentials are in place, run:
    npm run deploy
    ```
   2.2. Just run the script:

    ```bash
    # Before running the script put AWS credentials in .env file:
    bash init-deploy.sh
    ```

## Project Structure

```
├── config/               # Serverless configuration files
│   ├── functions.yml    # Lambda functions configuration
│   ├── layers.yml       # Lambda layers configuration
│   ├── plugins.yml      # Serverless plugins
│   ├── provider.yml     # AWS provider configuration
│   └── resources.yml    # AWS resources (DynamoDB, IAM roles)
├── layer/               # Lambda layer containing shared dependencies
├── src/
│   ├── functions/       # Lambda function handlers
│   ├── schemas/         # Zod validation schemas
│   ├── test/           # Test files
│   └── utils/          # Shared utilities
└── serverless.yml      # Main serverless configuration
```

## Development
Once project is deployed on your aws account you can:
1. directly deploy using 
```bash
npm run validate && npm run deploy:dev
```

2. use github action (CI/CD pipeline) to deploy on main branch as stage dev and production branch as stage prod
You can pass your aws cedential secrets from github secrets. Below are the keys that needs to be stored in secrets
```bash
  STAGE
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  
```

### Testing

The project uses Jest for testing. To run tests:

```bash
npm test          # Run all tests
npm test -- --coverage  # Run tests with coverage report
```

## API Endpoints

The API provides the following endpoints:

### User Management
- **POST /user**
  - Create a new user
  - Body: 
  ```bash
   { "fullName": string, "gender": "M"|"F"|"O", "dob": "YYYY-MM-DD" }
  ```
  - Response:
  ```bash
   {message: User created successfully!!, userId: string}
   ```

### Workout Management
- **GET /{id}/{date}**
  - Get workout details for a specific date
  - Parameters:
    - id: `userId`
    - date: `YYYY-MM-DD` Workout Date
  - Response: 
  ```bash
  { userId: string, "workoutPlan": { "exerciseName": { "sets": number, "reps": number, "weight": number, metric: "KGS"|"LBS"|"BODYWEIGHT" }}}
  ```

- **PUT /{id}/{date}**
  - Add or update workout details
  - Parameters:
    - id: `userId`
    - date: `YYYY-MM-DD` Workout Date
  - Body: 
  ```bash
  {"workoutPlan": { "exerciseName": { "sets": number, "reps": number, "weight": number, metric: "KGS"|"LBS"|"BODYWEIGHT" }}}
  ```
  - Response: 
  ```bash
  { message: Workout Updated !!, data: {"WorkoutPlan": { "exerciseName": { "sets": number, "reps": number, "weight": number, metric: "KGS"|"LBS"|"BODYWEIGHT" }}}}
  ```

- **DELETE /{id}/{date}**
  - Delete a specific workout
  - Parameters:
    - id: `userId`
    - date: `YYYY-MM-DD` Workout Date
  - Response: 
  ```bash
  {"message":"Workout data deleted successfully!"}
  ```

- **DELETE /{id}**
  - Delete all workout and user itself
  - Parameters:
    - id: `userId`
  - Response: 
  ```bash
  {"message":"User data deleted successfully!"}
  ```


## Deployment

Deploy to AWS:

```bash
npm run deploy:dev    # Deploy to dev stage
npm run deploy:prod    # Deploy to prod stage
```
After successful deployment, you'll receive the API endpoint URLs.

### Environment Configuration

The application uses the following environment variables:
- TABLE_NAME: DynamoDB table name (auto-configured during deployment)
- REGION: AWS region (configured in provider.yml)

## Database Schema

The application uses DynamoDB with the following schema:

### Workout Log Table
- Primary Key: UserId (String)
- Sort Key: Date (String)
- Attributes:
  - WorkoutPlan: Object of exercise records
  - DateOfBirth: YYYY-MM-DD string
  - FullName: string
  - Gender: string

## Security

- API endpoints are public by default. For production, implement an authorizer
- IAM roles are configured per function with least privilege access
- DynamoDB table uses on-demand capacity mode
- While deploying please make sure you have these services roles as well:
  - cloudformation
  - lambda
  - cloudwatch
  - dynamodb
  - s3
  - api gateway

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

