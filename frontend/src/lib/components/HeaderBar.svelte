<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
  import logoUrl from '../../../../Assets/Alchemix_Logo.png';

  let { appTitle = 'AlcheMix Studio' } = $props();

  const modules = [
    { label: 'MODULE 1: CADRAN CAMELOT', active: true },
    { label: 'MODULE 2: DÉMIXAGE IA', active: false },
    { label: 'MODULE 3: WARPING & MASHUP', active: false },
    { label: 'MODULE 4: MASTERING', active: false }
  ];

  async function handleQuitAndClean() {
    try {
      await invoke('clean_cache');
    } catch (err) {
      console.warn('Nettoyage du cache indisponible:', err);
    }
    try {
      await WebviewWindow.getCurrent()?.close();
    } catch (err) {
      console.warn('Fermeture de la fenêtre impossible:', err);
    }
  }
</script>

<header class="header-bar w-full z-50 bg-bg-panel-header/95 backdrop-blur-md border-b border-border-copper shadow-[0_4px_20px_rgba(0,0,0,0.85)] shrink-0">
  <div class="h-14 w-full px-gutter flex items-center justify-between gap-space-md">
    <!-- Marque & emblème -->
    <div class="header-brand flex items-center gap-space-sm shrink-0">
      <div class="p-[1px] bg-gradient-to-b from-border-copper-light to-border-copper rounded">
        <img
          src={logoUrl}
          alt="AlcheMix Studio Emblem"
          class="header-logo h-8 w-auto object-contain block"
          onerror={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      </div>
      <div class="flex flex-col justify-center">
        <div class="flex items-center gap-space-xs">
          <span class="title-main font-headline-sm text-headline-sm text-primary tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {appTitle}
          </span>
          <span class="font-label-sm text-label-sm px-1 py-0.5 rounded bg-surface-container-highest text-text-copper border border-border-copper">MK-IV</span>
        </div>
        <span class="title-sub font-label-sm text-label-sm text-text-copper tracking-widest uppercase">
          MODULE 1 // HARMONIC ENGINE &amp; CAMELOT WHEEL
        </span>
      </div>
    </div>

    <!-- Navigation des modules -->
    <nav class="hidden lg:flex items-center h-full gap-space-xs">
      {#each modules as mod}
        {#if mod.active}
          <a
            aria-current="page"
            class="h-full flex items-center px-space-md font-title-md text-title-md tracking-wider transition-all bg-surface-container text-accent-amber-master border-b-2 border-accent-amber-master"
            href="#module-1"
          >
            {mod.label}
          </a>
        {:else}
          <a
            class="h-full flex items-center px-space-md font-label-lg text-label-lg tracking-wider text-outline cursor-not-allowed opacity-50"
            aria-disabled="true"
            href="#verrouille"
          >
            {mod.label}
          </a>
        {/if}
      {/each}
    </nav>

    <!-- Quitter & nettoyer -->
    <div class="header-status flex items-center gap-space-sm shrink-0">
      <button
        type="button"
        data-testid="quit-clean"
        onclick={handleQuitAndClean}
        title="Quitter & nettoyer le cache"
        class="group relative flex items-center gap-space-sm px-space-md py-1.5 rounded bg-gradient-to-b from-[#8C4A27] to-[#542101] border border-border-copper-light shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_#E69D75] hover:brightness-110 active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] transition-all cursor-pointer"
      >
        <span class="quit-led w-2 h-2 rounded-full bg-status-destructive animate-ruby-blink"></span>
        <span class="quit-label font-label-md text-label-md text-primary tracking-wider uppercase font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
          QUITTER &amp; NETTOYER LE CACHE
        </span>
      </button>

      <div class="w-8 h-8 rounded-full bg-primary hidden md:flex items-center justify-center shrink-0 border border-border-copper-light shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
        <span class="text-on-primary text-[14px] leading-none" aria-hidden="true">⚙</span>
      </div>
    </div>
  </div>
</header>
