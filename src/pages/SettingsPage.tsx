import { motion } from "framer-motion";
import { useState } from "react";
import { useAppContext } from "../App";

export default function SettingsPage() {
  const { accounts, isRealElectron, updateSettings } = useAppContext();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");
  const [saved, setSaved] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const s: any = selectedAccount?.settings || {};

  const [settings, setSettings] = useState({
    autoAcceptFriends: s.autoAcceptFriends ?? true,
    autoMessage: s.autoMessage ?? true,
    welcomeMessage: s.welcomeMessage ?? "Привет! Рад быть твоим другом 🎮",
    groupId: s.groupId ?? "",
    friendAcceptDelay: s.friendAcceptDelay ?? 7,
    messageDelay: s.messageDelay ?? 10,
    maxRequestsPerHour: s.maxRequestsPerHour ?? 20,
    maxMessagesPerHour: s.maxMessagesPerHour ?? 50,
  });

  const MIN_FRIEND_DELAY = 7;
  const MIN_MESSAGE_DELAY = 10;

  const handleSave = async () => {
    if (isRealElectron && selectedAccountId) {
      await updateSettings(selectedAccountId, settings);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateField = (field: string, value: any) => {
    if (field === "friendAcceptDelay") value = Math.max(MIN_FRIEND_DELAY, value);
    if (field === "messageDelay") value = Math.max(MIN_MESSAGE_DELAY, value);
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Настройки</h1>
          <p className="text-steam-text-muted text-sm mt-1">Конфигурация ботов и системы</p>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? "bg-steam-green text-white" : "bg-steam-accent hover:bg-steam-accent-hover text-white"}`}>
          <i className={`fas ${saved ? "fa-check" : "fa-save"} text-xs`} />{saved ? "Сохранено!" : "Сохранить"}
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="bg-steam-card border border-steam-border rounded-xl p-4">
          <label className="text-steam-text-muted text-sm mb-2 block">Аккаунт для настройки</label>
          <select value={selectedAccountId} onChange={(e) => {
            setSelectedAccountId(e.target.value);
            const acc = accounts.find((a) => a.id === e.target.value);
            const settings: any = acc?.settings || {};
            setSettings({
              autoAcceptFriends: settings.autoAcceptFriends ?? true,
              autoMessage: settings.autoMessage ?? true,
              welcomeMessage: settings.welcomeMessage ?? "Привет! Рад быть твоим другом 🎮",
              groupId: settings.groupId ?? "",
              friendAcceptDelay: settings.friendAcceptDelay ?? 7,
              messageDelay: settings.messageDelay ?? 10,
              maxRequestsPerHour: settings.maxRequestsPerHour ?? 20,
              maxMessagesPerHour: settings.maxMessagesPerHour ?? 50,
            });
          }} className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm focus:outline-none focus:border-steam-accent">
            {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.accountName})</option>))}
          </select>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-steam-border bg-steam-darker/50">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <i className="fas fa-clock text-steam-yellow text-xs" />Задержки
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-steam-accent/10 border border-steam-accent/30 rounded-lg">
            <p className="text-steam-accent text-xs flex items-center gap-2">
              <i className="fas fa-info-circle" />💡 Для детальной настройки используйте кнопку <i className="fas fa-sliders-h" /> на странице «Аккаунты»
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Задержка перед приёмом друга</p>
              <p className="text-steam-text-muted text-xs mt-0.5">Минимум: {MIN_FRIEND_DELAY} сек</p>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" min={MIN_FRIEND_DELAY} value={settings.friendAcceptDelay} onChange={(e) => updateField("friendAcceptDelay", parseInt(e.target.value) || MIN_FRIEND_DELAY)} className="w-20 px-3 py-1.5 bg-steam-darker border border-steam-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-steam-accent" />
              <span className="text-steam-text-muted text-xs">сек</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Задержка перед сообщением/приглашением</p>
              <p className="text-steam-text-muted text-xs mt-0.5">Минимум: {MIN_MESSAGE_DELAY} сек</p>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" min={MIN_MESSAGE_DELAY} value={settings.messageDelay} onChange={(e) => updateField("messageDelay", parseInt(e.target.value) || MIN_MESSAGE_DELAY)} className="w-20 px-3 py-1.5 bg-steam-darker border border-steam-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-steam-accent" />
              <span className="text-steam-text-muted text-xs">сек</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-steam-card border border-steam-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-steam-border bg-steam-darker/50">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <i className="fas fa-user-plus text-steam-accent text-xs" />Бот друзей
          </h3>
        </div>
        <div className="divide-y divide-steam-border">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-white text-sm font-medium">Авто-приём друзей</p>
              <p className="text-steam-text-muted text-xs mt-0.5">Автоматически принимать все входящие запросы</p>
            </div>
            <button onClick={() => updateField("autoAcceptFriends", !settings.autoAcceptFriends)} className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoAcceptFriends ? "bg-steam-accent" : "bg-steam-border"}`}>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: settings.autoAcceptFriends ? "translateX(22px)" : "translateX(0)" }} />
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-white text-sm font-medium">Авто-приветствие</p>
              <p className="text-steam-text-muted text-xs mt-0.5">Отправлять сообщение новым друзьям</p>
            </div>
            <button onClick={() => updateField("autoMessage", !settings.autoMessage)} className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoMessage ? "bg-steam-accent" : "bg-steam-border"}`}>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: settings.autoMessage ? "translateX(22px)" : "translateX(0)" }} />
            </button>
          </div>
          {settings.autoMessage && (
            <div className="px-5 py-4">
              <label className="text-steam-text-muted text-sm mb-1 block">Текст приветствия</label>
              <textarea value={settings.welcomeMessage} onChange={(e) => updateField("welcomeMessage", e.target.value)} className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm focus:outline-none focus:border-steam-accent resize-none" rows={2} />
            </div>
          )}
          <div className="px-5 py-4">
            <label className="text-steam-text-muted text-sm mb-1 block">Steam ID группы для приглашения</label>
            <input type="text" value={settings.groupId} onChange={(e) => updateField("groupId", e.target.value)} placeholder="10358279142977246" className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent" />
            <p className="text-steam-text-muted text-xs mt-1">Принятые друзья будут приглашены в эту группу</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-steam-card border border-steam-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-steam-border bg-steam-darker/50">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <i className="fas fa-tachometer-alt text-steam-yellow text-xs" />Лимиты
          </h3>
        </div>
        <div className="divide-y divide-steam-border">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-white text-sm font-medium">Макс. запросов в час</p>
              <p className="text-steam-text-muted text-xs mt-0.5">Лимит запросов в друзья на аккаунт</p>
            </div>
            <input type="number" value={settings.maxRequestsPerHour} onChange={(e) => updateField("maxRequestsPerHour", parseInt(e.target.value) || 0)} className="w-20 px-3 py-1.5 bg-steam-darker border border-steam-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-steam-accent" />
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-white text-sm font-medium">Макс. сообщений в час</p>
              <p className="text-steam-text-muted text-xs mt-0.5">Лимит сообщений на аккаунт</p>
            </div>
            <input type="number" value={settings.maxMessagesPerHour} onChange={(e) => updateField("maxMessagesPerHour", parseInt(e.target.value) || 0)} className="w-20 px-3 py-1.5 bg-steam-darker border border-steam-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-steam-accent" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
