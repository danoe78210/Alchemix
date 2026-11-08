<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { audioLoaded = false, analysisData = null } = $props<{
    audioLoaded?: boolean;
    analysisData?: any;
  }>();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let wrapper = $state<HTMLDivElement | null>(null);

  let animationFrameId: number | null = null;
  let sweepPos = 0;
  let resizeObserver: any = null;

  function updateCanvasSize() {
    if (canvas && wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
    }
  }

  function draw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    if (width <= 0 || height <= 0) return;

    try {
      ctx.clearRect(0, 0, width, height);

      if (!audioLoaded) {
        // ===== ÉTAT 1 : IDLE / ATTENTE SIGNAL =====
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.max(1, Math.min(width, height) / 2);

        const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        bgGrad.addColorStop(0, '#14161C');
        bgGrad.addColorStop(1, '#090A0D');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Grille Spectrale
        ctx.strokeStyle = 'rgba(255, 179, 0, 0.08)';
        ctx.lineWidth = 1;

        const gridSpacingX = 30;
        const gridSpacingY = 20;

        for (let x = 0; x < width; x += gridSpacingX) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSpacingY) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Ligne de balayage d'oscilloscope
        sweepPos = (sweepPos + 3.0) % (width + 100);
        const sweepX = sweepPos - 50;

        const sweepGrad = ctx.createLinearGradient(Math.max(0, sweepX - 80), 0, Math.max(0, sweepX), 0);
        sweepGrad.addColorStop(0, 'rgba(255, 179, 0, 0)');
        sweepGrad.addColorStop(0.8, 'rgba(255, 179, 0, 0.3)');
        sweepGrad.addColorStop(1, 'rgba(255, 179, 0, 0.85)');

        ctx.fillStyle = sweepGrad;
        ctx.fillRect(Math.max(0, sweepX - 80), 0, 80, height);

        // Onde sinusoïdale de balayage
        ctx.beginPath();
        ctx.strokeStyle = '#FFB300';
        ctx.lineWidth = 2;

        for (let x = 0; x < width; x += 4) {
          const distFromSweep = Math.abs(x - sweepX);
          const amp = distFromSweep < 70 ? Math.sin((x + sweepPos) * 0.08) * (70 - distFromSweep) * 0.3 : 0;
          const y = centerY + amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Message rétro-éclairé
        ctx.save();
        ctx.font = '700 12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFB300';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FFC107';
        ctx.fillText('⚡ ATTENTE SIGNAL AUDIO A & B — INSERER CASSETTES', width / 2, height / 2);
        ctx.restore();

      } else {
        // ===== ÉTAT 2 : POST-ANALYSE (DUAL WAVEFORM & BEATGRID 1/16) =====
        ctx.fillStyle = '#0B0C0E';
        ctx.fillRect(0, 0, width, height);

        const halfH = height / 2;

        let waveA = analysisData?.waveformA || [];
        let waveB = analysisData?.waveformB || [];

        if (waveA.length === 0) {
          waveA = Array.from({ length: 120 }, (_, i) => Math.sin(i * 0.15) * 0.4 + 0.5);
        }
        if (waveB.length === 0) {
          waveB = Array.from({ length: 120 }, (_, i) => Math.cos(i * 0.12) * 0.45 + 0.5);
        }

        // PISTE A (MASTER - AMBRE)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 179, 0, 0.05)';
        ctx.fillRect(0, 0, width, halfH);

        drawSingleWaveform(ctx, waveA, 0, halfH / 2, width, halfH / 2 - 12, '#FFB300', '#FFD54F');

        ctx.fillStyle = '#FFB300';
        ctx.font = '700 10px monospace';
        ctx.fillText(`PISTE A (MASTER) — ${analysisData?.bpmA || 118.50} BPM`, 12, 16);
        ctx.restore();

        // PISTE B (CANDIDATE - ÉMERAUDE)
        ctx.save();
        ctx.fillStyle = 'rgba(0, 230, 118, 0.05)';
        ctx.fillRect(0, halfH, width, halfH);

        drawSingleWaveform(ctx, waveB, halfH, halfH + halfH / 2, width, halfH / 2 - 12, '#00E676', '#69F0AE');

        ctx.fillStyle = '#00E676';
        ctx.font = '700 10px monospace';
        ctx.fillText(`PISTE B (CANDIDATE) — ${analysisData?.bpmB || 126.00} BPM`, 12, halfH + 16);
        ctx.restore();

        // BEATGRID 1/16e
        const totalBeats = 32;
        const beatWidth = width / totalBeats;

        for (let i = 0; i <= totalBeats; i++) {
          const bx = i * beatWidth;
          const isDownbeat = i % 4 === 0;

          ctx.strokeStyle = isDownbeat ? 'rgba(255, 179, 0, 0.65)' : 'rgba(255, 179, 0, 0.18)';
          ctx.lineWidth = isDownbeat ? 1.5 : 1;
          ctx.setLineDash(isDownbeat ? [] : [2, 2]);

          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.lineTo(bx, height);
          ctx.stroke();

          if (isDownbeat && i < totalBeats) {
            ctx.fillStyle = '#FFB300';
            ctx.font = '9px monospace';
            ctx.fillText(`M${i/4 + 1}`, bx + 3, halfH - 4);
          }
        }
        ctx.setLineDash([]);

        // Ligne médiane cuivrée
        ctx.strokeStyle = '#C87D55';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, halfH);
        ctx.lineTo(width, halfH);
        ctx.stroke();
      }
    } catch (err) {
      console.error("BeatgridOverlay canvas draw error:", err);
    }
  }

  function drawSingleWaveform(
    ctx: CanvasRenderingContext2D,
    wave: number[],
    topY: number,
    centerY: number,
    width: number,
    maxAmp: number,
    colorMain: string,
    colorGlow: string
  ) {
    if (wave.length === 0) return;
    const step = width / wave.length;

    ctx.beginPath();
    ctx.fillStyle = colorMain;
    ctx.globalAlpha = 0.35;
    ctx.moveTo(0, centerY);

    for (let i = 0; i < wave.length; i++) {
      const x = i * step;
      const amp = wave[i] * maxAmp * 0.85;
      ctx.lineTo(x, centerY - amp);
    }
    for (let i = wave.length - 1; i >= 0; i--) {
      const x = i * step;
      const amp = wave[i] * maxAmp * 0.85;
      ctx.lineTo(x, centerY + amp);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.strokeStyle = colorGlow;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < wave.length; i++) {
      const x = i * step;
      const amp = wave[i] * maxAmp * 0.85;
      if (i === 0) ctx.moveTo(x, centerY - amp);
      else ctx.lineTo(x, centerY - amp);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < wave.length; i++) {
      const x = i * step;
      const amp = wave[i] * maxAmp * 0.85;
      if (i === 0) ctx.moveTo(x, centerY + amp);
      else ctx.lineTo(x, centerY + amp);
    }
    ctx.stroke();
  }

  function loop() {
    updateCanvasSize();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  onMount(() => {
    if (typeof ResizeObserver !== 'undefined' && wrapper) {
      resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
        draw();
      });
      resizeObserver.observe(wrapper);
    }
    updateCanvasSize();
    loop();
  });

  onDestroy(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    if (typeof ResizeObserver !== 'undefined' && resizeObserver && typeof resizeObserver.disconnect === 'function') {
      resizeObserver.disconnect();
    }
  });

  $effect(() => {
    if (audioLoaded || analysisData) {
      draw();
    }
  });
</script>

<div class="aw-panel beatgrid-panel">
  <div class="aw-panel-header">
    <div class="title-with-icon">
      <span class="icon">📊</span>
      <span class="aw-panel-title">FORMES D'ONDES & BEATGRID</span>
    </div>
    <span class="aw-badge {audioLoaded ? 'aw-badge-emerald' : 'aw-badge-amber'}">
      {audioLoaded ? '● SIGNAL ACTIF (DUAL WAVEFORM)' : '○ VEILLE (ATTENTE SIGNAL)'}
    </span>
  </div>

  <div class="aw-bezel-glass canvas-wrapper" bind:this={wrapper}>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .beatgrid-panel {
    background: #1A1C22;
    border: 1px solid #3A2218;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    height: 100%;
    min-height: 200px;
    box-sizing: border-box;
  }

  .aw-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon {
    font-size: 13px;
  }

  .aw-panel-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #C87D55;
    text-transform: uppercase;
  }

  .aw-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    letter-spacing: 0.5px;
  }

  .aw-badge-amber {
    background: rgba(255, 179, 0, 0.15);
    color: #FFB300;
    border: 1px solid rgba(255, 179, 0, 0.4);
  }

  .aw-badge-emerald {
    background: rgba(0, 230, 118, 0.15);
    color: #00E676;
    border: 1px solid rgba(0, 230, 118, 0.4);
  }

  .canvas-wrapper {
    flex: 1;
    width: 100%;
    min-height: 120px;
    position: relative;
    background: #101216;
    border: 2px solid #3A2218;
    box-shadow: inset 0 3px 10px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5);
    border-radius: 4px;
    overflow: hidden;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
