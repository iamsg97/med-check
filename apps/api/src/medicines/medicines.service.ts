import { HttpException, Injectable } from "@nestjs/common";

import {
  LambdaInvoker,
  type LambdaTarget,
  type ProxyEvent,
} from "../lambda/lambda-invoker";

const TARGET: LambdaTarget = "medicine-service";

export interface ForwardOptions {
  method: string;
  /** Lambda-side path, e.g. `/medicines` or `/medicines/:id` resolved. */
  path: string;
  userSub: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
  pathParameters?: Record<string, string>;
}

/**
 * Builds the APIGatewayProxyEvent for the medicine-service Lambda and unwraps
 * its result.
 *
 * The Lambda owns all business rules (validation, dedup, ULIDs, normalization);
 * this layer only translates between HTTP and the proxy-event contract and
 * re-raises the Lambda's status codes so clients see them unchanged.
 */
@Injectable()
export class MedicinesService {
  constructor(private readonly invoker: LambdaInvoker) {}

  async forward({
    method,
    path,
    userSub,
    body,
    query,
    pathParameters,
  }: ForwardOptions): Promise<unknown> {
    const queryStringParameters = Object.fromEntries(
      Object.entries(query ?? {}).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );

    const event: ProxyEvent = {
      httpMethod: method,
      path,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? null : JSON.stringify(body),
      isBase64Encoded: false,
      pathParameters: pathParameters ?? null,
      queryStringParameters:
        Object.keys(queryStringParameters).length > 0 ? queryStringParameters : null,
      // Mirrors what API Gateway's Cognito Authorizer injects, so the Lambda
      // reads the caller identically in both transports.
      requestContext: { authorizer: { claims: { sub: userSub } } },
    };

    const result = await this.invoker.invoke(TARGET, event);
    const parsed = result.body ? (JSON.parse(result.body) as unknown) : undefined;

    if (result.statusCode >= 400) {
      // Surface the Lambda's own error body and status verbatim.
      throw new HttpException(parsed ?? "Request failed", result.statusCode);
    }

    return parsed;
  }
}
