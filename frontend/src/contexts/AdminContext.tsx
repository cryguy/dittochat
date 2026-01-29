import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface AdminContextType {
  isAdminPanelOpen: boolean;
  openAdminPanel: () => void;
  closeAdminPanel: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const openAdminPanel = useCallback(() => {
    setIsAdminPanelOpen(true);
  }, []);

  const closeAdminPanel = useCallback(() => {
    setIsAdminPanelOpen(false);
  }, []);

  return (
    <AdminContext.Provider
      value={{ isAdminPanelOpen, openAdminPanel, closeAdminPanel }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
