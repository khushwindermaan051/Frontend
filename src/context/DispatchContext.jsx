import { createContext, useContext, useState, useCallback } from 'react';

const DispatchContext = createContext(null);

const STORAGE_KEY = 'dispatch_history';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(dispatches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dispatches));
}

export function DispatchProvider({ children }) {
  const [dispatches, setDispatches] = useState(loadFromStorage);

  const addDispatch = useCallback((dispatch) => {
    const entry = {
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      ...dispatch,
    };
    setDispatches((prev) => {
      const updated = [entry, ...prev];
      saveToStorage(updated);
      return updated;
    });
    return entry;
  }, []);

  const getByPlatform = useCallback(
    (slug) => {
      return dispatches.filter((d) => d.platform_slug === slug);
    },
    [dispatches],
  );

  const deleteDispatch = useCallback((id) => {
    setDispatches((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback((slug) => {
    setDispatches((prev) => {
      const updated = slug ? prev.filter((d) => d.platform_slug !== slug) : [];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  return (
    <DispatchContext.Provider
      value={{
        dispatches,
        addDispatch,
        getByPlatform,
        deleteDispatch,
        clearAll,
      }}
    >
      {children}
    </DispatchContext.Provider>
  );
}

export const useDispatch = () => useContext(DispatchContext);
