import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  LambdaInvoker,
  type LambdaTarget,
  type ProxyEvent,
  type ProxyResult,
} from "./lambda-invoker";

/**
 * Local-development invoker.
 *
 * Forwards the proxy event to a Lambda's `local-server`, which replays it
 * through the real handler. The boundary stays a network hop exactly as it is
 * in AWS, so the gateway code path is identical in both modes — only the
 * transport differs.
 */
@Injectable()
export class HttpLambdaInvoker extends LambdaInvoker {
  private readonly logger = new Logger(HttpLambdaInvoker.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  private baseUrl(target: LambdaTarget): string {
    const key = `LAMBDA_URL_${target.toUpperCase().replace(/-/g, "_")}`;
    const url = this.config.get<string>(key);
    if (!url) {
      throw new Error(
        `No local URL configured for Lambda "${target}". Set ${key} (e.g. http://localhost:4000).`,
      );
    }
    return url.replace(/\/$/, "");
  }

  async invoke(target: LambdaTarget, event: ProxyEvent): Promise<ProxyResult> {
    const query = new URLSearchParams(event.queryStringParameters ?? {}).toString();
    const url = `${this.baseUrl(target)}${event.path}${query ? `?${query}` : ""}`;

    // The dev server has no Cognito authorizer, so pass the resolved caller
    // through a header it can trust on localhost.
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const sub = event.requestContext.authorizer?.claims?.sub;
    if (sub) headers["x-dev-user-id"] = sub;

    let response: Response;
    try {
      response = await fetch(url, {
        method: event.httpMethod,
        headers,
        body: event.body ?? undefined,
      });
    } catch (err) {
      this.logger.error(`Cannot reach Lambda "${target}" at ${url}`, err as Error);
      throw new Error(
        `Lambda "${target}" is unreachable at ${url}. Is its dev server running?`,
      );
    }

    return {
      statusCode: response.status,
      body: await response.text(),
    };
  }
}
