// Fixed scenes for screenshots: ?shot=cover shows the Vice Grid cover alone,
// ?shot=popout the Pop-Out Hero cover, ?shot=story the Story-size cover, and
// ?shot=slant the Slant Cut cover. The cover fills the viewport; the editor
// chrome is hidden. window.__shotReady is set once the cover has painted.
import { drawCover } from './cover.js';

export async function runShot(shot, query, state, canvas) {
  document.body.classList.add('shot-cover');
  if (shot === 'popout') state.layout = 'popout';
  if (shot === 'story') state.size = 'story';
  if (shot === 'slant') state.layout = 'slant';
  await drawCover(canvas, state);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
