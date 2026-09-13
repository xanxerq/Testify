import React, { createContext, useContext, useState, useEffect } from 'react';

interface PdcContextType {
  isPdcActive: boolean;
  setPdcActive: (active: boolean) => void;
  togglePdc: () => void;
  isEasyReading: boolean;
  setIsEasyReading: (val: boolean) => void;
  toggleEasyReading: () => void;
  isPdcInfoModalOpen: boolean;
  openPdcInfoModal: () => void;
  closePdcInfoModal: () => void;
  pdcToastMessage: string | null;
  dismissPdcToast: () => void;
}

const PdcContext = createContext<PdcContextType | undefined>(undefined);

export const PdcProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPdcActive, setIsPdcActiveState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('testify_pdc_active') === 'true';
    } catch {
      return false;
    }
  });

  const [isEasyReading, setIsEasyReadingState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('testify_easy_reading') === 'true';
    } catch {
      return false;
    }
  });

  const [isPdcInfoModalOpen, setIsPdcInfoModalOpen] = useState(false);
  const [pdcToastMessage, setPdcToastMessage] = useState<string | null>(null);

  const setPdcActive = (active: boolean) => {
    setIsPdcActiveState(active);
    try {
      localStorage.setItem('testify_pdc_active', active ? 'true' : 'false');
    } catch {}
    if (active) {
      setPdcToastMessage('Adaptación PDC activada. Exclusivo para Educación Secundaria Obligatoria (ESO).');
      // Auto-hide toast after 6 seconds
      setTimeout(() => {
        setPdcToastMessage(null);
      }, 6000);
    } else {
      setPdcToastMessage(null);
    }
  };

  const togglePdc = () => {
    setPdcActive(!isPdcActive);
  };

  const dismissPdcToast = () => {
    setPdcToastMessage(null);
  };

  const setIsEasyReading = (val: boolean) => {
    setIsEasyReadingState(val);
    try {
      localStorage.setItem('testify_easy_reading', val ? 'true' : 'false');
    } catch {}
  };

  const toggleEasyReading = () => {
    setIsEasyReading(!isEasyReading);
  };

  const openPdcInfoModal = () => setIsPdcInfoModalOpen(true);
  const closePdcInfoModal = () => setIsPdcInfoModalOpen(false);

  // Apply easy-reading font class to root container if active
  useEffect(() => {
    const root = document.documentElement;
    if (isEasyReading) {
      root.classList.add('pdc-easy-reading');
    } else {
      root.classList.remove('pdc-easy-reading');
    }
  }, [isEasyReading]);

  return (
    <PdcContext.Provider
      value={{
        isPdcActive,
        setPdcActive,
        togglePdc,
        isEasyReading,
        setIsEasyReading,
        toggleEasyReading,
        isPdcInfoModalOpen,
        openPdcInfoModal,
        closePdcInfoModal,
        pdcToastMessage,
        dismissPdcToast,
      }}
    >
      {children}
    </PdcContext.Provider>
  );
};

export function usePdc(): PdcContextType {
  const context = useContext(PdcContext);
  if (!context) {
    // Fallback if used outside provider
    return {
      isPdcActive: false,
      setPdcActive: () => {},
      togglePdc: () => {},
      isEasyReading: false,
      setIsEasyReading: () => {},
      toggleEasyReading: () => {},
      isPdcInfoModalOpen: false,
      openPdcInfoModal: () => {},
      closePdcInfoModal: () => {},
      pdcToastMessage: null,
      dismissPdcToast: () => {},
    };
  }
  return context;
}
