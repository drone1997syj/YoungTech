let googleScriptPromise = null;

export const loadGoogleIdentityScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google login can only run in the browser.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-google-gis="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Google login script failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleGis = 'true';
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Google login script failed to load.'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
};

export const requestGoogleAccessToken = async (clientId) => {
  const google = await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile',
      callback: (response) => {
        if (response?.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response);
      }
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
};
