<script lang="ts">
  import Module1View from './views/Module1View.svelte';
  import Module2View from './views/Module2View.svelte';

  // Module affiché : 1 (Cadran Camelot) par défaut, 2 (Démixage IA) via l'onglet de l'en-tête.
  let currentModule = $state(1);

  function selectModule(id: number) {
    currentModule = id;
  }
</script>

{#if currentModule === 2}
  <Module2View onSelectModule={selectModule} />
{:else}
  <Module1View onSelectModule={selectModule} />
{/if}
