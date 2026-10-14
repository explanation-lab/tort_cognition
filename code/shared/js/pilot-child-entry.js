/* Standalone participant task only. No researcher controls or platform submission. */
(() => {
  globalThis.TORT_LOCAL_OPTIONS = {
    review: false,
    mute: false,
    onAudioBlocked(display, resume) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'enable-study-sound';
      button.textContent = 'Enable sound';
      button.addEventListener('click', () => {
        button.disabled = true;
        resume().finally(() => { button.disabled = false; });
      });
      display.querySelector('.pilot').append(button);
      return () => button.remove();
    }
  };
})();
