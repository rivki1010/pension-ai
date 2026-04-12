import React, { createContext, useState, useContext, useEffect } from "react";
import { base44, getStoredOpenAIKey } from "@/api/base44Client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const [profiles] = await Promise.all([base44.entities.UserFinancialProfile.list()]);
      const hasApiKey = Boolean(getStoredOpenAIKey().trim());
      const hasProfile = profiles.length > 0;

      setUser({
        id: "local-user",
        role: "user",
        hasApiKey,
        hasProfile,
      });
      setIsAuthenticated(hasApiKey && hasProfile);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: "unknown",
        message: error?.message || "Failed to load local app state",
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    base44.auth.logout();
    checkAppState();
  };

  const navigateToLogin = () => {
    window.location.hash = "#/settings";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};