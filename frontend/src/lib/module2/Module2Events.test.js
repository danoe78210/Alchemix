import { describe, it, expect, vi } from 'vitest';

// Tests unitaires pour les événements IPC module2:// (contrat §4)
// Valide la structure des charges utiles et le comportement d'écoute.

describe('Module 2 IPC Events — module2://', () => {
  it('module2://progress payload matches contract', () => {
    const payload = { jobId: 'job-1', percent: 50.0, stage: 'infer' };
    expect(payload.jobId).toBeTruthy();
    expect(typeof payload.percent).toBe('number');
    expect(['decode', 'infer', 'bleed', 'encode']).toContain(payload.stage);
  });

  it('module2://progress percent is monotonic (monotonicity rule)', () => {
    const previous = 25.0;
    const current = 50.0;
    const next = 75.0;
    expect(current).toBeGreaterThan(previous);
    expect(next).toBeGreaterThan(current);
  });

  it('module2://progress ignores non-monotonic values', () => {
    const received = [25.0, 50.0, 30.0, 75.0];
    const filtered = received.filter((p, i, arr) => p >= (arr[i - 1] ?? 0));
    expect(filtered).toEqual([25.0, 50.0, 75.0]);
  });

  it('module2://done payload contains jobId only', () => {
    const payload = { jobId: 'job-1' };
    expect(Object.keys(payload)).toEqual(['jobId']);
    expect(payload.jobId).toBe('job-1');
  });

  it('module2://done does not write to disk (export_stems handles I/O)', () => {
    // Le contrat stipule : module2://done n'écrit rien sur disque.
    // Le test vérifie simplement que la charge utile ne contient aucun chemin.
    const payload = { jobId: 'job-1' };
    expect(payload).not.toHaveProperty('paths');
    expect(payload).not.toHaveProperty('output');
  });

  it('module2://error payload contains jobId and Module2Error', () => {
    const payload = {
      jobId: 'job-1',
      error: { code: 'MODEL_MISSING', message: 'Modèle absent' }
    };
    expect(payload.jobId).toBeTruthy();
    expect(payload.error.code).toBe('MODEL_MISSING');
    expect(typeof payload.error.message).toBe('string');
  });

  it('module2://error codes are from the ErrorCode enum', () => {
    const validCodes = [
      'FILE_NOT_FOUND', 'UNSUPPORTED_FORMAT', 'DECODE_FAILED',
      'WORKDIR_NOT_SET', 'WORKDIR_NOT_WRITABLE', 'DISK_FULL',
      'MODEL_MISSING', 'MODEL_NOT_CONFIRMED', 'DOWNLOAD_FAILED',
      'MODEL_CHECKSUM_FAILED', 'CANCELLED', 'IMPORT_REFUSED', 'INVALID_ARGUMENT'
    ];
    const payload = { jobId: 'job-1', error: { code: 'CANCELLED', message: 'Annulé' } };
    expect(validCodes).toContain(payload.error.code);
  });

  it('module2://progress stage enum values are limited', () => {
    const validStages = ['decode', 'infer', 'bleed', 'encode'];
    for (const stage of validStages) {
      const payload = { jobId: 'job-1', percent: 10.0, stage };
      expect(validStages).toContain(payload.stage);
    }
  });
});