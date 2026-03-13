(function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for(let registration of registrations) {
        registration.unregister().then(success => {
          if (success) console.log('SW unregistered');
        });
      }
    });
  }
  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) caches.delete(name);
    });
  }
  console.log('Cleanup script executed');
})();
