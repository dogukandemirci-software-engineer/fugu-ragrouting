import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

const CRISP_WEBSITE_ID = (import.meta as any).env?.VITE_CRISP_WEBSITE_ID as string | undefined;

// Loads the Crisp chat widget once per page session. No-op if unconfigured,
// so support chat degrades gracefully instead of showing a broken widget.
export function CrispChat() {
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || window.$crisp) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}

// eslint-disable-next-line react-refresh/only-export-components -- small helper module, not worth splitting
export function openCrispChat() {
  if (window.$crisp) {
    window.$crisp.push(['do', 'chat:open']);
  }
}

export const isCrispConfigured = !!CRISP_WEBSITE_ID;
