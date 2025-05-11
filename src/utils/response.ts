export const response = (statusCode: number, body: object) => ({
  statusCode,
  body: JSON.stringify(body),
});
