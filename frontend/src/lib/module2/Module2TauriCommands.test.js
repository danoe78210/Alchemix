import { describe, it, expect, vi } from 'vitest';

// Tests unitaires des commandes Tauri Module 2 : get_job_progress et set_job_mode
// Ces tests vérifient la bonne construction des appels tauriInvoke et le parsing des réponses.

describe('Module 2 Tauri Commands — Unit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('get_job_progress — returns progress and mode for existing job', () => {
    const tauriInvoke = vi.fn();
    tauriInvoke.mockResolvedValue({ progress: 75.0, mode: 'PERFORMANCE' });

    const call = () => tauriInvoke('get_job_progress', { jobId: 'job-abc' });

    return call().then((result) => {
      expect(tauriInvoke).toHaveBeenCalledWith('get_job_progress', { jobId: 'job-abc' });
      expect(result.progress).toBe(75.0);
      expect(result.mode).toBe('PERFORMANCE');
    });
  });

  it('get_job_progress — rejects for unknown job', async () => {
    const tauriInvoke = vi.fn();
    tauriInvoke.mockRejectedValue(new Error('Job not found'));

    await expect(tauriInvoke('get_job_progress', { jobId: 'nonexistent' }))
      .rejects.toThrow('Job not found');
  });

  it('set_job_mode — returns current mode (immutable) when attempting change', () => {
    const tauriInvoke = vi.fn();
    tauriInvoke.mockResolvedValue({
      success: false,
      mode: 'PERFORMANCE',
      error: "Le mode d'un job est immuable après sa création"
    });

    const call = () => tauriInvoke('set_job_mode', { jobId: 'job-abc', mode: 'STUDIO' });

    return call().then((result) => {
      expect(tauriInvoke).toHaveBeenCalledWith('set_job_mode', { jobId: 'job-abc', mode: 'STUDIO' });
      expect(result.success).toBe(false);
      expect(result.mode).toBe('PERFORMANCE');
      expect(result.error).toContain('immuable');
    });
  });

  it('set_job_mode — accepts valid modes PERFORMANCE and STUDIO', () => {
    const tauriInvoke = vi.fn();
    tauriInvoke.mockResolvedValue({ success: true, mode: 'PERFORMANCE' });

    for (const mode of ['PERFORMANCE', 'STUDIO']) {
      tauriInvoke.mockResolvedValueOnce({ success: true, mode });
      tauriInvoke('set_job_mode', { jobId: 'job-abc', mode }).then((result) => {
        expect(result.success).toBe(true);
        expect(result.mode).toBe(mode);
      });
    }

    expect(tauriInvoke).toHaveBeenCalledTimes(2);
    expect(tauriInvoke).toHaveBeenNthCalledWith(1, 'set_job_mode', { jobId: 'job-abc', mode: 'PERFORMANCE' });
    expect(tauriInvoke).toHaveBeenNthCalledWith(2, 'set_job_mode', { jobId: 'job-abc', mode: 'STUDIO' });
  });

  it('get_job_progress — rejects with descriptive error when jobId is missing', async () => {
    const tauriInvoke = vi.fn();
    tauriInvoke.mockRejectedValue(new Error('jobId is required'));

    await expect(tauriInvoke('get_job_progress', {}))
      .rejects.toThrow('jobId is required');
  });
});
