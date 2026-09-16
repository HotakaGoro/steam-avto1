const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('steamBot', {
  // Управление аккаунтами
  createAccount: (data) => ipcRenderer.invoke('create-account', data),
  deleteAccount: (accountId) => ipcRenderer.invoke('delete-account', accountId),
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  updateSettings: (accountId, settings) => ipcRenderer.invoke('update-settings', accountId, settings),
  renameAccount: (accountId, name) => ipcRenderer.invoke('rename-account', accountId, name),
  getSettings: (accountId) => ipcRenderer.invoke('get-settings', accountId),
  
  // Авторизация
  login: (accountId, credentials) => ipcRenderer.invoke('steam-login', { accountId, ...credentials }),
  logout: (accountId) => ipcRenderer.invoke('steam-logout', accountId),
  steamGuardResponse: (accountId, steamGuardCode) => ipcRenderer.invoke('steam-guard-response', { accountId, steamGuardCode }),
  
  // Бот друзей
  startFriendBot: (accountId, settings) => ipcRenderer.invoke('start-friend-bot', accountId, settings),
  stopFriendBot: (accountId) => ipcRenderer.invoke('stop-friend-bot', accountId),
  
  // Фарм часов
  startHourFarm: (accountId, games) => ipcRenderer.invoke('start-hour-farm', accountId, games),
  stopHourFarm: (accountId) => ipcRenderer.invoke('stop-hour-farm', accountId),
  
  // Приглашение друзей в группу
  getFriendsList: (accountId) => ipcRenderer.invoke('get-friends-list', accountId),
  inviteFriendsToGroup: (accountId, groupId, steamIds) => 
    ipcRenderer.invoke('invite-friends-to-group', accountId, groupId, steamIds),
  
  // Рассылка сообщений друзьям
  sendCommentToFriends: (accountId, message, delaySec, targetSteamIds = null) => 
    ipcRenderer.invoke('send-comment-to-friends', accountId, message, delaySec, targetSteamIds),
  
  // Рассылка комментариев на профили
  sendCommentToProfiles: (accountId, comment, delaySec) => 
    ipcRenderer.invoke('send-comment-to-profiles', accountId, comment, delaySec),
  
  // Производительность
  getPerformanceMode: () => ipcRenderer.invoke('get-performance-mode'),
  setPerformanceMode: (mode) => ipcRenderer.invoke('set-performance-mode', mode),
  onPerformanceModeChanged: (callback) => {
    ipcRenderer.on('performance-mode-changed', (event, data) => callback(data));
  },
  
  // Окно
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  
  // Слушатели событий
  onLog: (callback) => {
    ipcRenderer.on('bot-log', (event, data) => callback(data));
  },
  onStats: (callback) => {
    ipcRenderer.on('bot-stats', (event, data) => callback(data));
  },
  onAccountUpdate: (callback) => {
    ipcRenderer.on('account-update', (event, data) => callback(data));
  },
  onBroadcastProgress: (callback) => {
    ipcRenderer.on('broadcast-progress', (event, data) => callback(data));
  },
  onInviteProgress: (callback) => {
    ipcRenderer.on('invite-progress', (event, data) => callback(data));
  },
  pauseBroadcast: (accountId) => ipcRenderer.invoke('pause-broadcast', accountId),
  resumeBroadcast: (accountId) => ipcRenderer.invoke('resume-broadcast', accountId),
  stopBroadcast: (accountId) => ipcRenderer.invoke('stop-broadcast', accountId),
  pauseInvite: (accountId) => ipcRenderer.invoke('pause-invite', accountId),
  resumeInvite: (accountId) => ipcRenderer.invoke('resume-invite', accountId),
  stopInvite: (accountId) => ipcRenderer.invoke('stop-invite', accountId),
  onSteamGuardRequest: (callback) => {
    ipcRenderer.on('steam-guard-request', (event, data) => callback(data));
  },

  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
