import { Request } from 'express';
import { AuthContext } from './jwt-payload.type';

export interface AuthenticatedRequest extends Request {
  authUser?: AuthContext;
  codigoBanca?: string;
}
