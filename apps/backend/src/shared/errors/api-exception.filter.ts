import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from '@bancaflow/shared';
import { ApiErrorResponse } from './api-error-response.type';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this._buildBody(exception, request.url);
    response.status(body.statusCode).json(body);
  }

  private _buildBody(exception: unknown, path: string): ApiErrorResponse {
    const timestamp = new Date().toISOString();

    if (exception instanceof ValidationError) {
      return {
        statusCode: exception.status ?? HttpStatus.BAD_REQUEST,
        error: 'Validation Error',
        message: [exception.codes],
        details: exception.messages,
        path,
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const payloadMessage =
        typeof payload === 'object' && payload !== null
          ? (payload as { message?: unknown }).message
          : undefined;
      const raw: unknown =
        typeof payload === 'string'
          ? payload
          : (payloadMessage ?? exception.message);
      const message: string[] = Array.isArray(raw)
        ? (raw as unknown[]).map((item) => String(item))
        : [String(raw)];

      // Passa adiante, quando presentes no payload, o código de domínio estável
      // e um payload auxiliar (`details`) — ex.: os candidatos de possível
      // duplicidade do Participants. Aditivo: só aparece quando o controller os
      // fornece; demais respostas de erro permanecem inalteradas.
      const code =
        typeof payload === 'object' && payload !== null
          ? (payload as { code?: unknown }).code
          : undefined;
      const details =
        typeof payload === 'object' && payload !== null
          ? (payload as { details?: unknown }).details
          : undefined;

      return {
        statusCode: status,
        error: exception.name,
        message,
        ...(typeof code === 'string' ? { code } : {}),
        ...(Array.isArray(details) ? { details } : {}),
        path,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Error',
      message: ['An unexpected error occurred. Please try again later.'],
      path,
      timestamp,
    };
  }
}
