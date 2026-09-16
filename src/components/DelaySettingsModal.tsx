import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAppContext } from "../App";

interface DelaySettingsModalProps {
  accountId: string;
  onClose: () => void;
}

export default function DelaySettingsModal({ accountId, onClose }: DelaySettingsModalProps) {
  const { updateSettings, getSettings } = useAppContext();
  const [settings, setSettings] = useState({
    friendAcceptDelay: 7,
    messageDelay: 10,
    groupId: "",
    welcomeMessage: "",
    autoMessage: true,
  });
  const [minimums, setMinimums] = useState({ friendAcceptDelay: 7, messageDelay: 10 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Загружаем текущие настройки
    const loadSettings = async () => {
      const result = await getSettings(accountId);
      if (result.success && result.settings) {
        setSettings({
          friendAcceptDelay: result.settings.friendAcceptDelay || 7,
          messageDelay: result.settings.messageDelay || 10,
          groupId: result.settings.groupId || "",
          welcomeMessage: result.settings.welcomeMessage || "",
          autoMessage: result.settings.autoMessage !== false,
        });
      }
      if (result.minimums) {
        setMinimums(result.minimums);
      }
    };
    loadSettings();
  }, [accountId, getSettings]);

  const handleSave = async () => {
    // Применяем минимумы
    const finalSettings = {
      friendAcceptDelay: Math.max(minimums.friendAcceptDelay, settings.friendAcceptDelay),
      messageDelay: Math.max(minimums.messageDelay, settings.messageDelay),
      groupId: settings.groupId,
      welcomeMessage: settings.welcomeMessage,
      autoMessage: settings.autoMessage,
    };
    await updateSettings(accountId, finalSettings);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-steam-card border border-steam-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <i className="fas fa-sliders-h text-steam-accent" />
            Настройки задержек
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-steam-darker flex items-center justify-center text-steam-text-muted hover:text-white transition-colors"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Info */}
        <div className="mb-5 p-3 bg-steam-accent/10 border border-steam-accent/30 rounded-lg">
          <p className="text-steam-accent text-xs flex items-center gap-2">
            <i className="fas fa-info-circle" />
            Задержки не могут быть ниже минимальных значений для избежания блокировок Steam
          </p>
        </div>

        <div className="space-y-5">
          {/* Friend Accept Delay */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white text-sm font-medium flex items-center gap-2">
                <i className="fas fa-user-plus text-steam-green text-xs" />
                Задержка перед приёмом друга
              </label>
              <span className="text-steam-text-muted text-xs">
                Минимум: <span className="text-steam-yellow font-bold">{minimums.friendAcceptDelay}с</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minimums.friendAcceptDelay}
                max={120}
                step={1}
                value={settings.friendAcceptDelay}
                onChange={(e) => updateField("friendAcceptDelay", parseInt(e.target.value))}
                className="flex-1 h-2 bg-steam-darker rounded-lg appearance-none cursor-pointer accent-steam-accent"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={minimums.friendAcceptDelay}
                  max={300}
                  value={settings.friendAcceptDelay}
                  onChange={(e) => updateField("friendAcceptDelay", Math.max(minimums.friendAcceptDelay, parseInt(e.target.value) || minimums.friendAcceptDelay))}
                  className="w-16 px-2 py-1 bg-steam-darker border border-steam-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-steam-accent"
                />
                <span className="text-steam-text-muted text-xs">сек</span>
              </div>
            </div>
            <p className="text-steam-text-muted text-xs mt-1">
              Через сколько секунд после получения запроса принять его в друзья
            </p>
          </div>

          {/* Message Delay */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white text-sm font-medium flex items-center gap-2">
                <i className="fas fa-comment-dots text-steam-accent text-xs" />
                Задержка перед сообщением/приглашением
              </label>
              <span className="text-steam-text-muted text-xs">
                Минимум: <span className="text-steam-yellow font-bold">{minimums.messageDelay}с</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minimums.messageDelay}
                max={180}
                step={1}
                value={settings.messageDelay}
                onChange={(e) => updateField("messageDelay", parseInt(e.target.value))}
                className="flex-1 h-2 bg-steam-darker rounded-lg appearance-none cursor-pointer accent-steam-accent"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={minimums.messageDelay}
                  max={600}
                  value={settings.messageDelay}
                  onChange={(e) => updateField("messageDelay", Math.max(minimums.messageDelay, parseInt(e.target.value) || minimums.messageDelay))}
                  className="w-16 px-2 py-1 bg-steam-darker border border-steam-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-steam-accent"
                />
                <span className="text-steam-text-muted text-xs">сек</span>
              </div>
            </div>
            <p className="text-steam-text-muted text-xs mt-1">
              Через сколько секунд после принятия друга отправить сообщение и пригласить в группу
            </p>
          </div>

          {/* Group ID */}
          <div className="border-t border-steam-border pt-5">
            <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
              <i className="fas fa-users text-steam-green text-xs" />
              Steam ID группы для приглашения
            </label>
            <input
              type="text"
              value={settings.groupId}
              onChange={(e) => updateField("groupId", e.target.value)}
              placeholder="10358279142977246 (или URL группы)"
              className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent"
            />
            <p className="text-steam-text-muted text-xs mt-1">
              Оставьте пустым чтобы не приглашать в группу. ID можно найти в URL группы Steam
            </p>
          </div>

          {/* Welcome Message */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={settings.autoMessage}
                onChange={(e) => updateField("autoMessage", e.target.checked)}
                className="w-4 h-4 rounded border-steam-border bg-steam-darker text-steam-accent focus:ring-steam-accent"
              />
              <span className="text-white text-sm font-medium">Отправлять приветственное сообщение</span>
            </label>
            {settings.autoMessage && (
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => updateField("welcomeMessage", e.target.value)}
                placeholder="Привет! Рад быть твоим другом 🎮"
                className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent resize-none"
                rows={3}
              />
            )}
          </div>

          {/* Visual preview */}
          <div className="p-4 bg-steam-darker rounded-xl border border-steam-border">
            <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <i className="fas fa-eye text-steam-accent text-xs" />
              Порядок действий
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-steam-accent/20 flex items-center justify-center">
                  <span className="text-steam-accent text-xs font-bold">1</span>
                </div>
                <span className="text-steam-text">Получен запрос в друзья</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-steam-yellow/20 flex items-center justify-center">
                  <i className="fas fa-clock text-steam-yellow text-[10px]" />
                </div>
                <span className="text-steam-yellow">Ожидание: {settings.friendAcceptDelay} сек</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-steam-green/20 flex items-center justify-center">
                  <span className="text-steam-green text-xs font-bold">2</span>
                </div>
                <span className="text-steam-text">Принять в друзья ✓</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-steam-yellow/20 flex items-center justify-center">
                  <i className="fas fa-clock text-steam-yellow text-[10px]" />
                </div>
                <span className="text-steam-yellow">Ожидание: {settings.messageDelay} сек</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-steam-green/20 flex items-center justify-center">
                  <span className="text-steam-green text-xs font-bold">3</span>
                </div>
                <span className="text-steam-text">
                  {settings.groupId ? `Пригласить в группу (${settings.groupId.substring(0, 15)}...)` : "Пропустить приглашение"}
                </span>
              </div>
              {settings.autoMessage && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-steam-green/20 flex items-center justify-center">
                    <span className="text-steam-green text-xs font-bold">4</span>
                  </div>
                  <span className="text-steam-text">Отправить сообщение 💬</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              saved
                ? "bg-steam-green text-white"
                : "bg-steam-accent hover:bg-steam-accent-hover text-white"
            }`}
          >
            <i className={`fas ${saved ? "fa-check" : "fa-save"} mr-2`} />
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-steam-darker border border-steam-border text-steam-text rounded-lg transition-colors text-sm font-medium"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
