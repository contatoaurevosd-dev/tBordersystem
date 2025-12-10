import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseExitConfirmationOptions {
  enabled?: boolean;
  redirectTo?: string;
}

export function useExitConfirmation({ enabled = true, redirectTo = '/' }: UseExitConfirmationOptions = {}) {
  const navigate = useNavigate();
  const [exitConfirmModalOpen, setExitConfirmModalOpen] = useState(false);

  const handleBackNavigation = useCallback(() => {
    if (enabled) {
      setExitConfirmModalOpen(true);
    } else {
      navigate(redirectTo);
    }
  }, [enabled, navigate, redirectTo]);

  const handleConfirmExit = useCallback(() => {
    setExitConfirmModalOpen(false);
    navigate(redirectTo);
  }, [navigate, redirectTo]);

  const handleCancelExit = useCallback(() => {
    setExitConfirmModalOpen(false);
  }, []);

  // Intercept browser back button and hardware back button
  useEffect(() => {
    if (!enabled) return;

    // Push a dummy state to history to intercept back navigation
    window.history.pushState({ preventBack: true }, '');

    const handlePopState = () => {
      // Prevent the default back navigation
      window.history.pushState({ preventBack: true }, '');
      setExitConfirmModalOpen(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled]);

  return {
    exitConfirmModalOpen,
    handleBackNavigation,
    handleConfirmExit,
    handleCancelExit,
    setExitConfirmModalOpen,
  };
}
