import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  message: string | string[];
  error?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse() as ErrorBody | string;

      if (typeof body === 'string') {
        message = body;
      } else {
        message = body.message ?? 'An error occurred';
        error = body.error ?? exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unknown exception', JSON.stringify(exception));
    }

    const messages = Array.isArray(message) ? message : [message];

    response.status(statusCode).json({
      success: false,
      statusCode,
      message: messages[0],
      errors: messages,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
