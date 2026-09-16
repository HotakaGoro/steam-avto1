import { useState, useEffect, useCallback } from "react";
import type { AccountInfo, Friend, LogEntry, InviteProgress, BroadcastProgress } from "./useElectronAPI";

// ============ TYPES ============
export interface SteamBotAPI {
  createAccount: (data: any) => Promise<{ success: boolean; id?: string }>;
  deleteAccount: (id: string) => Promise<{ success: boolean }>;
  getAccounts: () => Promise<AccountInfo[]>;
  updateSettings: (id: string, settings: any) => Promise<{ success: boolean }>;
  renameAccount: (id: string, name: string) => Promise<{ success: boolean }>;
  getSettings: (id: string) => Promise<{ success: boolean; settings?: any; minimums?: any }>;
  login: (id: string, credentials: any) => Promise<{ success: boolean; error?: string }>;
  logout: (id: string) => Promise<{ success: boolean }>;
  steamGuardResponse: (id: string, code: string) => Promise<{ success: boolean; error?: string }>;
  startFriendBot: (id: string, settings?: any) => Promise<{ success: boolean; error?: string }>;
  stopFriendBot: (id: string) => Promise<{ success: boolean }>;
  startHourFarm: (id: string, games?: number[]) => Promise<{ success: boolean; error?: string }>;
  stopHourFarm: (id: string) => Promise<{ success: boolean }>;
  getFriendsList: (id: string) => Promise<{ success: boolean; friends?: Friend[]; error?: string }>;
  inviteFriendsToGroup: (id: string, groupId: string, steamIds: string[]) => Promise<{ success: boolean; results?: any; error?: string }>;
  sendCommentToFriends: (id: string, message: string, delaySec: number, targetSteamIds?: string[]) => Promise<{ success: boolean; results?: any; error?: string }>;
  sendCommentToProfiles: (id: string, comment: string, delaySec: number) => Promise<{ success: boolean; results?: any; error?: string }>;
  pauseBroadcast: (id: string) => Promise<{ success: boolean }>;
  resumeBroadcast: (id: string) => Promise<{ success: boolean }>;
  stopBroadcast: (id: string) => Promise<{ success: boolean }>;
  pauseInvite: (id: string) => Promise<{ success: boolean }>;
  resumeInvite: (id: string) => Promise<{ success: boolean }>;
  stopInvite: (id: string) => Promise<{ success: boolean }>;
  getPerformanceMode: () => Promise<{ mode: string; isUserInGame: boolean; activeBots: number }>;
  setPerformanceMode: (mode: string) => Promise<{ success: boolean; mode?: string }>;
  onPerformanceModeChanged: (callback: (data: { mode: string }) => void) => void;
  hideWindow: () => Promise<{ success: boolean }>;
  showWindow: () => Promise<{ success: boolean }>;
  onLog: (cb: (log: LogEntry) => void) => void;
  onStats: (cb: (stats: any) => void) => void;
  onAccountUpdate: (cb: (update: any) => void) => void;
  onBroadcastProgress: (cb: (progress: BroadcastProgress) => void) => void;
  onInviteProgress: (cb: (progress: InviteProgress) => void) => void;
  onSteamGuardRequest: (cb: (data: { accountId: string; domain: string | null }) => void) => void;
  removeAllListeners: (channel: string) => void;
}

export const isElectron = (): boolean =>
  typeof window !== "undefined" && !!(window as any).steamBot;

export const getSteamBotAPI = (): SteamBotAPI | null =>
  isElectron() ? (window as any).steamBot : null;

// ============ DEMO MODE IMPLEMENTATION ============
function useDemoMode() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inviteProgress, setInviteProgress] = useState<InviteProgress | null>(null);

  const addLog = useCallback((accountId: string, level: LogEntry["level"], message: string) => {
    const log: LogEntry = {
      accountId,
      level,
      message,
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [log, ...prev].slice(0, 500));
  }, []);

  const createAccount = useCallback(async (data: any) => {
    // Если аккаунт временный (не сохранять), не создаём его
    if (data.temporary) {
      return { success: true, id: null };
    }
    
    const newAccount: AccountInfo = {
      id: `acc_${Date.now()}`,
      name: data.name || "Новый аккаунт",
      accountName: data.accountName || "",
      status: "offline",
      friendBotActive: false,
      hourFarmActive: false,
      stats: { requestsSent: 0, messagesSent: 0, friendsAdded: 0, errorsCount: 0 },
      friendsCount: 0,
      hoursFarmed: 0,
      queueLength: 0,
      settings: {
        autoAcceptFriends: true,
        autoMessage: true,
        welcomeMessage: "Привет! 🎮",
        groupId: data.groupId || "",
        friendAcceptDelay: 7,
        messageDelay: 10,
        maxRequestsPerHour: 20,
        maxMessagesPerHour: 50,
        farmGames: [],
      },
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    addLog(newAccount.id, "success", `Аккаунт создан: ${newAccount.name}`);
    return { success: true, id: newAccount.id };
  }, [addLog]);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    addLog(id, "info", "Аккаунт удалён");
    return { success: true };
  }, [addLog]);

  const login = useCallback(async (id: string, credentials: any) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "online" as const } : a))
    );
    addLog(id, "success", "Успешная авторизация в Steam");
    return { success: true };
  }, [addLog]);

  const logout = useCallback(async (id: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: "offline" as const, friendBotActive: false, hourFarmActive: false }
          : a
      )
    );
    addLog(id, "info", "Выход из Steam");
    return { success: true };
  }, [addLog]);

  const steamGuardResponse = useCallback(async (id: string, code: string) => {
    addLog(id, "info", `Steam Guard код отправлен: ${code}`);
    return { success: true };
  }, [addLog]);

  const startFriendBot = useCallback(async (id: string, settings?: any) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, friendBotActive: true } : a))
    );
    addLog(id, "success", "Бот друзей запущен");
    return { success: true };
  }, [addLog]);

  const stopFriendBot = useCallback(async (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, friendBotActive: false } : a))
    );
    addLog(id, "info", "Бот друзей остановлен");
    return { success: true };
  }, [addLog]);

  const startHourFarm = useCallback(async (id: string, games?: number[]) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, hourFarmActive: true } : a))
    );
    addLog(id, "success", `Фарм часов запущен: игры [${games?.join(", ")}]`);
    return { success: true };
  }, [addLog]);

  const stopHourFarm = useCallback(async (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, hourFarmActive: false } : a))
    );
    addLog(id, "info", "Фарм часов остановлен");
    return { success: true };
  }, [addLog]);

  const updateSettings = useCallback(async (id: string, settings: any) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, settings: { ...a.settings, ...settings } } : a
      )
    );
    addLog(id, "info", "Настройки обновлены");
    return { success: true };
  }, [addLog]);

  const getFriendsList = useCallback(async (id: string) => {
    const demoFriends: Friend[] = [
      { steamId: "76561198012345678", name: "Player_228", status: 1 },
      { steamId: "76561198087654321", name: "xXDarkLordXx", status: 3 },
      { steamId: "76561198055551234", name: "CoolGamer99", status: 1 },
      { steamId: "76561198099998765", name: "SteamPro_42", status: 0 },
      { steamId: "76561198011112222", name: "NoobSlayer", status: 2 },
    ];
    return { success: true, friends: demoFriends };
  }, []);

  const inviteFriendsToGroup = useCallback(async (id: string, groupId: string, steamIds: string[]) => {
    addLog(id, "info", `Приглашение ${steamIds.length} друзей в группу ${groupId}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    addLog(id, "success", `Успешно приглашено: ${steamIds.length}`);
    return { success: true, results: { success: steamIds.length, failed: 0, errors: [] } };
  }, [addLog]);

  const sendCommentToFriends = useCallback(async (id: string, message: string, delaySec: number) => {
    const account = accounts.find((a) => a.id === id);
    const total = account?.friendsCount || 10;
    addLog(id, "info", `Начинаем рассылку ${total} друзьям`);
    
    for (let i = 1; i <= total; i++) {
      await new Promise((resolve) => setTimeout(resolve, delaySec * 100));
      addLog(id, "success", `[${i}/${total}] Сообщение отправлено`);
    }
    
    return { success: true, results: { total, success: total, failed: 0, errors: [] } };
  }, [accounts, addLog]);

  const sendCommentToProfiles = useCallback(async (id: string, comment: string, delaySec: number) => {
    const account = accounts.find((a) => a.id === id);
    const total = account?.friendsCount || 10;
    addLog(id, "info", `Начинаем рассылку комментариев на профили ${total} друзьям`);
    
    for (let i = 1; i <= total; i++) {
      await new Promise((resolve) => setTimeout(resolve, delaySec * 100));
      addLog(id, "success", `[${i}/${total}] Комментарий добавлен на профиль`);
    }
    
    return { success: true, results: { total, success: total, failed: 0, errors: [] } };
  }, [accounts, addLog]);

  const getSettings = useCallback(async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    return {
      success: true,
      settings: account?.settings || {},
      minimums: { friendAcceptDelay: 7, messageDelay: 10 },
    };
  }, [accounts]);

  const renameAccount = useCallback(async (id: string, name: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name } : a))
    );
    return { success: true };
  }, []);

  return {
    accounts,
    logs,
    inviteProgress,
    broadcastProgress: null,
    inviteControlState: { isPaused: false, isStopped: false },
    broadcastControlState: { isPaused: false, isStopped: false },
    createAccount,
    deleteAccount,
    login,
    logout,
    steamGuardResponse,
    startFriendBot,
    stopFriendBot,
    startHourFarm,
    stopHourFarm,
    updateSettings,
    getFriendsList,
    inviteFriendsToGroup,
    sendCommentToFriends,
    sendCommentToProfiles,
    pauseBroadcast: async () => ({ success: true }),
    resumeBroadcast: async () => ({ success: true }),
    stopBroadcast: async () => ({ success: true }),
    pauseInvite: async () => ({ success: true }),
    resumeInvite: async () => ({ success: true }),
    stopInvite: async () => ({ success: true }),
    getPerformanceMode: async () => ({ mode: 'normal', isUserInGame: false, activeBots: 0 }),
    setPerformanceMode: async () => ({ success: true }),
    onPerformanceModeChanged: () => {},
    getSettings,
    renameAccount,
  };
}

// ============ MAIN HOOK ============
export function useAccounts() {
  const api = getSteamBotAPI();
  const isRealElectron = isElectron();
  const demoMode = useDemoMode();

  // В Electron режиме используем реальный API
  if (isRealElectron && api) {
    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [inviteProgress, setInviteProgress] = useState<InviteProgress | null>(null);
    const [broadcastProgress, setBroadcastProgress] = useState<BroadcastProgress | null>(null);
    const [inviteControlState, setInviteControlState] = useState<{ isPaused: boolean; isStopped: boolean }>({ isPaused: false, isStopped: false });
    const [broadcastControlState, setBroadcastControlState] = useState<{ isPaused: boolean; isStopped: boolean }>({ isPaused: false, isStopped: false });
    const [loading, setLoading] = useState(true);

    const fetchAccounts = useCallback(async () => {
      try {
        const accs = await api.getAccounts();
        setAccounts(accs);
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      }
      setLoading(false);
    }, [api]);

    useEffect(() => {
      api.onLog((log) => setLogs((prev) => [log, ...prev].slice(0, 500)));

      api.onAccountUpdate((update) => {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === update.id
              ? { ...acc, ...update, status: update.status as any }
              : acc
          )
        );
      });

      api.onInviteProgress((progress) => {
        setInviteProgress(progress);
        // Обновляем состояние управления на основе прогресса
        if (progress.current >= progress.total) {
          setInviteControlState({ isPaused: false, isStopped: true });
        }
      });

      api.onBroadcastProgress((progress) => {
        setBroadcastProgress(progress);
        // Обновляем состояние управления на основе прогресса
        if (progress.current >= progress.total) {
          setBroadcastControlState({ isPaused: false, isStopped: true });
        }
      });

      fetchAccounts();

      return () => {
        api.removeAllListeners("bot-log");
        api.removeAllListeners("account-update");
        api.removeAllListeners("invite-progress");
        api.removeAllListeners("broadcast-progress");
      };
    }, [api, fetchAccounts]);

    return {
      accounts,
      logs,
      inviteProgress,
      broadcastProgress,
      inviteControlState,
      broadcastControlState,
      loading,
      isRealElectron: true,
      fetchAccounts,
      createAccount: async (data: any) => {
        const result = await api.createAccount(data);
        await fetchAccounts();
        return result;
      },
      deleteAccount: async (id: string) => {
        const result = await api.deleteAccount(id);
        await fetchAccounts();
        return result;
      },
      login: (id: string, credentials: any) => api.login(id, credentials),
      logout: (id: string) => api.logout(id),
      steamGuardResponse: (id: string, code: string) => api.steamGuardResponse(id, code),
      startFriendBot: (id: string, settings?: any) => api.startFriendBot(id, settings),
      stopFriendBot: (id: string) => api.stopFriendBot(id),
      startHourFarm: (id: string, games?: number[]) => api.startHourFarm(id, games),
      stopHourFarm: (id: string) => api.stopHourFarm(id),
      getFriendsList: (id: string) => api.getFriendsList(id),
      inviteFriendsToGroup: (id: string, groupId: string, steamIds: string[]) =>
        api.inviteFriendsToGroup(id, groupId, steamIds),
      sendCommentToFriends: (id: string, message: string, delaySec: number) =>
        api.sendCommentToFriends(id, message, delaySec),
      sendCommentToProfiles: (id: string, comment: string, delaySec: number) =>
        api.sendCommentToProfiles(id, comment, delaySec),
      pauseBroadcast: async (id: string) => {
        const result = await api.pauseBroadcast(id);
        setBroadcastControlState({ isPaused: true, isStopped: false });
        return result;
      },
      resumeBroadcast: async (id: string) => {
        const result = await api.resumeBroadcast(id);
        setBroadcastControlState({ isPaused: false, isStopped: false });
        return result;
      },
      stopBroadcast: async (id: string) => {
        const result = await api.stopBroadcast(id);
        setBroadcastControlState({ isPaused: false, isStopped: true });
        setBroadcastProgress(null);
        return result;
      },
      pauseInvite: async (id: string) => {
        const result = await api.pauseInvite(id);
        setInviteControlState({ isPaused: true, isStopped: false });
        return result;
      },
      resumeInvite: async (id: string) => {
        const result = await api.resumeInvite(id);
        setInviteControlState({ isPaused: false, isStopped: false });
        return result;
      },
      stopInvite: async (id: string) => {
        const result = await api.stopInvite(id);
        setInviteControlState({ isPaused: false, isStopped: true });
        setInviteProgress(null);
        return result;
      },
      getPerformanceMode: () => api.getPerformanceMode(),
      setPerformanceMode: (mode: string) => api.setPerformanceMode(mode),
      onPerformanceModeChanged: (callback: (data: { mode: string }) => void) => {
        api.onPerformanceModeChanged(callback);
      },
      updateSettings: (id: string, settings: any) => api.updateSettings(id, settings),
      renameAccount: (id: string, name: string) => api.renameAccount(id, name),
      getSettings: (id: string) => api.getSettings(id),
    };
  }

  // В демо режиме используем локальную логику
  return {
    ...demoMode,
    loading: false,
    isRealElectron: false,
    fetchAccounts: async () => {},
  };
}
