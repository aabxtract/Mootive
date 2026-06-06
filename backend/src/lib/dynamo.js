const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

async function getItem(table, key) {
  const res = await docClient.send(new GetCommand({ TableName: table, Key: key }));
  return res.Item || null;
}

async function putItem(table, item) {
  await docClient.send(new PutCommand({ TableName: table, Item: item }));
  return item;
}

async function query(table, params) {
  const res = await docClient.send(new QueryCommand({ TableName: table, ...params }));
  return res.Items || [];
}

async function scan(table, params = {}) {
  const res = await docClient.send(new ScanCommand({ TableName: table, ...params }));
  return res.Items || [];
}

module.exports = {
  docClient,
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  getItem,
  putItem,
  query,
  scan,
};
