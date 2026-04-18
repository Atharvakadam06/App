import { createContext, useContext } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export default ToastContext;
