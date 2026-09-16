const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const SteamUser = require("steam-user");
const SteamCommunity = require("steamcommunity");
const SteamTotp = require("steam-totp");

// ============ STATE ============
let mainWindow = null;
let tray = null;

const ACCOUNTS_FILE = path.join(app.getPath("userData"), "accounts.json");
let accounts = {};
let activeBots = {};

// Control states for broadcast and invite
let broadcastStates = {}; // accountId -> { isPaused, isStopped }
let inviteStates = {}; // accountId -> { isPaused, isStopped }

// Performance optimization
let isUserInGame = false;
let performanceMode = 'normal'; // 'normal' | 'low' | 'minimal'
let lastUIUpdate = 0;
const UI_UPDATE_INTERVAL = {
  normal: 1000,    // 1 second
  low: 3000,       // 3 seconds
  minimal: 10000   // 10 seconds
};

// ============ PERFORMANCE MONITORING ============
function checkIfUserInGame() {
  try {
    // Check if any bot has user in game
    for (const accountId in activeBots) {
      const bot = activeBots[accountId];
      if (bot && bot.user && bot.user.personaStates) {
        const ownState = bot.user.personaStates[bot.user.steamID?.toString()];
        if (ownState && ownState.game_name) {
          return true;
        }
      }
    }
    return false;
  } catch (err) {
    log('debug', 'Error checking game status', { error: err.message });
    return false;
  }
}

function updatePerformanceMode() {
  const wasInGame = isUserInGame;
  isUserInGame = checkIfUserInGame();
  
  if (isUserInGame && !wasInGame) {
    performanceMode = 'minimal';
    updateMemoryCheckInterval();
    log('info', 'User in game - switching to minimal performance mode');
    sendToRenderer('performance-mode-changed', { mode: 'minimal' }, true);
  } else if (!isUserInGame && wasInGame) {
    performanceMode = 'normal';
    updateMemoryCheckInterval();
    log('info', 'User not in game - switching to normal performance mode');
    sendToRenderer('performance-mode-changed', { mode: 'normal' }, true);
  }
}

function shouldUpdateUI() {
  const now = Date.now();
  const interval = UI_UPDATE_INTERVAL[performanceMode];
  if (now - lastUIUpdate >= interval) {
    lastUIUpdate = now;
    return true;
  }
  return false;
}

// Check game status every 5 seconds
setInterval(updatePerformanceMode, 5000);

// ============ LOGGING ============
const LOG_FILE = path.join(app.getPath("userData"), "bot.log");

function log(level, message, data = null) {
  // Skip debug logs in minimal performance mode
  if (performanceMode === 'minimal' && level === 'debug') {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Console output with colors
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    warn: '\x1b[33m',    // yellow
    error: '\x1b[31m',   // red
    debug: '\x1b[90m',   // gray
  };
  const reset = '\x1b[0m';
  
  // Only log to console if not in minimal mode (except errors)
  if (performanceMode !== 'minimal' || level === 'error') {
    console.log(`${colors[level] || ''}${logMessage}${reset}`);
    if (data && performanceMode !== 'minimal') {
      console.log(`${colors[level] || ''}  -> ${JSON.stringify(data, null, 2)}${reset}`);
    }
  }
  
  // Write to file (UTF-8) with size limit
  try {
    // Check file size before writing
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB limit
      
      if (stats.size > MAX_LOG_SIZE) {
        // Rotate log file - keep only last 5 MB
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.split('\n');
        const keepLines = lines.slice(-5000); // Keep last 5000 lines
        fs.writeFileSync(LOG_FILE, keepLines.join('\n'), 'utf8');
        log('info', 'Log file rotated due to size limit');
      }
    }
    
    fs.appendFileSync(LOG_FILE, `${logMessage}${data ? '\n  -> ' + JSON.stringify(data) : ''}\n`, 'utf8');
  } catch (err) {
    // Ignore log write errors
  }
}

// Unhandled errors - prevent app crash
process.on('uncaughtException', (err) => {
  log('error', 'Uncaught exception', { message: err.message, stack: err.stack });
  // Don't exit, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled rejection', { reason: reason?.message || reason });
  // Don't exit, just log the error
});

// Memory management - periodic cleanup
let memoryCheckInterval = 5 * 60 * 1000; // 5 minutes default

function startMemoryMonitoring() {
  setInterval(() => {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        log('debug', 'Garbage collection triggered');
      }
      
      // Log memory usage
      const memUsage = process.memoryUsage();
      log('debug', 'Memory usage', {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        activeBots: Object.keys(activeBots).length,
        performanceMode: performanceMode
      });
    } catch (err) {
      // Ignore errors in cleanup
    }
  }, memoryCheckInterval);
}

// Adjust memory check interval based on performance mode
function updateMemoryCheckInterval() {
  if (performanceMode === 'minimal') {
    memoryCheckInterval = 15 * 60 * 1000; // 15 minutes
  } else if (performanceMode === 'low') {
    memoryCheckInterval = 10 * 60 * 1000; // 10 minutes
  } else {
    memoryCheckInterval = 5 * 60 * 1000; // 5 minutes
  }
}

startMemoryMonitoring();

// ============ MINIMUM DELAYS (seconds) ============
const MIN_FRIEND_ACCEPT_DELAY = 7;
const MIN_MESSAGE_DELAY = 10;

// ============ PERSISTENCE ============
function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      
      // Clean phantom accounts
      accounts = {};
      for (const [id, acc] of Object.entries(parsed)) {
        if (acc.accountName && acc.password) {
          accounts[id] = acc;
        }
      }
      
      if (Object.keys(accounts).length !== Object.keys(parsed).length) {
        saveAccounts();
        log('info', `Cleaned ${Object.keys(parsed).length - Object.keys(accounts).length} phantom accounts`);
      }
      
      log('info', `Loaded ${Object.keys(accounts).length} accounts from ${ACCOUNTS_FILE}`);
    } else {
      log('info', 'Accounts file not found, starting with empty list');
      accounts = {};
    }
  } catch (err) {
    log('error', 'Failed to load accounts', { error: err.message });
    accounts = {};
  }
}

function saveAccounts() {
  try {
    const dir = path.dirname(ACCOUNTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
    log('debug', 'Accounts saved');
  } catch (err) {
    log('error', 'Failed to save accounts', { error: err.message });
  }
}

// ============ WINDOW ============
function createWindow() {
  log('info', 'Creating application window...');
  
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Steam-avto",
    icon: path.join(__dirname, "tray-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0a0e17",
    show: false,
  });

  const indexPath = path.join(__dirname, "dist", "index.html");
  
  if (!fs.existsSync(indexPath)) {
    log('error', 'index.html not found', { path: indexPath });
    log('error', 'Please run "npm run build" first');
  } else {
    log('debug', 'index.html found', { path: indexPath });
  }

  mainWindow.loadFile(indexPath);
  
  mainWindow.once("ready-to-show", () => {
    log('success', 'Window ready to show');
    mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    log('error', 'Failed to load page', { errorCode, errorDescription });
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log('success', 'Page loaded successfully');
  });

  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    log('debug', `[Renderer] ${message}`);
  });

  mainWindow.webContents.on('crashed', () => {
    log('error', 'Renderer process crashed!');
  });
  
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      log('info', 'Application closing...');
      app.quit();
    }
  });

  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    mainWindow.hide();
    log('info', 'Window minimized to tray');
  });
}

// ============ TRAY ============
function createTray() {
  log('info', 'Creating system tray...');
  try {
    const iconPath = path.join(__dirname, "tray-icon.png");
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
    } else {
      const icon = nativeImage.createFromDataURL(
        "image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAQklEQVQ4T2P8z8BQz0BAwMBAAGBhYPj/n4EBhRkZGRkYGBj+M6DwGZAVMDIwMDAwMjAwMKAzYDgYNYDBkBEBAABR4A0JrF3JhQAAAABJRU5ErkJggg=="
      );
      tray = new Tray(icon);
    }
  } catch {
    tray = null;
  }
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Panel", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    { label: "Stop All Bots", click: () => stopAllBots() },
    { type: "separator" },
    { label: "Exit", click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setToolTip("Steam-avto");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ============ HELPERS ============
function sendToRenderer(channel, data, forceUpdate = false) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Skip non-critical updates in low performance mode
    if (!forceUpdate && performanceMode === 'minimal' && 
        !['performance-mode-changed', 'account-update'].includes(channel)) {
      return;
    }
    
    // Throttle UI updates
    if (!forceUpdate && !shouldUpdateUI() && channel !== 'account-update') {
      return;
    }
    
    mainWindow.webContents.send(channel, data);
  }
}

function sendLog(accountId, level, message) {
  const accountName = accounts[accountId]?.accountName || accountId;
  
  // Skip debug logs in minimal mode
  if (performanceMode === 'minimal' && level === 'debug') {
    return;
  }
  
  log(level, `[${accountName}] ${message}`);
  
  // Throttle log updates to UI
  if (shouldUpdateUI() || level === 'error' || level === 'success') {
    sendToRenderer("bot-log", { accountId, level, message, timestamp: new Date().toISOString() });
  }
}

function sendAccountUpdate(accountId) {
  const account = accounts[accountId];
  const bot = activeBots[accountId];
  if (!account) return;
  
  // Always send account updates (critical for UI state)
  sendToRenderer("account-update", {
    id: accountId,
    name: account.name,
    status: bot?.status || "offline",
    settings: account.settings,
    friendBotActive: bot?.friendBotActive || false,
    hourFarmActive: bot?.hourFarmActive || false,
    stats: bot?.stats || {},
    friendsCount: bot?.friendsCount || 0,
    hoursFarmed: bot?.hoursFarmed || 0,
    queueLength: bot?.pendingFriends?.length || 0,
  }, true); // forceUpdate = true
}

// ============ DEFAULT SETTINGS ============
function getDefaultSettings() {
  return {
    autoAcceptFriends: true,
    autoMessage: true,
    welcomeMessage: "Hello! Glad to be your friend",
    groupId: "",
    friendAcceptDelay: MIN_FRIEND_ACCEPT_DELAY,
    messageDelay: MIN_MESSAGE_DELAY,
    maxRequestsPerHour: 20,
    maxMessagesPerHour: 50,
    farmGames: [],
  };
}

// ============ ACCOUNT MANAGEMENT ============
function generateId() {
  return "acc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

ipcMain.handle("create-account", (event, data) => {
  log('info', 'Creating account', { accountName: data.accountName });
  const id = generateId();
  accounts[id] = {
    id,
    name: data.name || "New Account",
    accountName: data.accountName || "",
    password: data.password || "",
    sharedSecret: data.sharedSecret || "",
    settings: { ...getDefaultSettings(), ...(data.settings || {}) },
    createdAt: new Date().toISOString(),
  };
  saveAccounts();
  sendAccountUpdate(id);
  log('success', 'Account created', { id, accountName: data.accountName });
  return { success: true, id };
});

ipcMain.handle("delete-account", (event, accountId) => {
  log('info', 'Deleting account', { accountId });
  
  // Properly cleanup bot if exists
  if (activeBots[accountId]) {
    log('warn', 'Account is active, performing full cleanup before deletion');
    
    const bot = activeBots[accountId];
    
    // Clear all timers and handlers
    clearBotTimers(accountId);
    
    // Log off and destroy Steam user
    try {
      if (bot.user) {
        bot.user.logOff();
        if (bot.user.destroy) {
          bot.user.destroy();
        }
      }
    } catch (e) {
      log('error', 'Error during account cleanup', { error: e.message });
    }
    
    // Clear references
    bot.user = null;
    bot.community = null;
    
    delete activeBots[accountId];
  }
  
  delete accounts[accountId];
  saveAccounts();
  log('success', 'Account deleted', { accountId });
  return { success: true };
});

ipcMain.handle("get-accounts", () => {
  return Object.values(accounts).map((acc) => {
    const bot = activeBots[acc.id];
    return {
      id: acc.id,
      name: acc.name,
      accountName: acc.accountName,
      status: bot?.status || "offline",
      friendBotActive: bot?.friendBotActive || false,
      hourFarmActive: bot?.hourFarmActive || false,
      stats: bot?.stats || {},
      friendsCount: bot?.friendsCount || 0,
      hoursFarmed: bot?.hoursFarmed || 0,
      queueLength: bot?.pendingFriends?.length || 0,
      settings: acc.settings,
      createdAt: acc.createdAt,
    };
  });
});

ipcMain.handle("update-settings", (event, accountId, settings) => {
  if (!accounts[accountId]) return { success: false, error: "Account not found" };
  if (settings.friendAcceptDelay !== undefined) {
    settings.friendAcceptDelay = Math.max(MIN_FRIEND_ACCEPT_DELAY, settings.friendAcceptDelay);
  }
  if (settings.messageDelay !== undefined) {
    settings.messageDelay = Math.max(MIN_MESSAGE_DELAY, settings.messageDelay);
  }
  accounts[accountId].settings = { ...accounts[accountId].settings, ...settings };
  saveAccounts();
  sendAccountUpdate(accountId);
  return { success: true };
});

ipcMain.handle("rename-account", (event, accountId, name) => {
  if (!accounts[accountId]) return { success: false, error: "Account not found" };
  accounts[accountId].name = name;
  saveAccounts();
  sendAccountUpdate(accountId);
  return { success: true };
});

ipcMain.handle("get-settings", (event, accountId) => {
  if (!accounts[accountId]) return { success: false, error: "Account not found" };
  return {
    success: true,
    settings: accounts[accountId].settings,
    minimums: {
      friendAcceptDelay: MIN_FRIEND_ACCEPT_DELAY,
      messageDelay: MIN_MESSAGE_DELAY,
    },
  };
});

// ============ STEAM LOGIN ============
function initBot(accountId) {
  const account = accounts[accountId];
  if (!account) throw new Error("Account not found");

  log('info', 'Initializing bot', { accountId, accountName: account.accountName });

  // Disable autoRelogin to prevent infinite reconnection loops
  // Disable enablePicsCache to prevent memory leaks
  const user = new SteamUser({ 
    autoRelogin: false,
    enablePicsCache: false,
    promptSteamGuardCode: false
  });
  const community = new SteamCommunity();

  activeBots[accountId] = {
    user,
    community,
    status: "connecting",
    friendBotActive: false,
    hourFarmActive: false,
    currentGames: [],
    stats: { requestsSent: 0, messagesSent: 0, friendsAdded: 0, errorsCount: 0 },
    friendsCount: 0,
    hoursFarmed: 0,
    hourFarmInterval: null,
    steamGuardCallback: null,
    processingTimers: new Map(),
    eventHandlers: [], // Track event handlers for cleanup
  };

  const bot = activeBots[accountId];

  // Helper to track and cleanup event handlers
  const addEventHandler = (event, handler) => {
    user.on(event, handler);
    bot.eventHandlers.push({ event, handler });
  };

  addEventHandler("loggedOn", () => {
    log('success', 'Successfully logged in to Steam', { accountId });
    bot.status = "online";
    sendAccountUpdate(accountId);
    user.setPersona(SteamUser.EPersonaState.Online);
  });

  addEventHandler("steamGuard", (domain, callback) => {
    log('warn', 'Steam Guard code requested', { accountId, domain });
    if (account.sharedSecret) {
      const code = SteamTotp.getAuthCode(account.sharedSecret);
      callback(code);
      log('info', '2FA code generated automatically from sharedSecret');
    } else {
      bot.steamGuardCallback = callback;
      log('warn', 'Manual Steam Guard code input required', { domain });
      sendToRenderer("steam-guard-request", {
        accountId,
        domain,
      });
      sendToRenderer("bot-log", {
        accountId,
        level: "warn",
        message: `Steam Guard code required (${domain || "mobile authenticator"})`,
        timestamp: new Date().toISOString(),
        requiresInput: true,
      });
    }
  });

  addEventHandler("error", (err) => {
    log('error', 'Steam error', { 
      accountId, 
      eresult: err.eresult, 
      message: err.message,
      stack: err.stack 
    });
    bot.status = "error";
    bot.stats.errorsCount++;
    sendAccountUpdate(accountId);
  });

  addEventHandler("disconnected", (eresult, msg) => {
    log('warn', 'Disconnected from Steam', { accountId, eresult, msg });
    bot.status = "offline";
    sendAccountUpdate(accountId);
  });

  addEventHandler("friendsList", () => {
    let count = 0;
    for (const [sid, rel] of Object.entries(user.myFriends)) {
      if (rel === SteamUser.EFriendRelationship.Friend) count++;
    }
    log('info', 'Friends list loaded', { accountId, count });
    bot.friendsCount = count;
    sendAccountUpdate(accountId);
  });

  addEventHandler("friendRelationship", (steamId, relationship) => {
    const sid = steamId.toString();

    if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
      sendLog(accountId, "info", `Incoming friend request from: ${sid}`);

      if (!account.settings.autoAcceptFriends) {
        sendLog(accountId, "info", `Auto-accept disabled - request from ${sid} ignored`);
        return;
      }

      const acceptDelaySec = Math.max(MIN_FRIEND_ACCEPT_DELAY, account.settings.friendAcceptDelay || MIN_FRIEND_ACCEPT_DELAY);
      const acceptDelayMs = acceptDelaySec * 1000;

      sendLog(accountId, "info", `Accepting ${sid} in ${acceptDelaySec} sec...`);

      const acceptTimer = setTimeout(() => {
        try {
          user.addFriend(sid);
          bot.stats.friendsAdded++;
          sendLog(accountId, "success", `Accepted as friend: ${sid}`);
          sendAccountUpdate(accountId);
          schedulePostAcceptActions(accountId, sid);
        } catch (err) {
          sendLog(accountId, "error", `Error accepting ${sid}: ${err.message}`);
        }
        
        // Clean up timer after execution
        bot.processingTimers.delete(sid);
      }, acceptDelayMs);

      // Limit processingTimers size to prevent memory leak
      if (bot.processingTimers.size > 100) {
        const firstKey = bot.processingTimers.keys().next().value;
        const timers = bot.processingTimers.get(firstKey);
        if (timers.acceptTimer) clearTimeout(timers.acceptTimer);
        if (timers.actionTimer) clearTimeout(timers.actionTimer);
        bot.processingTimers.delete(firstKey);
      }

      bot.processingTimers.set(sid, { acceptTimer, actionTimer: null });
    }
  });

  addEventHandler("friendMessage", (senderId, message) => {
    sendLog(accountId, "info", `Message from ${senderId.toString()}: ${message.substring(0, 50)}`);
  });

  user.on("webSession", (sessionId, cookies) => {
    community.setCookies(cookies);
    sendLog(accountId, "info", "Web session established");
  });

  return bot;
}

function schedulePostAcceptActions(accountId, steamId) {
  const account = accounts[accountId];
  const bot = activeBots[accountId];
  if (!bot || !account) return;

  const messageDelaySec = Math.max(MIN_MESSAGE_DELAY, account.settings.messageDelay || MIN_MESSAGE_DELAY);
  const messageDelayMs = messageDelaySec * 1000;

  sendLog(accountId, "info", `Actions for ${steamId} in ${messageDelaySec} sec...`);

  const actionTimer = setTimeout(() => {
    try {
      // Check if bot still exists
      if (!activeBots[accountId]) {
        log('warn', 'Bot no longer exists, skipping post-accept actions', { accountId, steamId });
        return;
      }

      // Group invitation with timeout
      if (account.settings.groupId && account.settings.groupId.trim() !== "") {
        const groupId = account.settings.groupId.trim();
        
        // Add timeout for group invitation
        const inviteTimeout = setTimeout(() => {
          sendLog(accountId, "warn", `Group invitation timeout for ${steamId}`);
        }, 30000); // 30 second timeout
        
        try {
          bot.community.inviteUserToGroup(steamId, groupId, (err) => {
            clearTimeout(inviteTimeout);
            if (err) {
              sendLog(accountId, "error", `Error inviting to group ${groupId}: ${err.message || err}`);
            } else {
              sendLog(accountId, "success", `${steamId} invited to group ${groupId}`);
            }
          });
        } catch (err) {
          clearTimeout(inviteTimeout);
          sendLog(accountId, "error", `Exception inviting to group: ${err.message}`);
        }
      }

      // Send welcome message with error handling
      if (account.settings.autoMessage && account.settings.welcomeMessage) {
        try {
          bot.user.chat.sendFriendMessage(steamId, account.settings.welcomeMessage);
          bot.stats.messagesSent++;
          sendLog(accountId, "success", `Message sent: ${steamId}`);
        } catch (err) {
          sendLog(accountId, "error", `Error sending message to ${steamId}: ${err.message}`);
        }
      }

      sendAccountUpdate(accountId);
    } catch (err) {
      sendLog(accountId, "error", `Error in actions for ${steamId}: ${err.message}`);
    }

    // Clean up timer
    if (bot.processingTimers) {
      bot.processingTimers.delete(steamId);
    }
  }, messageDelayMs);

  // Limit processingTimers size
  if (bot.processingTimers.size > 100) {
    const firstKey = bot.processingTimers.keys().next().value;
    const timers = bot.processingTimers.get(firstKey);
    if (timers) {
      if (timers.acceptTimer) clearTimeout(timers.acceptTimer);
      if (timers.actionTimer) clearTimeout(timers.actionTimer);
    }
    bot.processingTimers.delete(firstKey);
  }

  const existing = bot.processingTimers.get(steamId);
  if (existing) {
    existing.actionTimer = actionTimer;
  } else {
    bot.processingTimers.set(steamId, { acceptTimer: null, actionTimer });
  }
}

function clearBotTimers(accountId) {
  const bot = activeBots[accountId];
  if (!bot) return;
  
  // Clear hour farm interval
  if (bot.hourFarmInterval) {
    clearInterval(bot.hourFarmInterval);
    bot.hourFarmInterval = null;
  }
  
  // Clear all processing timers
  if (bot.processingTimers) {
    for (const [sid, timers] of bot.processingTimers) {
      if (timers.acceptTimer) clearTimeout(timers.acceptTimer);
      if (timers.actionTimer) clearTimeout(timers.actionTimer);
    }
    bot.processingTimers.clear();
  }
  
  // Remove all event handlers to prevent memory leaks
  if (bot.eventHandlers && bot.user) {
    for (const { event, handler } of bot.eventHandlers) {
      bot.user.removeListener(event, handler);
    }
    bot.eventHandlers = [];
  }
  
  // Clear Steam Guard callback
  bot.steamGuardCallback = null;
  
  log('debug', 'Bot timers and handlers cleared', { accountId });
}

// ============ LOGIN/LOGOUT ============
ipcMain.handle("steam-login", async (event, { accountId, password, sharedSecret, steamGuardCode }) => {
  const account = accounts[accountId];
  if (!account) {
    log('error', 'Account not found for login', { accountId });
    return { success: false, error: "Account not found" };
  }

  log('info', 'Attempting Steam login', { accountName: account.accountName, hasSteamGuard: !!steamGuardCode });

  if (password) account.password = password;
  if (sharedSecret) account.sharedSecret = sharedSecret;
  saveAccounts();

  try {
    const bot = initBot(accountId);
    const logOnDetails = {
      accountName: account.accountName,
      password: account.password,
    };
    if (account.sharedSecret) {
      logOnDetails.twoFactorCode = SteamTotp.getAuthCode(account.sharedSecret);
      log('debug', 'Using 2FA code from sharedSecret');
    }
    if (steamGuardCode) {
      logOnDetails.authCode = steamGuardCode;
      log('debug', 'Using Steam Guard code from user');
    }
    
    log('debug', 'Calling user.logOn()...');
    bot.user.logOn(logOnDetails);
    log('info', 'Login request sent to Steam');
    return { success: true };
  } catch (err) {
    log('error', 'Error during login initialization', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
});

ipcMain.handle("steam-guard-response", async (event, { accountId, steamGuardCode }) => {
  const bot = activeBots[accountId];
  if (!bot) {
    log('error', 'Bot not active for Steam Guard response', { accountId });
    return { success: false, error: "Bot not active" };
  }

  if (!bot.steamGuardCallback) {
    log('warn', 'Steam Guard callback not set', { accountId });
    return { success: false, error: "Steam Guard not requested" };
  }

  log('info', 'Received Steam Guard code', { accountId, code: steamGuardCode });
  
  try {
    bot.steamGuardCallback(steamGuardCode);
    bot.steamGuardCallback = null;
    log('success', 'Steam Guard code sent to Steam');
    return { success: true };
  } catch (err) {
    log('error', 'Error sending Steam Guard code', { error: err.message });
    return { success: false, error: err.message };
  }
});

ipcMain.handle("steam-logout", (event, accountId) => {
  log('info', 'Logging out from Steam', { accountId });
  const bot = activeBots[accountId];
  if (!bot) {
    log('warn', 'Bot not active', { accountId });
    return { success: false, error: "Bot not active" };
  }
  
  // Clear all timers and event handlers
  clearBotTimers(accountId);
  
  try { 
    // Log off from Steam
    bot.user.logOff(); 
    log('debug', 'user.logOff() called');
    
    // Destroy the SteamUser instance to free resources
    if (bot.user.destroy) {
      bot.user.destroy();
      log('debug', 'SteamUser instance destroyed');
    }
  } catch (e) {
    log('error', 'Error during logout', { error: e.message });
  }
  
  // Clear community instance
  if (bot.community) {
    bot.community = null;
  }
  
  bot.status = "offline";
  bot.friendBotActive = false;
  bot.hourFarmActive = false;
  
  // Remove bot from activeBots
  delete activeBots[accountId];
  
  log('success', 'Logged out from Steam', { accountId });
  sendAccountUpdate(accountId);
  return { success: true };
});

// ============ FRIEND BOT ============
ipcMain.handle("start-friend-bot", (event, accountId, settings) => {
  log('info', 'Starting friend bot', { accountId });
  const bot = activeBots[accountId];
  if (!bot || bot.status !== "online") {
    log('error', 'Bot not online', { accountId, status: bot?.status });
    return { success: false, error: "Bot is not online" };
  }
  if (settings) {
    log('debug', 'Updating bot settings', { settings });
    if (settings.friendAcceptDelay !== undefined) {
      settings.friendAcceptDelay = Math.max(MIN_FRIEND_ACCEPT_DELAY, settings.friendAcceptDelay);
    }
    if (settings.messageDelay !== undefined) {
      settings.messageDelay = Math.max(MIN_MESSAGE_DELAY, settings.messageDelay);
    }
    accounts[accountId].settings = { ...accounts[accountId].settings, ...settings };
    saveAccounts();
  }
  bot.friendBotActive = true;
  
  // Check for existing pending friend requests
  log('info', 'Checking for existing friend requests', { accountId });
  try {
    const pendingRequests = [];
    for (const [steamId, relationship] of Object.entries(bot.user.myFriends)) {
      if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
        pendingRequests.push(steamId);
      }
    }
    
    if (pendingRequests.length > 0) {
      log('info', `Found ${pendingRequests.length} pending friend requests`, { accountId });
      // Process each pending request
      pendingRequests.forEach((steamId, index) => {
        setTimeout(() => {
          processFriendRequest(accountId, steamId);
        }, index * 1000); // Stagger processing
      });
    }
  } catch (err) {
    log('error', 'Error checking pending requests', { error: err.message });
  }
  
  log('success', 'Friend bot started', { 
    acceptDelay: accounts[accountId].settings.friendAcceptDelay,
    messageDelay: accounts[accountId].settings.messageDelay,
    groupId: accounts[accountId].settings.groupId || 'not specified'
  });
  sendAccountUpdate(accountId);
  return { success: true };
});

// Helper function to process friend request
function processFriendRequest(accountId, steamId) {
  const bot = activeBots[accountId];
  const account = accounts[accountId];
  if (!bot || !account) return;
  
  const acceptDelaySec = Math.max(MIN_FRIEND_ACCEPT_DELAY, account.settings.friendAcceptDelay || MIN_FRIEND_ACCEPT_DELAY);
  const acceptDelayMs = acceptDelaySec * 1000;
  
  sendLog(accountId, "info", `Processing existing request from ${steamId} in ${acceptDelaySec} sec...`);
  
  setTimeout(() => {
    try {
      bot.user.addFriend(steamId);
      bot.stats.friendsAdded++;
      sendLog(accountId, "success", `Accepted as friend: ${steamId}`);
      sendAccountUpdate(accountId);
      schedulePostAcceptActions(accountId, steamId);
    } catch (err) {
      sendLog(accountId, "error", `Error accepting ${steamId}: ${err.message}`);
    }
  }, acceptDelayMs);
}

ipcMain.handle("stop-friend-bot", (event, accountId) => {
  log('info', 'Stopping friend bot', { accountId });
  const bot = activeBots[accountId];
  if (!bot) {
    log('warn', 'Bot not active', { accountId });
    return { success: false, error: "Bot not active" };
  }
  bot.friendBotActive = false;
  if (bot.processingTimers) {
    const timerCount = bot.processingTimers.size;
    for (const [sid, timers] of bot.processingTimers) {
      if (timers.acceptTimer) clearTimeout(timers.acceptTimer);
      if (timers.actionTimer) clearTimeout(timers.actionTimer);
    }
    bot.processingTimers.clear();
    log('debug', `Cleared ${timerCount} friend processing timers`);
  }
  log('success', 'Friend bot stopped', { accountId });
  sendAccountUpdate(accountId);
  return { success: true };
});

// ============ HOUR FARM ============
ipcMain.handle("start-hour-farm", (event, accountId, games) => {
  log('info', 'Starting hour farm', { accountId, games });
  const bot = activeBots[accountId];
  const account = accounts[accountId];
  if (!bot || bot.status !== "online") {
    log('error', 'Bot not online for farming', { accountId, status: bot?.status });
    return { success: false, error: "Bot is not online" };
  }
  
  let gameIds = games && games.length > 0 ? games : (account?.settings?.farmGames || []);
  if (gameIds.length === 0) {
    log('warn', 'Game list empty, using CS2 (730) as default');
    gameIds = [730];
  }
  
  bot.currentGames = gameIds;
  bot.hourFarmActive = true;
  try {
    log('debug', 'Calling user.gamesPlayed()', { gameIds });
    bot.user.gamesPlayed(gameIds);
    log('success', 'Hour farm started', { gameIds });
  } catch (err) {
    log('error', 'Error starting farm', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
  const startTime = Date.now();
  bot.hourFarmInterval = setInterval(() => {
    bot.hoursFarmed = parseFloat(((Date.now() - startTime) / 3600000).toFixed(2));
    sendToRenderer("bot-stats", { accountId, hoursFarmed: bot.hoursFarmed });
  }, 60000);
  log('debug', 'Farm timer set (updates every minute)');
  sendAccountUpdate(accountId);
  return { success: true };
});

ipcMain.handle("stop-hour-farm", (event, accountId) => {
  log('info', 'Stopping hour farm', { accountId });
  const bot = activeBots[accountId];
  if (!bot) {
    log('warn', 'Bot not active', { accountId });
    return { success: false, error: "Bot not active" };
  }
  bot.hourFarmActive = false;
  bot.currentGames = [];
  if (bot.hourFarmInterval) { 
    clearInterval(bot.hourFarmInterval); 
    bot.hourFarmInterval = null;
    log('debug', 'Farm timer cleared');
  }
  try { 
    bot.user.gamesPlayed([]); 
    log('debug', 'user.gamesPlayed([]) called');
  } catch (e) {
    log('error', 'Error stopping farm', { error: e.message });
  }
  log('success', 'Farm stopped', { hoursFarmed: bot.hoursFarmed });
  sendAccountUpdate(accountId);
  return { success: true };
});

// ============ BROADCAST/INVITE CONTROL ============
ipcMain.handle("pause-broadcast", (event, accountId) => {
  if (!broadcastStates[accountId]) broadcastStates[accountId] = { isPaused: false, isStopped: false };
  broadcastStates[accountId].isPaused = true;
  log('info', 'Broadcast paused', { accountId });
  return { success: true };
});

ipcMain.handle("resume-broadcast", (event, accountId) => {
  if (!broadcastStates[accountId]) broadcastStates[accountId] = { isPaused: false, isStopped: false };
  broadcastStates[accountId].isPaused = false;
  log('info', 'Broadcast resumed', { accountId });
  return { success: true };
});

ipcMain.handle("stop-broadcast", (event, accountId) => {
  if (!broadcastStates[accountId]) broadcastStates[accountId] = { isPaused: false, isStopped: false };
  broadcastStates[accountId].isStopped = true;
  broadcastStates[accountId].isPaused = false;
  log('info', 'Broadcast stopped', { accountId });
  return { success: true };
});

ipcMain.handle("pause-invite", (event, accountId) => {
  if (!inviteStates[accountId]) inviteStates[accountId] = { isPaused: false, isStopped: false };
  inviteStates[accountId].isPaused = true;
  log('info', 'Invite paused', { accountId });
  return { success: true };
});

ipcMain.handle("resume-invite", (event, accountId) => {
  if (!inviteStates[accountId]) inviteStates[accountId] = { isPaused: false, isStopped: false };
  inviteStates[accountId].isPaused = false;
  log('info', 'Invite resumed', { accountId });
  return { success: true };
});

ipcMain.handle("stop-invite", (event, accountId) => {
  if (!inviteStates[accountId]) inviteStates[accountId] = { isPaused: false, isStopped: false };
  inviteStates[accountId].isStopped = true;
  inviteStates[accountId].isPaused = false;
  log('info', 'Invite stopped', { accountId });
  return { success: true };
});

// ============ PERFORMANCE ============
ipcMain.handle("get-performance-mode", () => {
  return { 
    mode: performanceMode, 
    isUserInGame,
    activeBots: Object.keys(activeBots).length
  };
});

ipcMain.handle("set-performance-mode", (event, mode) => {
  if (['normal', 'low', 'minimal'].includes(mode)) {
    performanceMode = mode;
    updateMemoryCheckInterval();
    log('info', `Performance mode manually set to: ${mode}`);
    return { success: true, mode };
  }
  return { success: false, error: 'Invalid mode' };
});

// ============ WINDOW ============
ipcMain.handle("hide-window", () => { mainWindow?.hide(); return { success: true }; });
ipcMain.handle("show-window", () => { mainWindow?.show(); mainWindow?.focus(); return { success: true }; });

// ============ SEND COMMENT TO ALL FRIENDS ============
const MIN_COMMENT_DELAY = 8;

ipcMain.handle("send-comment-to-friends", async (event, accountId, message, delaySec, targetSteamIds = null) => {
  log('info', 'Starting message broadcast', { accountId, messageLength: message.length, delaySec });
  
  const bot = activeBots[accountId];
  if (!bot || bot.status !== "online") {
    log('error', 'Bot not online for broadcast', { accountId, status: bot?.status });
    return { success: false, error: "Bot is not online" };
  }

  // Initialize broadcast state
  if (!broadcastStates[accountId]) {
    broadcastStates[accountId] = { isPaused: false, isStopped: false };
  }
  broadcastStates[accountId].isStopped = false;
  broadcastStates[accountId].isPaused = false;

  const actualDelay = Math.max(MIN_COMMENT_DELAY, delaySec || MIN_COMMENT_DELAY) * 1000;
  log('debug', 'Delay between messages', { actualDelayMs: actualDelay });

  // Get friend IDs - either from target list or all friends
  let friendIds = [];
  
  if (targetSteamIds && Array.isArray(targetSteamIds) && targetSteamIds.length > 0) {
    friendIds = targetSteamIds;
    log('info', 'Using target friends list', { count: friendIds.length });
  } else {
    try {
      for (const [steamId, relationship] of Object.entries(bot.user.myFriends)) {
        if (relationship === SteamUser.EFriendRelationship.Friend) {
          friendIds.push(steamId);
        }
      }
    } catch (err) {
      log('error', 'Error getting friends list', { error: err.message });
      return { success: false, error: "Failed to get friends list" };
    }
  }

  log('debug', 'Got friends list', { totalFriends: friendIds.length });

  if (friendIds.length === 0) {
    log('warn', 'Friends list empty', { accountId });
    return { success: false, error: "No friends found" };
  }

  const results = {
    total: friendIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  log('info', `Starting broadcast to ${friendIds.length} friends`, { delaySec: actualDelay / 1000 });

  for (let i = 0; i < friendIds.length; i++) {
    const steamId = friendIds[i];
    
    // Check if stopped
    if (broadcastStates[accountId]?.isStopped) {
      log('info', 'Broadcast stopped by user', { accountId });
      break;
    }
    
    // Check if paused - wait until resumed
    while (broadcastStates[accountId]?.isPaused && !broadcastStates[accountId]?.isStopped) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    // Check again if stopped during pause
    if (broadcastStates[accountId]?.isStopped) {
      log('info', 'Broadcast stopped by user during pause', { accountId });
      break;
    }
    
    // Check if bot still exists and is online
    if (!activeBots[accountId] || activeBots[accountId].status !== "online") {
      log('warn', 'Bot no longer available, stopping broadcast', { accountId });
      break;
    }
    
    try {
      // Use the correct method to send message
      await new Promise((resolve, reject) => {
        bot.user.chat.sendFriendMessage(steamId, message, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      results.success++;
      bot.stats.messagesSent++;
      sendLog(accountId, "success", `[${i + 1}/${friendIds.length}] Sent: ${steamId}`);
      
      const progressData = {
        accountId,
        current: i + 1,
        total: friendIds.length,
        success: results.success,
        failed: results.failed,
      };
      sendToRenderer("broadcast-progress", progressData);
      log('debug', 'Broadcast progress sent to UI', progressData);
    } catch (err) {
      results.failed++;
      results.errors.push({ steamId, error: err.message || String(err) });
      sendLog(accountId, "error", `[${i + 1}/${friendIds.length}] Error: ${steamId} - ${err.message}`);
    }

    if (i < friendIds.length - 1) {
      log('debug', `Waiting ${actualDelay / 1000}s before next message`);
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
    }
  }

  log('success', `Broadcast completed`, { 
    total: results.total, 
    success: results.success, 
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined
  });
  return { success: true, results };
});

// ============ INVITE FRIENDS TO GROUP ============
ipcMain.handle("get-friends-list", async (event, accountId) => {
  log('info', 'Requesting friends list', { accountId });
  const bot = activeBots[accountId];
  if (!bot || bot.status !== "online") {
    log('error', 'Bot not online', { accountId, status: bot?.status });
    return { success: false, error: "Bot is not online" };
  }

  try {
    const friends = [];
    const personaStates = bot.user.personaStates || {};
    
    for (const [steamId, relationship] of Object.entries(bot.user.myFriends)) {
      if (relationship === SteamUser.EFriendRelationship.Friend) {
        const persona = personaStates[steamId];
        friends.push({
          steamId,
          name: persona?.player_name || steamId,
          status: persona?.persona_state || 0,
        });
      }
    }
    log('success', `Friends list received`, { count: friends.length });
    return { success: true, friends };
  } catch (err) {
    log('error', 'Error getting friends list', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
});

ipcMain.handle("invite-friends-to-group", async (event, accountId, groupId, steamIds) => {
  log('info', 'Starting group invitations', { accountId, groupId, friendsCount: steamIds.length });
  
  const bot = activeBots[accountId];
  if (!bot || bot.status !== "online") {
    log('error', 'Bot not online', { accountId, status: bot?.status });
    return { success: false, error: "Bot is not online" };
  }

  // Initialize invite state
  if (!inviteStates[accountId]) {
    inviteStates[accountId] = { isPaused: false, isStopped: false };
  }
  inviteStates[accountId].isStopped = false;
  inviteStates[accountId].isPaused = false;

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < steamIds.length; i++) {
    const steamId = steamIds[i];
    
    // Check if stopped
    if (inviteStates[accountId]?.isStopped) {
      log('info', 'Invitations stopped by user', { accountId });
      break;
    }
    
    // Check if paused - wait until resumed
    while (inviteStates[accountId]?.isPaused && !inviteStates[accountId]?.isStopped) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    // Check again if stopped during pause
    if (inviteStates[accountId]?.isStopped) {
      log('info', 'Invitations stopped by user during pause', { accountId });
      break;
    }
    
    // Check if bot still exists and is online
    if (!activeBots[accountId] || activeBots[accountId].status !== "online") {
      log('warn', 'Bot no longer available, stopping invitations', { accountId });
      break;
    }
    
    try {
      log('debug', `Invitation [${i + 1}/${steamIds.length}]`, { steamId, groupId });
      
      // Add timeout for invitation
      await Promise.race([
        new Promise((resolve, reject) => {
          bot.community.inviteUserToGroup(steamId, groupId, (err) => {
            if (err) reject(err);
            else resolve();
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Invitation timeout')), 30000)
        )
      ]);
      
      results.success++;
      log('success', `Invitation sent`, { steamId, groupId });
    } catch (err) {
      results.failed++;
      results.errors.push({ steamId, error: err.message || String(err) });
      log('error', `Invitation error`, { steamId, error: err.message });
    }

    // Send progress update to UI
    const progressData = {
      accountId,
      current: i + 1,
      total: steamIds.length,
      success: results.success,
      failed: results.failed,
    };
    sendToRenderer("invite-progress", progressData);
    log('debug', 'Invite progress sent to UI', progressData);

    if (i < steamIds.length - 1) {
      log('debug', 'Waiting 1s before next invitation');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  log('success', `Invitations completed`, { 
    total: steamIds.length,
    success: results.success, 
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined
  });
  return { success: true, results };
});

// ============ SEND COMMENTS TO PROFILES ============
const MIN_COMMENT_PROFILE_DELAY = 7;

ipcMain.handle("send-comment-to-profiles", async (event, accountId, comment, delaySec) => {
  log('info', 'Starting profile comments broadcast', { accountId, commentLength: comment.length, delaySec });
  
  const bot = activeBots[accountId];
  if (!bot || bot.status !== "online") {
    log('error', 'Bot not online for profile comments', { accountId, status: bot?.status });
    return { success: false, error: "Bot is not online" };
  }

  // Initialize broadcast state
  if (!broadcastStates[accountId]) {
    broadcastStates[accountId] = { isPaused: false, isStopped: false };
  }
  broadcastStates[accountId].isStopped = false;
  broadcastStates[accountId].isPaused = false;

  const actualDelay = Math.max(MIN_COMMENT_PROFILE_DELAY, delaySec || MIN_COMMENT_PROFILE_DELAY) * 1000;
  log('debug', 'Delay between profile comments', { actualDelayMs: actualDelay });

  // Get friend IDs
  let friendIds = [];
  try {
    for (const [steamId, relationship] of Object.entries(bot.user.myFriends)) {
      if (relationship === SteamUser.EFriendRelationship.Friend) {
        friendIds.push(steamId);
      }
    }
  } catch (err) {
    log('error', 'Error getting friends list', { error: err.message });
    return { success: false, error: "Failed to get friends list" };
  }

  log('debug', 'Got friends list', { totalFriends: friendIds.length });

  if (friendIds.length === 0) {
    log('warn', 'Friends list empty', { accountId });
    return { success: false, error: "No friends found" };
  }

  const results = {
    total: friendIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  log('info', `Starting profile comments to ${friendIds.length} friends`, { delaySec: actualDelay / 1000 });

  for (let i = 0; i < friendIds.length; i++) {
    const steamId = friendIds[i];
    
    // Check if stopped
    if (broadcastStates[accountId]?.isStopped) {
      log('info', 'Profile comments stopped by user', { accountId });
      break;
    }
    
    // Check if paused - wait until resumed
    while (broadcastStates[accountId]?.isPaused && !broadcastStates[accountId]?.isStopped) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    // Check again if stopped during pause
    if (broadcastStates[accountId]?.isStopped) {
      log('info', 'Profile comments stopped by user during pause', { accountId });
      break;
    }
    
    // Check if bot still exists and is online
    if (!activeBots[accountId] || activeBots[accountId].status !== "online") {
      log('warn', 'Bot no longer available, stopping profile comments', { accountId });
      break;
    }
    
    try {
      // Post comment to friend's profile
      await new Promise((resolve, reject) => {
        bot.community.postUserComment(steamId, comment, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      results.success++;
      bot.stats.messagesSent++;
      sendLog(accountId, "success", `[${i + 1}/${friendIds.length}] Comment posted to profile: ${steamId}`);
      
      const progressData = {
        accountId,
        current: i + 1,
        total: friendIds.length,
        success: results.success,
        failed: results.failed,
      };
      sendToRenderer("broadcast-progress", progressData);
      log('debug', 'Profile comments progress sent to UI', progressData);
    } catch (err) {
      results.failed++;
      results.errors.push({ steamId, error: err.message || String(err) });
      sendLog(accountId, "error", `[${i + 1}/${friendIds.length}] Error posting comment to ${steamId}: ${err.message}`);
    }

    if (i < friendIds.length - 1) {
      log('debug', `Waiting ${actualDelay / 1000}s before next profile comment`);
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
    }
  }

  log('success', `Profile comments completed`, { 
    total: results.total, 
    success: results.success, 
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined
  });
  return { success: true, results };
});

// ============ STOP ALL ============
function stopAllBots() {
  log('info', 'Stopping all bots...');
  const botCount = Object.keys(activeBots).length;
  
  for (const [accountId, bot] of Object.entries(activeBots)) {
    try {
      // Clear all timers and handlers first
      clearBotTimers(accountId);
      
      // Log off and destroy
      if (bot.user) {
        try {
          bot.user.logOff();
          if (bot.user.destroy) {
            bot.user.destroy();
          }
        } catch (e) {
          log('error', `Error during bot ${accountId} cleanup`, { error: e.message });
        }
      }
      
      // Clear references
      bot.user = null;
      bot.community = null;
      
      log('debug', `Bot ${accountId} stopped`);
    } catch (e) {
      log('error', `Error stopping bot ${accountId}`, { error: e.message });
    }
  }
  
  // Clear all references
  activeBots = {};
  
  log('success', `All bots stopped (${botCount})`);
}

// ============ APP LIFECYCLE ============
app.whenReady().then(() => {
  log('info', 'Steam-avto starting...');
  log('info', `Version: ${app.getVersion()}`);
  log('info', `Platform: ${process.platform} ${process.arch}`);
  log('info', `Electron: ${process.versions.electron}`);
  log('info', `Node.js: ${process.versions.node}`);
  log('info', `Data path: ${app.getPath("userData")}`);
  
  loadAccounts();
  createWindow();
  createTray();
  
  log('success', 'Application ready');
  
  app.on("activate", () => {
    log('debug', 'App activated');
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on("window-all-closed", () => {
  log('info', 'All windows closed');
  if (process.platform !== "darwin") {
    log('info', 'Quitting application...');
    app.quit();
  }
});

app.on("before-quit", () => {
  log('info', 'Application shutting down...');
  app.isQuitting = true;
  stopAllBots();
  log('success', 'Application stopped');
});
