/**
 * Lecteur audio d'une cassette (Deck A ou B) : lecture / arrêt d'un fichier
 * local via HTMLAudioElement. L'élément audio est injectable pour les tests.
 */
export function createDeckPlayer({ onPlayingChange = () => {}, onProgress = () => {}, onTime = () => {}, createAudio = () => new Audio() } = {}) {
  let audio = null;
  let objectUrl = null;

  function release() {
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.ontimeupdate = null;
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function load(file) {
    release();
    if (!(file instanceof Blob)) return;
    objectUrl = URL.createObjectURL(file);
    audio = createAudio();
    audio.src = objectUrl;
    audio.onended = () => {
      onProgress(1);
      onPlayingChange(false);
    };
    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        const ct = audio.currentTime;
        onProgress(ct / audio.duration);
        onTime(ct);
      }
    };
  }

  function play() {
    if (!audio) return;
    const started = audio.play();
    onPlayingChange(true);
    started?.catch(() => onPlayingChange(false));
  }

  function stop() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    onProgress(0);
    onTime(0);
    onPlayingChange(false);
  }

  function dispose() {
    stop();
    release();
  }

  return { load, play, stop, dispose };
}
