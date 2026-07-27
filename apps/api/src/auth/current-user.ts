import {
  createParamDecorator,
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/** The authenticated caller, keyed by Cognito `sub`. */
export interface AuthenticatedUser {
  sub: string;
}

type RequestWithUser = Request & { user?: AuthenticatedUser };

/**
 * Resolves the caller and attaches it to the request.
 *
 * Real Cognito JWT verification (Passport + jwks-rsa) replaces the body of
 * `resolve()` later; everything downstream already reads `@CurrentUser()` and
 * will not need to change.
 *
 * The dev fallback is opt-in via `ALLOW_DEV_USER=true` so a deployed stage can
 * never silently accept unauthenticated traffic.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private warned = false;

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = this.resolve();
    return true;
  }

  private resolve(): AuthenticatedUser {
    if (this.config.get<string>("ALLOW_DEV_USER") === "true") {
      if (!this.warned) {
        this.logger.warn(
          "ALLOW_DEV_USER=true — all requests run as the stub dev user. Never enable this in a deployed stage.",
        );
        this.warned = true;
      }
      return { sub: this.config.get<string>("DEV_USER_ID") ?? "dev-user" };
    }

    // TODO: verify the Cognito JWT and return its `sub`.
    throw new UnauthorizedException("Authentication is not configured.");
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new UnauthorizedException("No authenticated user on request.");
    }
    return request.user;
  },
);
