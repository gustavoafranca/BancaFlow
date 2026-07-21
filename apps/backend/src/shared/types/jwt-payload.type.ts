/**
 * Claims do access token do Identity. `bancaId` e `sessionId` são autoritativos
 * e vêm sempre do token — nunca do body.
 */
export type JwtPayload = {
  sub: string; // userId
  bancaId: string;
  sessionId: string;
  role: 'OWNER' | 'ADMIN' | 'USER';
  mustChangePassword: boolean;
  iat?: number;
  exp?: number;
};

/** Contexto autenticado anexado à request após validação do token e da sessão. */
export interface AuthContext {
  userId: string;
  bancaId: string;
  sessionId: string;
  role: 'OWNER' | 'ADMIN' | 'USER';
  mustChangePassword: boolean;
}
