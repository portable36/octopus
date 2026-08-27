import { describe, expect, it } from 'vitest';
import { BULLMQ_DEFAULT_JOB_OPTIONS, BULLMQ_DLQ_JOB_OPTIONS } from './bullmq-default-job-options';

describe('bullmqDefaultJobOptions', () => {
  it('uses age+count retention and shared retry defaults', () => {
    expect(BULLMQ_DEFAULT_JOB_OPTIONS.attempts).toBe(5);
    expect(BULLMQ_DEFAULT_JOB_OPTIONS.removeOnComplete).toEqual({ age: 86_400, count: 1_000 });
    expect(BULLMQ_DEFAULT_JOB_OPTIONS.removeOnFail).toEqual({ age: 604_800, count: 5_000 });
    expect(BULLMQ_DLQ_JOB_OPTIONS.removeOnComplete).toEqual({ age: 604_800, count: 1_000 });
  });
});
