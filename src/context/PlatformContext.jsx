import { createContext, useContext } from 'react';

const PlatformContext = createContext(null);

export const usePlatform = () => useContext(PlatformContext);

export default PlatformContext;
