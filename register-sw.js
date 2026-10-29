
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register("/Image_app_dev/sw.js", { scope: "/Image_app_dev/" })
      .catch(error => console.warn('Offline support is unavailable:', error));
  });
}
