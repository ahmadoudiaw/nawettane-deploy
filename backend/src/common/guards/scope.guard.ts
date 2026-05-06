import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SCOPE_ACCESS_KEY, ScopeAccessOptions } from '../decorators/scope-access.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { buildScopeContext } from '../utils/scope.util';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const scopeMetadata = this.reflector.getAllAndOverride<ScopeAccessOptions>(
      SCOPE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!scopeMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      // Let JwtAuthGuard authenticate first when it is applied at controller level.
      return true;
    }

    const scope = buildScopeContext(user);
    request.user = { ...user, scope };

    if (scope.isGlobal) {
      return true;
    }

    if (scopeMetadata.resource === 'report') {
      return scope.organizationIds.length > 0 || scope.matchIds.length > 0;
    }

    if (user.role === Role.SUPPORTER) {
      throw new ForbiddenException('Supporter access is limited to public endpoints.');
    }

    return true;
  }
}
