import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  LambdaInvoker,
  type LambdaTarget,
  type ProxyEvent,
  type ProxyResult,
} from "./lambda-invoker";

/**
 * Deployed invoker — synchronous `RequestResponse` invocation of the target
 * Lambda with an APIGatewayProxyEvent payload.
 */
@Injectable()
export class AwsLambdaInvoker extends LambdaInvoker {
  private readonly logger = new Logger(AwsLambdaInvoker.name);
  private readonly client: LambdaClient;

  constructor(private readonly config: ConfigService) {
    super();
    this.client = new LambdaClient({
      region: this.config.get<string>("AWS_REGION"),
    });
  }

  private functionName(target: LambdaTarget): string {
    const key = `LAMBDA_NAME_${target.toUpperCase().replace(/-/g, "_")}`;
    const name = this.config.get<string>(key);
    if (!name) {
      throw new Error(`No function name configured for Lambda "${target}". Set ${key}.`);
    }
    return name;
  }

  async invoke(target: LambdaTarget, event: ProxyEvent): Promise<ProxyResult> {
    const response = await this.client.send(
      new InvokeCommand({
        FunctionName: this.functionName(target),
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify(event)),
      }),
    );

    if (response.FunctionError) {
      const detail = response.Payload
        ? Buffer.from(response.Payload).toString("utf8")
        : "(no payload)";
      this.logger.error(`Lambda "${target}" failed: ${response.FunctionError} ${detail}`);
      throw new Error(`Lambda "${target}" returned ${response.FunctionError}`);
    }

    if (!response.Payload) {
      throw new Error(`Lambda "${target}" returned an empty payload.`);
    }

    return JSON.parse(Buffer.from(response.Payload).toString("utf8")) as ProxyResult;
  }
}
