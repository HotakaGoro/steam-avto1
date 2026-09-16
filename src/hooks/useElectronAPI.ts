// ============ TYPES ============
export interface AccountInfo {
  id: string;
  name: string;
  accountName: string;
  status: "online" | "offline" | "connecting" | "error";
  friendBotActive: boolean;
  hourFarmActive: boolean;
  stats: { requestsSent: number; messagesSent: number; friendsAdded: number; errorsCount: number };
  friendsCount: number;
  hoursFarmed: number;
  queueLength?: number;
  settings: AccountSettings;
  createdAt: string;
}

export interface AccountSettings {
  autoAcceptFriends: boolean;
  autoMessage: boolean;
  welcomeMessage: string;
  groupId: string;
  friendAcceptDelay: number;
  messageDelay: number;
  maxRequestsPerHour: number;
  maxMessagesPerHour: number;
  farmGames: number[];
}

export interface Friend {
  steamId: string;
  name: string;
  status: number;
}

export interface LogEntry {
  accountId: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  timestamp: string;
  requiresInput?: boolean;
}

export interface AccountUpdate {
  id: string;
  name: string;
  status: string;
  settings: any;
  friendBotActive: boolean;
  hourFarmActive: boolean;
  stats: any;
  friendsCount: number;
  hoursFarmed: number;
}

export interface BroadcastProgress {
  accountId: string;
  current: number;
  total: number;
  success: number;
  failed: number;
}

export interface InviteProgress {
  accountId: string;
  current: number;
  total: number;
  success: number;
  failed: number;
}

export interface BroadcastState {
  isPaused: boolean;
  isStopped: boolean;
}

export interface InviteState {
  isPaused: boolean;
  isStopped: boolean;
}
