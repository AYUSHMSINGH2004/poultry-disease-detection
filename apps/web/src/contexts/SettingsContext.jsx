import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [serverUrl, setServerUrlState] = useState(() => {
    const saved = localStorage.getItem('fastapi_server_url');
    return saved || 'http://0.0.0.0:8000';
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    localStorage.setItem('fastapi_server_url', serverUrl);
  }, [serverUrl]);

  const setServerUrl = (url) => {
    setServerUrlState(url);
  };

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverUrl}/`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setIsConnected(response.ok);
      return response.ok;
    } catch (error) {
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, [serverUrl]);

  const value = {
    serverUrl,
    setServerUrl,
    isConnected,
    isChecking,
    checkConnection
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};