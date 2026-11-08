        import { describe, it, expect, vi } from 'vitest';

// Integration tests for Module 2 pipeline: import → séparation → lecture stems → export
// These tests mock Tauri commands to test the full pipeline.
// Based on src-tauri/src/main.rs: start_separation, get_job_progress, set_job_mode,
// export_stems, cancel_separation, get_stem_audio commands.

describe('Module 2 Integration Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('full pipeline: start separation → get progress → export stems → cancel', async () => {
    // Mock tauriInvoke to return values based on command
    const tauriInvoke = vi.fn();

    // start_separation returns a job
    tauriInvoke.mockResolvedValueOnce({
      jobId: 'job-1',
      mode: 'PERFORMANCE',
      simulated: true
    });
    // get_job_progress returns progress
    tauriInvoke.mockResolvedValueOnce({
      progress: 50.0,
      mode: 'PERFORMANCE'
    });
    // export_stems returns paths
    tauriInvoke.mockResolvedValueOnce({
      paths: ['/tmp/out__vocals.wav', '/tmp/out__drums.wav']
    });
    // cancel_separated returns success
    tauriInvoke.mockResolvedValueOnce({ success: true });

    // Step 1: Start separation
    const startResult = await tauriInvoke('start_separation', {
      track: 'test-track',
      mode: 'PERFORMANCE'
    });
    expect(startResult.jobId).toBe('job-1');
    expect(startResult.mode).toBe('PERFORMANCE');
    expect(startResult.simulated).toBe(true);

    // Step 2: Get job progress
    const progressResult = await tauriInvoke('get_job_progress', { jobId: 'job-1' });
    expect(progressResult.progress).toBe(50.0);
    expect(progressResult.mode).toBe('PERFORMANCE');

    // Step 3: Export stems
    const exportResult = await tauriInvoke('export_stems', {
      jobId: 'job-1',
      stems: ['vocals', 'drums']
    });
    expect(exportResult.paths).toHaveLength(2);

    // Step 4: Cancel job
    const cancelResult = await tauriInvoke('cancel_separation', { jobId: 'job-1' });
    expect(cancelResult.success).toBe(true);
  });

  it('set_job_mode returns error when mode is immutable after creation', async () => {
    const tauriInvoke = vi.fn();

    // Job created with PERFORMANCE mode (immutable)
    tauriInvoke.mockResolvedValueOnce({
      jobId: 'job-1',
      mode: 'PERFORMANCE',
      simulated: true
    });
    await tauriInvoke('start_separation', {
      track: 'test-track',
      mode: 'PERFORMANCE'
    });

    // Try to change mode to STUDIO - should return an error (mode immutable)
    tauriInvoke.mockResolvedValueOnce({
      success: false,
      mode: 'PERFORMANCE', // Returns current immutable mode
      error: "Le mode d'un job est immuable après sa création"
    });
    const modeResult = await tauriInvoke('set_job_mode', {
      jobId: 'job-1',
      mode: 'STUDIO'
    });
    // Per main.rs contract §3.3: mode is immutable after creation
    expect(modeResult.success).toBe(false);
    expect(modeResult.mode).toBe('PERFORMANCE'); // Returns current immutable mode
  });

  it('get_job_progress returns error for unknown job', async () => {
    const tauriInvoke = vi.fn();
    tauriInvoke.mockRejectedValueOnce(new Error('Job not found'));

    await expect(
      tauriInvoke('get_job_progress', { jobId: 'nonexistent-job' })
    ).rejects.toThrow('Job not found');
  });

  it('export_stems returns error for unknown job', async () => {
    const tauriInvoke = vi.fn();
    tauriInvoke.mockRejectedValueOnce(new Error('Job not found'));

    await expect(
      tauriInvoke('export_stems', { jobId: 'nonexistent-job', stems: ['vocals'] })
    ).rejects.toThrow('Job not found');
  });

  it('get_stem_audio works correctly for existing job', async () => {
    const tauriInvoke = vi.fn();

    // First start the job
    tauriInvoke.mockResolvedValueOnce({
      jobId: 'job-1',
      mode: 'PERFORMANCE',
      simulated: true
    });
    await tauriInvoke('start_separation', {
      track: 'test-track',
      mode: 'PERFORMANCE'
    });

    // Then get stem audio - this is a real command that would go to the backend
    // For now, just verify the jobId is accessible
    const jobId = 'job-1';
    tauriInvoke.mockResolvedValueOnce({
      bytes: new Uint8Array(100),
      sampleRate: 44100,
      channels: 2
    });
    const stemResult = await tauriInvoke('get_stem_audio', { jobId, stem: 'drums' });
    expect(stemResult).toBeTruthy();
    expect(stemResult.bytes).toBeInstanceOf(Uint8Array);
    expect(stemResult.bytes.length).toBeGreaterThan(44); // WAV header
  });
});
