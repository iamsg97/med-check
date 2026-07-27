import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthGuard } from "./auth/current-user";
import { HealthController } from "./health.controller";
import { LambdaModule } from "./lambda/lambda.module";
import { MedicinesModule } from "./medicines/medicines.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env.local", ".env"] }),
    LambdaModule,
    MedicinesModule,
  ],
  controllers: [HealthController],
  providers: [AuthGuard],
})
export class AppModule {}
