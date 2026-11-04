<script lang="ts">
  import { CAMELOT_KEYS, compatibleCodes, frenchNote, parseCode } from '$lib/camelot.js';

  // Sans clé (aucune piste analysée) : état neutre, seul le cercle vert tournant reste visible
  let { keyA = null, keyB = null, trackNameA = "Piste A", trackNameB = "Piste B" } = $props<{
    keyA?: string | null;
    keyB?: string | null;
    trackNameA?: string;
    trackNameB?: string;
  }>();

  const isIdle = $derived(!keyA && !keyB);

  // Sélecteur de notation : codes Camelot seuls, clés musicales seules, ou double notation
  type NotationMode = 'codes' | 'notes' | 'double';
  let notation = $state<NotationMode>('double');

  const camelotKeys = CAMELOT_KEYS;

  // Les 4 clés adjacentes compatibles avec la tonalité active (Piste B / cible)
  const compatSet = $derived(new Set(compatibleCodes(keyB)));

  // Géométrie du cadran 400×400 (SVG agrandi, occupe 100 % du conteneur)
  const CX = 200;
  const CY = 200;
  const R_OUTER = 156; // anneau des majeures (codes B)
  const R_INNER = 114; // anneau des mineures (codes A)

  function getAngleForNum(num: number): number {
    return (num % 12) * 30 - 90;
  }

  function minorNote(entry: { minorEn: string }): string {
    return `${frenchNote(entry.minorEn)} m`;
  }

  // Position (x, y) d'un code Camelot sur le cadran
  function posForCode(code: string) {
    const p = parseCode(code);
    if (!p) return null;
    const angle = getAngleForNum(p.num);
    const rad = (angle * Math.PI) / 180;
    const ringR = p.letter === 'B' ? R_OUTER : R_INNER;
    return {
      x: CX + ringR * Math.cos(rad),
      y: CY + ringR * Math.sin(rad),
      angle,
      ringR
    };
  }

  const posA = $derived(posForCode(keyA));
  const posB = $derived(posForCode(keyB));
  const isMatch = $derived(String(keyA) === String(keyB) && posA !== null);

  // Arc de connexion lumineux entre la clé A et la clé B (dégradé or ➔ émeraude)
  const arcPath = $derived.by(() => {
    if (!posA || !posB || isMatch) return null;
    const diff = Math.abs(posB.angle - posA.angle) % 360;
    const largeArc = diff > 180 ? 1 : 0;
    const rArc = (posA.ringR + posB.ringR) / 2;
    return `M ${posA.x.toFixed(2)} ${posA.y.toFixed(2)} A ${rArc.toFixed(2)} ${rArc.toFixed(2)} 0 ${largeArc} 1 ${posB.x.toFixed(2)} ${posB.y.toFixed(2)}`;
  });
</script>

<div class="camelot-wrapper">
  {#if !isIdle}
  <div class="wheel-header">
    <span class="icon">🎡</span>
    <span class="title">CADRAN D'HARMONIE CAMELOT</span>
    <div class="notation-switch" data-testid="notation-switch" role="group" aria-label="Notation de la roue Camelot">
      <button type="button" class="notation-opt {notation === 'codes' ? 'active' : ''}" data-testid="notation-codes" onclick={() => (notation = 'codes')}>CODES</button>
      <button type="button" class="notation-opt {notation === 'notes' ? 'active' : ''}" data-testid="notation-notes" onclick={() => (notation = 'notes')}>NOTES</button>
      <button type="button" class="notation-opt {notation === 'double' ? 'active' : ''}" data-testid="notation-double" onclick={() => (notation = 'double')}>DOUBLE</button>
    </div>
  </div>
  {/if}

  <div class="svg-container" style="width: 100%; max-width: 432px; aspect-ratio: 1 / 1; margin: 0 auto;">
    <svg
      viewBox="0 0 400 400"
      style="width: 100%; height: 100%; display: block;"
      class="camelot-svg"
      data-testid="camelot-svg"
    >
      <defs>
        <linearGradient id="gradAB" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFB300" />
          <stop offset="100%" stop-color="#00E676" />
        </linearGradient>
      </defs>

      <circle cx={CX} cy={CY} r="194" fill="#121316" stroke="#3A2218" stroke-width="4" />
      <circle cx={CX} cy={CY} r="186" fill="#181A20" stroke="#C87D55" stroke-width="1.5" stroke-dasharray="2,4" />
      {#if isIdle}
        <circle data-testid="wheel-idle-ring" cx={CX} cy={CY} r="190" class="idle-ring" fill="none" stroke="#00E676" stroke-width="4" stroke-dasharray="6 5" />
      {/if}

      <!-- Arc de connexion lumineux entre la clé A et la clé B -->
      {#if arcPath}
        <path d={arcPath} class="link-arc-halo" fill="none" />
        <path d={arcPath} class="link-arc" fill="none" stroke="url(#gradAB)" />
      {/if}
      {#if isMatch && posA}
        <circle cx={posA.x} cy={posA.y} r="36" class="match-ring" fill="none" stroke="url(#gradAB)" />
      {/if}

      <!-- Anneau extérieur : 12 tonalités majeures (codes B) -->
      {#each camelotKeys as k}
        {@const angle = getAngleForNum(k.num)}
        {@const code = k.codeB}
        {@const isKeyA = keyA === code}
        {@const isKeyB = keyB === code}
        {@const isCompat = compatSet.has(code)}
        {@const rad = (angle * Math.PI) / 180}
        {@const x = CX + R_OUTER * Math.cos(rad)}
        {@const y = CY + R_OUTER * Math.sin(rad)}

        <g class="key-node {isKeyA ? 'node-a' : ''} {isKeyB ? 'node-b' : ''} {isCompat && !isKeyA && !isKeyB ? 'node-compat' : ''}">
          <circle
            cx={x}
            cy={y}
            r="26"
            fill={isKeyA ? '#FFB300' : isKeyB ? '#00E676' : isCompat ? '#1E3A4C' : '#22252D'}
            stroke={isKeyA ? '#FFE082' : isKeyB ? '#B9F6CA' : isCompat ? '#29B6F6' : '#3A2218'}
            stroke-width={isKeyA || isKeyB ? '4' : isCompat ? '3' : '2'}
          />
          {#if !isIdle}
          {#if notation === 'double'}
            <text x={x} y={y + 2} text-anchor="middle" font-size="15" font-weight="800" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#29B6F6' : '#E0E6ED'}>
              {frenchNote(k.majorEn)}
            </text>
            <text x={x} y={y + 17} text-anchor="middle" font-size="10.5" font-weight="700" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#7FD4FF' : '#94A3B8'}>
              {code}
            </text>
          {:else if notation === 'notes'}
            <text x={x} y={y + 6} text-anchor="middle" font-size="17" font-weight="800" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#29B6F6' : '#E0E6ED'}>
              {frenchNote(k.majorEn)}
            </text>
          {:else}
            <text x={x} y={y + 6.5} text-anchor="middle" font-size="18" font-weight="800" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#29B6F6' : '#E0E6ED'}>
              {code}
            </text>
          {/if}
          {/if}
          {#if isKeyA || isKeyB}
            <g class="deck-badge" data-testid={isKeyA && isKeyB ? 'badge-ab' : isKeyA ? 'badge-a' : 'badge-b'}>
              <circle cx={x + 21} cy={y - 21} r="10" class={isKeyA && !isKeyB ? 'badge-circle-a' : isKeyB && !isKeyA ? 'badge-circle-b' : 'badge-circle-ab'} />
              <text x={x + 21} y={y - 21} text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" class={isKeyA && !isKeyB ? 'badge-text-a' : isKeyB && !isKeyA ? 'badge-text-b' : 'badge-text-ab'}>
                {isKeyA && isKeyB ? 'A·B' : isKeyA ? 'A' : 'B'}
              </text>
            </g>
          {/if}
        </g>
      {/each}

      <!-- Anneau intérieur : 12 tonalités mineures (codes A) -->
      {#each camelotKeys as k}
        {@const angle = getAngleForNum(k.num)}
        {@const code = k.codeA}
        {@const isKeyA = keyA === code}
        {@const isKeyB = keyB === code}
        {@const isCompat = compatSet.has(code)}
        {@const rad = (angle * Math.PI) / 180}
        {@const x = CX + R_INNER * Math.cos(rad)}
        {@const y = CY + R_INNER * Math.sin(rad)}

        <g class="key-node {isKeyA ? 'node-a' : ''} {isKeyB ? 'node-b' : ''} {isCompat && !isKeyA && !isKeyB ? 'node-compat' : ''}">
          <circle
            cx={x}
            cy={y}
            r="20"
            fill={isKeyA ? '#FFB300' : isKeyB ? '#00E676' : isCompat ? '#1E3A4C' : '#1A1C22'}
            stroke={isKeyA ? '#FFE082' : isKeyB ? '#B9F6CA' : isCompat ? '#29B6F6' : '#2D3039'}
            stroke-width={isKeyA || isKeyB ? '4' : isCompat ? '3' : '2'}
          />
          {#if !isIdle}
          {#if notation === 'double'}
            <text x={x} y={y + 1} text-anchor="middle" font-size="11.5" font-weight="800" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#29B6F6' : '#E0E6ED'}>
              {minorNote(k)}
            </text>
            <text x={x} y={y + 13} text-anchor="middle" font-size="8.5" font-weight="700" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#7FD4FF' : '#94A3B8'}>
              {code}
            </text>
          {:else if notation === 'notes'}
            <text x={x} y={y + 4.5} text-anchor="middle" font-size="13" font-weight="800" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#29B6F6' : '#E0E6ED'}>
              {minorNote(k)}
            </text>
          {:else}
            <text x={x} y={y + 5.5} text-anchor="middle" font-size="14" font-weight="800" fill={isKeyA || isKeyB ? '#000' : isCompat ? '#29B6F6' : '#94A3B8'}>
              {code}
            </text>
          {/if}
          {/if}
          {#if isKeyA || isKeyB}
            <g class="deck-badge" data-testid={isKeyA && isKeyB ? 'badge-ab' : isKeyA ? 'badge-a' : 'badge-b'}>
              <circle cx={x + 16} cy={y - 16} r="8.5" class={isKeyA && !isKeyB ? 'badge-circle-a' : isKeyB && !isKeyA ? 'badge-circle-b' : 'badge-circle-ab'} />
              <text x={x + 16} y={y - 16} text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="900" class={isKeyA && !isKeyB ? 'badge-text-a' : isKeyB && !isKeyA ? 'badge-text-b' : 'badge-text-ab'}>
                {isKeyA && isKeyB ? 'A·B' : isKeyA ? 'A' : 'B'}
              </text>
            </g>
          {/if}
        </g>
      {/each}

      <circle cx={CX} cy={CY} r="54" fill="#0D0E11" stroke="#C87D55" stroke-width="2.5" />
      {#if !isIdle}
        <text x={CX} y={CY - 20} text-anchor="middle" font-size="12" font-weight="700" fill="#8899A6">TRANSITION</text>
        <text x={CX} y={CY + 6} text-anchor="middle" font-size="18" font-weight="800" fill="#FFB300">{keyA ?? '—'} ➔ {keyB ?? '—'}</text>
        {#if isMatch}
          <text x={CX} y={CY + 26} text-anchor="middle" font-size="10" font-weight="800" fill="#00E676" class="match-label">MATCH PARFAIT</text>
        {/if}
      {/if}
    </svg>
  </div>

  {#if !isIdle}
  <div class="wheel-legend" data-testid="wheel-legend">
    {#if keyA}
      <div class="legend-item master">
        <span class="dot dot-a" aria-hidden="true"></span>
        <span class="label">🟡 PISTE A (MASTER) : <strong>{keyA}</strong></span>
      </div>
    {/if}
    {#if keyB}
      <div class="legend-item candidate">
        <span class="dot dot-b" aria-hidden="true"></span>
        <span class="label">🟢 PISTE B (CANDIDATE) : <strong>{keyB}</strong></span>
      </div>
    {/if}
  </div>
  {/if}
</div>

<style>
  .camelot-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: auto;
    flex-shrink: 0;
  }

  .wheel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    flex-wrap: wrap;
  }

  .icon {
    font-size: 18px;
  }

  .title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #C87D55;
    text-transform: uppercase;
    flex: 1;
    min-width: 0;
  }

  /* Sélecteur de notation (codes / notes / double) */
  .notation-switch {
    display: inline-flex;
    background: #090A0D;
    border: 1px solid #3A2218;
    border-radius: 14px;
    padding: 2px;
    gap: 2px;
  }

  .notation-opt {
    border: none;
    background: transparent;
    color: #8A93A8;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .notation-opt:hover {
    color: #E0E6ED;
  }

  .notation-opt.active {
    background: linear-gradient(180deg, #E0B88A 0%, #C87D55 60%, #B06A43 100%);
    color: #121316;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 8px rgba(200, 125, 85, 0.6);
  }

  /* Le SVG occupe 100 % de la largeur/hauteur du conteneur (cadran 432×432, soit 90 % de l'ancienne taille 484) */
  .svg-container {
    width: 100%;
    max-width: 432px;
    height: 432px;
    aspect-ratio: 1 / 1;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto;
    flex-shrink: 0;
  }

  .camelot-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    max-width: 432px;
    max-height: 432px;
  }

  /* Surlignage de la tonalité active + lueur sur les 4 clés compatibles */
  .node-b circle {
    filter: drop-shadow(0 0 8px rgba(0, 230, 118, 0.9));
  }

  .node-a circle {
    filter: drop-shadow(0 0 7px rgba(255, 179, 0, 0.85));
  }

  .node-compat circle {
    filter: drop-shadow(0 0 7px rgba(41, 182, 246, 0.85));
  }

  /* Arc de connexion lumineux clé A ➔ clé B */
  .link-arc {
    stroke-width: 4;
    stroke-linecap: round;
    filter: drop-shadow(0 0 6px rgba(255, 179, 0, 0.9)) drop-shadow(0 0 6px rgba(0, 230, 118, 0.7));
  }

  .link-arc-halo {
    stroke: url(#gradAB);
    stroke-width: 11;
    stroke-linecap: round;
    opacity: 0.25;
  }

  /* Anneau « match parfait » quand clé A = clé B */
  .match-ring {
    stroke-width: 3.5;
    stroke-dasharray: 6 5;
    filter: drop-shadow(0 0 8px rgba(255, 179, 0, 0.9)) drop-shadow(0 0 8px rgba(0, 230, 118, 0.8));
    animation: spinRing 9s linear infinite;
    transform-origin: center;
  }

  /* État neutre (aucune clé) : cercle vert tournant autour de la roue */
  .idle-ring {
    filter: drop-shadow(0 0 8px rgba(0, 230, 118, 0.9));
    animation: spinRing 9s linear infinite;
    transform-origin: center;
  }

  @keyframes spinRing {
    to { transform: rotate(360deg); }
  }

  .match-label {
    text-shadow: 0 0 8px rgba(0, 230, 118, 0.8);
    letter-spacing: 1px;
  }

  /* Badges de piste A (or) / B (émeraude) sur les segments actifs */
  .badge-circle-a {
    fill: #121316;
    stroke: #FFB300;
    stroke-width: 2;
    filter: drop-shadow(0 0 5px rgba(255, 179, 0, 0.9));
  }

  .badge-text-a {
    fill: #FFB300;
  }

  .badge-circle-b {
    fill: #121316;
    stroke: #00E676;
    stroke-width: 2;
    filter: drop-shadow(0 0 5px rgba(0, 230, 118, 0.9));
  }

  .badge-text-b {
    fill: #00E676;
  }

  .badge-circle-ab {
    fill: #121316;
    stroke: url(#gradAB);
    stroke-width: 2;
    filter: drop-shadow(0 0 5px rgba(255, 179, 0, 0.8)) drop-shadow(0 0 5px rgba(0, 230, 118, 0.7));
  }

  .badge-text-ab {
    fill: #FFE082;
  }

  .wheel-legend {
    display: flex;
    justify-content: space-around;
    width: 100%;
    background: #121316;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #2D3039;
    box-sizing: border-box;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .dot-a {
    background: #FFB300;
    box-shadow: 0 0 8px rgba(255, 179, 0, 0.8);
  }

  .dot-b {
    background: #00E676;
    box-shadow: 0 0 8px rgba(0, 230, 118, 0.8);
  }

  .label {
    color: #CBD5E1;
  }

  .label strong {
    color: #FFF;
  }
</style>
