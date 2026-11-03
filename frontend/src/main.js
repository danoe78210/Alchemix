/**
 * AlcheMix Studio — Point d'entrée Vite du front-end.
 * Monte la vue Module 1 (Svelte 5) dans l'élément #app.
 */
import './app.css';
import '$lib/styles/venetian-steampunk.css';
import { mount } from 'svelte';
import Module1View from '$lib/views/Module1View.svelte';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Élément #app introuvable dans frontend/index.html');
}

try {
  mount(Module1View, { target: app });
} catch (error) {
  // Empêche l'écran noir silencieux si le montage du composant échoue
  app.removeAttribute('style');
  app.innerHTML = `
    <div style="padding: 24px 32px; color: #FF4747; background: #121316;
      font-family: 'Consolas', 'Courier New', monospace; font-size: 0.85rem;
      border: 1px solid #FF4747; border-radius: 6px; max-width: 640px;
      margin: 40px auto;">
      <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em;
        margin-bottom: 8px;">AlcheMix Studio — erreur de rendu Module 1</div>
      <div style="white-space: pre-wrap; font-size: 0.8rem; line-height: 1.5;">
        ${String(error.message ?? error)}
      </div>
    </div>
  `;
  console.error('AlcheMix: montage de Module1View échoué', error);
  throw error;
}
