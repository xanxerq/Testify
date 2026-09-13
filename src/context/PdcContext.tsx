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

  const setPdcActive = (active: boolean) => {
    setIsPdcActiveState(active);
    try {
      localStorage.setItem('testify_pdc_active', active ? 'true' : 'false');
    } catch {}
  };

  const togglePdc = () => {
    setPdcActive(!isPdcActive);
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
    };
  }
  return context;
}
