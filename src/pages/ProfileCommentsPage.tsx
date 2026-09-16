import { motion } from "framer-motion";
import { useState } from "react";
import { useAppContext } from "../App";

const MIN_DELAY = 7;

export default function ProfileCommentsPage() {
  const { accounts, isRealElectron, sendCommentToProfiles, broadcastProgress, broadcastControlState, pauseBroadcast, resumeBroadcast, stopBroadcast } = useAppContext();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [delay, setDelay] = useState(MIN_DELAY);
  const [results, setResults] = useState<any>(null);

  const onlineAccounts = accounts.filter((a) => a.status === "online");

  const handleStart = async () => {
    if (!comment.trim()) { alert("Введите комментарий!"); return; }
    if (!selectedAccount) { alert("Выберите аккаунт!"); return; }

    setResults(null);

    try {
      const result = await sendCommentToProfiles(selectedAccount, comment, delay);
      if (result.success && result.results) {
        setResults(result.results);
      }
    } catch (err) {
      console.error("Profile comments failed:", err);
    }
  };

  const handlePause = async () => {
    if (!selectedAccount) return;
    await pauseBroadcast(selectedAccount);
  };

  const handleResume = async () => {
    if (!selectedAccount) return;
    await resumeBroadcast(selectedAccount);
  };

  const handleStop = async () => {
    if (!selectedAccount) return;
    await stopBroadcast(selectedAccount);
  };

  const account = selectedAccount ? accounts.find((a) => a.id === selectedAccount) : null;
  const totalFriends = account?.friendsCount || 0;
  const totalSeconds = totalFriends * delay;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isRunning = broadcastProgress !== null && !broadcastControlState.isStopped;

  const progress = broadcastProgress;
  const progressPercent = progress && progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Комментарии на профили</h1>
        <p className="text-steam-text-muted text-sm mt-1">Отправка комментариев на профили всех друзей</p>
      </div>

      {/* Account selection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-border rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-user-circle text-steam-accent" />Выберите аккаунт
        </h3>
        {onlineAccounts.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-user-slash text-3xl text-steam-text-muted mb-2" />
            <p className="text-steam-text-muted text-sm">Нет аккаунтов онлайн</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {onlineAccounts.map((account) => {
              const isSelected = selectedAccount === account.id;
              return (
                <div
                  key={account.id}
                  onClick={() => !isRunning && setSelectedAccount(account.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-steam-accent/10 border-steam-accent/50"
                      : isRunning
                      ? "bg-steam-darker/50 border-steam-border opacity-50 cursor-not-allowed"
                      : "bg-steam-darker border-steam-border hover:border-steam-accent/30"
                  }`}
                >
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => {}}
                    disabled={isRunning}
                    className="w-4 h-4 rounded border-steam-border bg-steam-card text-steam-accent focus:ring-steam-accent"
                  />
                  <div className="w-10 h-10 rounded-lg bg-steam-card border border-steam-border flex items-center justify-center">
                    <i className="fas fa-user text-steam-text-muted" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white text-sm font-medium">{account.name}</h4>
                    <p className="text-steam-text-muted text-xs font-mono">{account.accountName}</p>
                    <p className="text-steam-text-muted text-xs">{account.friendsCount} друзей</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Comment input */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-steam-card border border-steam-border rounded-xl p-5">
        <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
          <i className="fas fa-comment text-steam-accent" />Текст комментария
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Введите комментарий для публикации на профилях друзей..."
          rows={4}
          disabled={isRunning}
          className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent resize-none disabled:opacity-50"
        />
        <p className="text-steam-text-muted text-xs mt-2">{comment.length} символов</p>
      </motion.div>

      {/* Delay settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-steam-card border border-steam-border rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-clock text-steam-yellow" />Задержка между комментариями
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={MIN_DELAY}
              max={120}
              step={1}
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value))}
              disabled={isRunning}
              className="flex-1 h-2 bg-steam-darker rounded-lg appearance-none cursor-pointer accent-steam-accent disabled:opacity-50"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={MIN_DELAY}
                max={300}
                value={delay}
                onChange={(e) => setDelay(Math.max(MIN_DELAY, parseInt(e.target.value) || MIN_DELAY))}
                disabled={isRunning}
                className="w-20 px-3 py-1.5 bg-steam-darker border border-steam-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-steam-accent disabled:opacity-50"
              />
              <span className="text-steam-text-muted text-xs">сек</span>
            </div>
          </div>
          <div className="p-3 bg-steam-yellow/10 border border-steam-yellow/30 rounded-lg">
            <p className="text-steam-yellow text-xs flex items-start gap-2">
              <i className="fas fa-exclamation-triangle mt-0.5" />
              <span><strong>Минимальная задержка: {MIN_DELAY} секунд.</strong> Можно увеличить, но нельзя уменьшить ниже минимума.</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary and action */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-steam-card border border-steam-border rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-info-circle text-steam-accent" />Сводка
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-steam-darker rounded-lg">
            <p className="text-steam-text-muted text-xs">Аккаунт</p>
            <p className="text-white font-bold text-sm truncate">{account?.name || "Не выбран"}</p>
          </div>
          <div className="text-center p-3 bg-steam-darker rounded-lg">
            <p className="text-steam-text-muted text-xs">Всего друзей</p>
            <p className="text-white font-bold text-lg">{totalFriends}</p>
          </div>
          <div className="text-center p-3 bg-steam-darker rounded-lg">
            <p className="text-steam-text-muted text-xs">Задержка</p>
            <p className="text-white font-bold text-lg">{delay}с</p>
          </div>
          <div className="text-center p-3 bg-steam-darker rounded-lg">
            <p className="text-steam-text-muted text-xs">Примерное время</p>
            <p className="text-white font-bold text-lg">{minutes > 0 ? `${minutes}м ` : ""}{seconds}с</p>
          </div>
        </div>
        <button
          onClick={handleStart}
          disabled={isRunning || !comment.trim() || !selectedAccount}
          className="w-full px-6 py-3 bg-steam-accent hover:bg-steam-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />Отправка...</>
          ) : (
            <><i className="fas fa-comment-dots" />Начать рассылку комментариев</>
          )}
        </button>
      </motion.div>

      {/* Progress with controls */}
      {progress && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-accent/30 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-tasks text-steam-accent" />Прогресс отправки
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-steam-darker rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <i className="fas fa-user text-steam-accent text-sm" />
                  <span className="text-white text-sm font-medium">{account?.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-steam-green"><i className="fas fa-check mr-1" />{progress.success}</span>
                  {progress.failed > 0 && <span className="text-steam-red"><i className="fas fa-times mr-1" />{progress.failed}</span>}
                  <span className="text-steam-text-muted">{progress.current}/{progress.total}</span>
                </div>
              </div>
              <div className="w-full h-2 bg-steam-card rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-full rounded-full ${broadcastControlState.isPaused ? "bg-steam-yellow" : isRunning ? "bg-steam-accent" : "bg-steam-green"}`}
                />
              </div>
              
              {/* Control buttons */}
              {isRunning && (
                <div className="flex gap-2">
                  {broadcastControlState.isPaused ? (
                    <button
                      onClick={handleResume}
                      className="flex-1 px-3 py-1.5 bg-steam-green/15 text-steam-green border border-steam-green/30 rounded-lg text-xs font-medium hover:bg-steam-green/25 transition-colors"
                    >
                      <i className="fas fa-play mr-1" />Продолжить
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex-1 px-3 py-1.5 bg-steam-yellow/15 text-steam-yellow border border-steam-yellow/30 rounded-lg text-xs font-medium hover:bg-steam-yellow/25 transition-colors"
                    >
                      <i className="fas fa-pause mr-1" />Пауза
                    </button>
                  )}
                  <button
                    onClick={handleStop}
                    className="flex-1 px-3 py-1.5 bg-steam-red/15 text-steam-red border border-steam-red/30 rounded-lg text-xs font-medium hover:bg-steam-red/25 transition-colors"
                  >
                    <i className="fas fa-stop mr-1" />Стоп
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {results && !isRunning && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-green/30 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-check-circle text-steam-green" />Результаты рассылки
          </h3>
          <div className="flex items-center justify-between p-3 bg-steam-darker rounded-lg">
            <div className="flex items-center gap-3">
              <i className="fas fa-user text-steam-accent" />
              <span className="text-white text-sm">{account?.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-steam-green"><i className="fas fa-check mr-1" />{results.success} успешно</span>
              {results.failed > 0 && <span className="text-steam-red"><i className="fas fa-times mr-1" />{results.failed} ошибок</span>}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-steam-accent/10 border border-steam-accent/30 rounded-xl p-4">
        <p className="text-steam-accent text-xs flex items-start gap-2">
          <i className="fas fa-info-circle mt-0.5" />
          <span><strong>Важно:</strong> Комментарии будут опубликованы на профилях всех друзей с указанной задержкой. Рекомендуется использовать задержку не менее 10 секунд.</span>
        </p>
      </motion.div>
    </div>
  );
}
