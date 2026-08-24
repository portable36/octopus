import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  SettingsAccessDeniedError,
  SettingsDomainError,
  SettingsNotFoundError,
} from '../../../application/errors/settings.errors';

@Catch(SettingsDomainError, SettingsAccessDeniedError, SettingsNotFoundError)
export class SettingsExceptionFilter implements ExceptionFilter {
  catch(
    exception: SettingsDomainError | SettingsAccessDeniedError | SettingsNotFoundError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (exception instanceof SettingsAccessDeniedError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof SettingsNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    }

    res.status(status).json({
      type: 'about:blank',
      title: exception.name,
      status,
      detail: exception.message,
      code: 'code' in exception ? exception.code : 'SETTINGS_ERROR',
    });
  }
}
