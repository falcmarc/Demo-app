// src/lib/device.js
// Rileva se sei su mobile o desktop e aggiunge una classe a <html>

export function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

export function applyPlatformClass() {
  document.documentElement.classList.remove('is-mobile','is-desktop');
  document.documentElement.classList.add(isMobile() ? 'is-mobile' : 'is-desktop');
}

window.addEventListener('resize', applyPlatformClass);
applyPlatformClass();
