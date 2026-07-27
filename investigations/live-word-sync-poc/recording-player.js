const player = document.querySelector('#recording-player');
const status = document.querySelector('#recording-status');
const query = new URLSearchParams(location.search);
const recording = query.get('name');
const fallback = query.get('fallback');

function artifactUrl(name) {
  return `/runs/artifact?name=${encodeURIComponent(name)}`;
}

if (!recording) {
  status.textContent = 'No recording was selected.';
} else {
  let usingFallback = false;
  player.src = artifactUrl(recording);
  player.addEventListener('loadedmetadata', () => {
    const seconds = Number.isFinite(player.duration)
      ? `${player.duration.toFixed(1)} seconds`
      : 'live';
    status.textContent = `${usingFallback ? 'WebM fallback' : 'MP4'} ready · ${seconds} · use the play control to hear it.`;
  });
  player.addEventListener('error', () => {
    if (fallback && !usingFallback) {
      usingFallback = true;
      status.textContent = 'MP4 was unavailable in this browser; loading the original WebM…';
      player.src = artifactUrl(fallback);
      player.load();
      return;
    }
    status.textContent = `Playback failed: ${player.error?.message || 'the browser rejected this recording.'}`;
  });
}
