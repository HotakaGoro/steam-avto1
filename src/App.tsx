import { useState, createContext, useContext } from "react";
import Sidebar from "./components/Sidebar";
import AccountsPage from "./pages/AccountsPage";
import HourFarmPage from "./pages/HourFarmPage";
import InviteFriendsPage from "./pages/InviteFriendsPage";
import BroadcastPage from "./pages/BroadcastPage";
import ProfileCommentsPage from "./pages/ProfileCommentsPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import CreatorMemo from "./pages/CreatorMemo";
import { useAccounts } from "./hooks/useAccounts";
import type { AccountInfo, LogEntry } from "./hooks/useElectronAPI";

export type Page = "accounts" | "hourfarm" | "invite" | "broadcast" | "comments" | "logs" | "settings" | "creator";

interface AppContextType {
  accounts: AccountInfo[];
  logs: LogEntry[];
  loading: boolean;
  isRealElectron: boolean;
  [key: string]: any;
}

export const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};

const pages: Record<Page, React.ComponentType> = {
  accounts: AccountsPage,
  hourfarm: HourFarmPage,
  invite: InviteFriendsPage,
  broadcast: BroadcastPage,
  comments: ProfileCommentsPage,
  logs: LogsPage,
  settings: SettingsPage,
  creator: CreatorMemo,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("accounts");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const accountManager = useAccounts();

  const contextValue: AppContextType = {
    ...accountManager,
  };

  const PageComponent = pages[currentPage];

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-screen w-screen overflow-hidden bg-steam-dark">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        <main className="flex-1 overflow-auto">
          <PageComponent />
        </main>

        {!contextValue.isRealElectron && (
          <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-steam-yellow/15 border border-steam-yellow/30 rounded-lg text-xs text-steam-yellow z-50">
            <i className="fas fa-info-circle mr-1" />
            Демо-режим
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
