import { createContext, useContext, useState, useCallback, useRef } from 'react';

const LogContext = createContext();

export function LogProvider({ children, consoleLogging = true }) {
  const [logs, setLogs] = useState([]);
  const loggingRef = useRef(consoleLogging);
  loggingRef.current = consoleLogging;

  const addLog = useCallback((label, msg, type = 'info') => {
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [...prev, { label, msg: String(msg), type, time }]);
    if (loggingRef.current) {
      const logFn =
        type === 'error' ? console.error : type === 'success' ? console.info : console.log;
      logFn(`[${label}] ${msg}`);
    }
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogger() {
  return useContext(LogContext);
}
