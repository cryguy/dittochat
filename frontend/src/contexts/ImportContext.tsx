import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

interface ImportContextType {
  isImportOpen: boolean;
  openImport: () => void;
  closeImport: () => void;
}

const ImportContext = createContext<ImportContextType | null>(null);

export function ImportProvider({ children }: { children: ReactNode }) {
  const [isImportOpen, setIsImportOpen] = useState(false);

  const openImport = () => setIsImportOpen(true);
  const closeImport = () => setIsImportOpen(false);

  return (
    <ImportContext.Provider value={{ isImportOpen, openImport, closeImport }}>
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return context;
}
