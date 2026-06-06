const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

module.exports = {
  docClient,
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
};
