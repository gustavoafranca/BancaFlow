import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from '../types/jwt-payload.type';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

/** Injeta o contexto autenticado do Identity (ou um campo específico dele). */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.authUser;
    return field ? user?.[field] : user;
  },
);

/** Injeta o `bancaId` autoritativo vindo do token. Nunca do body. */
export const CurrentBancaId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authUser?.bancaId;
  },
);
