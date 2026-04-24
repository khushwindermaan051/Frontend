import { createContext, useContext, useState } from 'react';

const UploaderContext = createContext({ navItems: [], setNavItems: () => {} });

export function UploaderProvider({ children }) {
  const [navItems, setNavItems] = useState([]);
  return (
    <UploaderContext.Provider value={{ navItems, setNavItems }}>
      {children}
    </UploaderContext.Provider>
  );
}

export function useUploaderNav() {
  return useContext(UploaderContext);
}
