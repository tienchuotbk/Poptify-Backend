import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { redact } from '../logging/redact';

/**
 * Global exception filter (task 4.3): trả shape JSON chuẩn, KHÔNG leak chi tiết
 * 5xx, và log context đã redact (không lộ token/secret/PII).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const error = this.resolveMessage(
      status,
      exception instanceof HttpException ? exception.getResponse() : undefined,
    );

    const context = JSON.stringify(
      redact({ headers: request.headers, body: request.body }),
    );
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // 5xx: log full exception (stack + context) server-side để debug. Client vẫn
      // chỉ nhận message generic (resolveMessage che chi tiết 5xx).
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${context}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.error(`${request.method} ${request.url} → ${status}`, context);
    }

    response.status(status).json({
      statusCode: status,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveMessage(status: number, payload: unknown): string {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error'; // không leak chi tiết lỗi 5xx
    }
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message: unknown }).message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }
    return 'Error';
  }
}
