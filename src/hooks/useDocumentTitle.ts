// ============================================================
// hooks/useDocumentTitle.ts — Dynamic browser tab title hook
// ============================================================
import { useEffect } from 'react';

const APP_NAME = 'UnBoxed Learning';

export function useDocumentTitle(pageTitle?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = prev;
    };
  }, [pageTitle]);
}
