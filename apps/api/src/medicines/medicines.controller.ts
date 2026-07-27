import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard, CurrentUser, type AuthenticatedUser } from "../auth/current-user";
import { MedicinesService } from "./medicines.service";

/**
 * Gateway routes for the medicine-service Lambda.
 *
 * Deliberately thin: no validation or business logic lives here, because the
 * Lambda must behave identically when real API Gateway calls it directly.
 */
@Controller("medicines")
@UseGuards(AuthGuard)
export class MedicinesController {
  constructor(private readonly medicines: MedicinesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<unknown> {
    return this.medicines.forward({
      method: "GET",
      path: "/medicines",
      userSub: user.sub,
      query: { limit, cursor },
    });
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<unknown> {
    return this.medicines.forward({
      method: "POST",
      path: "/medicines",
      userSub: user.sub,
      body,
    });
  }

  @Get(":id")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<unknown> {
    return this.medicines.forward({
      method: "GET",
      path: `/medicines/${encodeURIComponent(id)}`,
      userSub: user.sub,
      pathParameters: { id },
    });
  }

  @Put(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    return this.medicines.forward({
      method: "PUT",
      path: `/medicines/${encodeURIComponent(id)}`,
      userSub: user.sub,
      body,
      pathParameters: { id },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<void> {
    await this.medicines.forward({
      method: "DELETE",
      path: `/medicines/${encodeURIComponent(id)}`,
      userSub: user.sub,
      pathParameters: { id },
    });
  }
}
