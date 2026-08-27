import { describe, expect, it } from 'vitest';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { Rfc7807ExceptionFilter } from './rfc7807-exception.filter';

describe('Rfc7807ExceptionFilter', () => {
  const filter = new Rfc7807ExceptionFilter();

  it('maps validation errors to RFC7807 with field details', () => {
    const json = captureJson(
      filter,
      new BadRequestException({
        message: 'Validation failed.',
        errors: [{ field: 'email', message: 'email must be an email' }],
      }),
    );

    expect(json.status).toBe(HttpStatus.BAD_REQUEST);
    expect(json.type).toBe(`https://httpstatuses.com/${HttpStatus.BAD_REQUEST}`);
    expect(json.errors).toEqual([{ field: 'email', message: 'email must be an email' }]);
  });

  it('hides internal error details for unknown exceptions', () => {
    const json = captureJson(filter, new Error('database password leaked'));

    expect(json.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json.detail).toBe('An unexpected error occurred.');
    expect(json.detail).not.toContain('password');
  });

  it('surfaces domain errorCode and logs via req.log', () => {
    const logs: Array<{ level: string; payload: Record<string, unknown>; msg?: string }> = [];
    const json = captureJson(
      filter,
      Object.assign(new BadRequestException('Nope'), { code: 'VENDOR_ACCESS_DENIED' }),
      {
        warn: (payload, msg) => {
          const entry: { level: string; payload: Record<string, unknown>; msg?: string } = {
            level: 'warn',
            payload,
          };
          if (msg !== undefined) {
            entry.msg = msg;
          }
          logs.push(entry);
        },
        error: (payload, msg) => {
          const entry: { level: string; payload: Record<string, unknown>; msg?: string } = {
            level: 'error',
            payload,
          };
          if (msg !== undefined) {
            entry.msg = msg;
          }
          logs.push(entry);
        },
      },
    );

    expect(json.errorCode).toBe('VENDOR_ACCESS_DENIED');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.level).toBe('warn');
    expect(logs[0]?.payload.errorCode).toBe('VENDOR_ACCESS_DENIED');
    expect(logs[0]?.msg).toBe('request_rejected');
  });
});

function captureJson(
  filter: Rfc7807ExceptionFilter,
  exception: unknown,
  log?: {
    warn: (obj: Record<string, unknown>, msg?: string) => void;
    error: (obj: Record<string, unknown>, msg?: string) => void;
  },
): Record<string, unknown> {
  let payload: Record<string, unknown> = {};

  const response = {
    status(code: number) {
      expect(code).toBeGreaterThan(0);
      return response;
    },
    type(contentType: string) {
      expect(contentType).toBe('application/problem+json');
      return response;
    },
    json(body: Record<string, unknown>) {
      payload = body;
      return response;
    },
  };

  const request = { url: '/api/v1/example', log };

  filter.catch(exception, {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as never);

  return payload;
}
