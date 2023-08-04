import {APIGatewayProxyEvent, APIGatewayProxyResult, S3Event} from "aws-lambda";
import AWS from "aws-sdk";
import { v4 } from "uuid";
import * as yup from "yup";
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = "ReviewsTable";
const headers = {
  "content-type": "application/json",
};

const schema = yup.object().shape({
  seId: yup.string().required(),
  tyId: yup.string().required(),
  tyReview: yup.string().notRequired()
});

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const fetchMappings = async (event: S3Event): Promise<string | undefined> => {
  // Get the object from the event and show its content type
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    const { ContentType } = await s3.send(new HeadObjectCommand(params));
    console.log('CONTENT TYPE:', ContentType);
    return ContentType;
  } catch (err) {
    console.log(err);
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
    console.log(message);
    throw new Error(message);
  }
};

export const createReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const reqBody = JSON.parse(event.body as string);

    await schema.validate(reqBody, { abortEarly: false });

    const review = {
      ...reqBody,
      reviewId: v4(),
    };

    await docClient
      .put({
        TableName: tableName,
        Item: review,
      })
      .promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(review),
    };
  } catch (e) {
    return handleError(e);
  }
};

class HttpError extends Error {
  constructor(public statusCode: number, body: Record<string, unknown> = {}) {
    super(JSON.stringify(body));
  }
}

const fetchReviewById = async (id: string) => {
  const output = await docClient
    .get({
      TableName: tableName,
      Key: {
        reviewId: id,
      },
    })
    .promise();

  if (!output.Item) {
    throw new HttpError(404, { error: "not found" });
  }

  return output.Item;
};

const handleError = (e: unknown) => {
  if (e instanceof yup.ValidationError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        errors: e.errors,
      }),
    };
  }

  if (e instanceof SyntaxError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `invalid request body format : "${e.message}"` }),
    };
  }

  if (e instanceof HttpError) {
    return {
      statusCode: e.statusCode,
      headers,
      body: e.message,
    };
  }

  throw e;
};

export const getReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const review = await fetchReviewById(event.pathParameters?.id as string);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(review),
    };
  } catch (e) {
    return handleError(e);
  }
};

export const updateReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id as string;

    await fetchReviewById(id);

    const reqBody = JSON.parse(event.body as string);

    await schema.validate(reqBody, { abortEarly: false });

    const review = {
      ...reqBody,
      reviewId: id,
    };

    await docClient
      .put({
        TableName: tableName,
        Item: review,
      })
      .promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(review),
    };
  } catch (e) {
    return handleError(e);
  }
};

export const deleteReview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id as string;

    await fetchReviewById(id);

    await docClient
      .delete({
        TableName: tableName,
        Key: {
          reviewId: id,
        },
      })
      .promise();

    return {
      statusCode: 204,
      body: "",
    };
  } catch (e) {
    return handleError(e);
  }
};

export const listReviews = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const output = await docClient
    .scan({
      TableName: tableName,
    })
    .promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(output.Items),
  };
};
