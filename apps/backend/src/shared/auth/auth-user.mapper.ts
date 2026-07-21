import { AuthContext, JwtPayload } from '../types/jwt-payload.type';

/** Converte as claims do access token no contexto autenticado do Identity. */
export function mapPayloadToAuthContext(payload: JwtPayload): AuthContext {
  return {
    userId: payload.sub,
    bancaId: payload.bancaId,
    sessionId: payload.sessionId,
    role: payload.role,
    mustChangePassword: payload.mustChangePassword,
  };
}
