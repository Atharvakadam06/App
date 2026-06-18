import { createContext, useContext, useState, useCallback } from 'react';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [hideMobileNav, setHideMobileNav] = useState(false);

  const setMobileNavHidden = useCallback((hidden) => {
    setHideMobileNav(hidden);
  }, []);

  return (
    <LayoutContext.Provider value={{ hideMobileNav, setMobileNavHidden }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}

export default LayoutContext;
