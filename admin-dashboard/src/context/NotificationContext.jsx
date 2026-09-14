import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={19} color="#10b981" style={{ flexShrink: 0 }} />}
            {toast.type === 'warning' && <AlertTriangle size={19} color="#f59e0b" style={{ flexShrink: 0 }} />}
            {toast.type === 'error' && <AlertCircle size={19} color="#ef4444" style={{ flexShrink: 0 }} />}
            {toast.type === 'info' && <Info size={19} color="#38bdf8" style={{ flexShrink: 0 }} />}
            <span style={{ lineHeight: 1.4 }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
