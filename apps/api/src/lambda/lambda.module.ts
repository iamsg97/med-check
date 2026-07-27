import { Global, Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AwsLambdaInvoker } from "./aws-lambda-invoker";
import { HttpLambdaInvoker } from "./http-lambda-invoker";
import { LambdaInvoker } from "./lambda-invoker";

/**
 * Chooses the transport used to reach the Lambda compute layer.
 *
 * `LAMBDA_INVOKER=aws` uses real Lambda invocations; anything else (the local
 * default) forwards over HTTP to each Lambda's dev server.
 */
@Global()
@Module({
  providers: [
    {
      provide: LambdaInvoker,
      inject: [ConfigService],
      useFactory: (config: ConfigService): LambdaInvoker => {
        const mode = config.get<string>("LAMBDA_INVOKER") ?? "http";
        Logger.log(`Lambda transport: ${mode}`, "LambdaModule");
        return mode === "aws"
          ? new AwsLambdaInvoker(config)
          : new HttpLambdaInvoker(config);
      },
    },
  ],
  exports: [LambdaInvoker],
})
export class LambdaModule {}
