/**
 * The contract between the NestJS gateway and the Lambda compute layer.
 *
 * Nest's job here is exactly API Gateway's job: turn an HTTP request into an
 * APIGatewayProxyEvent, hand it to a Lambda, and turn the
 * APIGatewayProxyResult back into an HTTP response. Keeping that shape means
 * the Lambda handlers are identical whether they are invoked by this gateway
 * in dev or by real API Gateway in AWS.
 */

/** Subset of APIGatewayProxyEvent the gateway populates. */
export interface ProxyEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
  isBase64Encoded: boolean;
  pathParameters: Record<string, string> | null;
  queryStringParameters: Record<string, string> | null;
  requestContext: {
    authorizer?: { claims?: Record<string, string> };
  };
}

/** Subset of APIGatewayProxyResult the gateway consumes. */
export interface ProxyResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

/** Logical names of the four Lambdas from CLAUDE.md. */
export type LambdaTarget =
  | "medicine-service"
  | "ai-enrichment"
  | "symptom-search"
  | "notification-service";

export abstract class LambdaInvoker {
  abstract invoke(target: LambdaTarget, event: ProxyEvent): Promise<ProxyResult>;
}
