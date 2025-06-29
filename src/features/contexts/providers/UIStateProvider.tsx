import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ElementPath } from '@/shared/types';

// Define the available interaction modes for the editor
type InteractionMode = 'ask' | 'edit' | 'major';

// Define the shape of the context's data
interface UIStateContextType {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingProject: boolean;
  setIsLoadingProject: React.Dispatch<React.SetStateAction<boolean>>;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileView: boolean;
  setIsMobileView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMode: InteractionMode;
  setSelectedMode: React.Dispatch<React.SetStateAction<InteractionMode>>;
  handleModeChange: (newMode: InteractionMode) => void;
  selectedElementPath: ElementPath | null;
  setSelectedElementPath: React.Dispatch<React.SetStateAction<ElementPath | null>>;
}

// Create the context
const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

// Create the provider component
export const UIStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedMode, setSelectedMode] = useState<InteractionMode>('major');
  const [selectedElementPath, setSelectedElementPath] = useState<ElementPath | null>(null);

  const handleModeChange = (newMode: InteractionMode) => {
    // This logic might need to be expanded later based on hasFirstDraft from another context
    setSelectedMode(newMode);
  };

  const value = {
    isLoading,
    setIsLoading,
    isLoadingProject,
    setIsLoadingProject,
    progress,
    setProgress,
    isDarkMode,
    setIsDarkMode,
    isMobileView,
    setIsMobileView,
    selectedMode,
    setSelectedMode,
    handleModeChange,
    selectedElementPath,
    setSelectedElementPath,
  };

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
};

// Create the custom hook for consuming the context
export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};
