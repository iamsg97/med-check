import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // `/v1` matches the deployed API Gateway stage from CLAUDE.md, so the mobile
  // app uses one base path in every environment.
  app.setGlobalPrefix("v1");

  // The Expo app is served from a different origin during development.
  app.enableCors({ origin: true });

  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 so a phone or emulator on the LAN can reach the dev machine.
  await app.listen(port, "0.0.0.0");

  Logger.log(`API gateway listening on http://localhost:${port}/v1`, "Bootstrap");
}

void bootstrap();
