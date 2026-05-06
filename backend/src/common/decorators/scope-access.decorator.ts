import { SetMetadata } from '@nestjs/common';

export type ScopeResource = 'organization' | 'match' | 'report';

export interface ScopeAccessOptions {
  resource: ScopeResource;
}

export const SCOPE_ACCESS_KEY = 'scopeAccess';
export const ScopeAccess = (
  options: ScopeAccessOptions,
): MethodDecorator & ClassDecorator => SetMetadata(SCOPE_ACCESS_KEY, options);
