import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAppContext } from "../App";

const getStatusLabel = (status: number) => status === 1 ? "В сети" : status === 2 ? "Занят" : status === 3 ? "В игре" : status === 4 ? "Отсутствует" : "Не в сети";
const getStatusColor = (status: number) => status === 1 ? "bg-steam-online" : status === 2 ? "bg-steam-red" : status === 3 ? "bg-steam-ingame" : status === 4 ? "bg-steam-yellow" : "bg-gray-500";

export default function InviteFriendsPage() {
  const { accounts, isRealElectron, getFriendsList, inviteFriendsToGroup, inviteProgress, inviteControlState, pauseInvite, resumeInvite, stopInvite } = useAppContext();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [groupId, setGroupId] = useState("");
  const [friendsByAccount, setFriendsByAccount] = useState<Record<string, any[]>>({});
  const [selectedFriends, setSelectedFriends] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  const onlineAccounts = accounts.filter((a) => a.status === "online");

  const loadFriends = async (accountId: string) => {
    setLoading(true);
    try {
      const result = await getFriendsList(accountId);
      if (result.success && result.friends) {
        setFriendsByAccount((prev) => ({ ...prev, [accountId]: result.friends! }));
        setSelectedFriends((prev) => ({ ...prev, [accountId]: [] }));
      }
    } catch (err) {
      console.error("Failed to load friends:", err);
    }
    setLoading(false);
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) => {
      const newSelection = prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId];
      if (!prev.includes(accountId)) loadFriends(accountId);
      return newSelection;
    });
  };

  const toggleFriend = (accountId: string, steamId: string) => {
    setSelectedFriends((prev) => {
      const current = prev[accountId] || [];
      const newSelection = current.includes(steamId) ? current.filter((id) => id !== steamId) : [...current, steamId];
      return { ...prev, [accountId]: newSelection };
    });
  };

  const selectAllFriends = (accountId: string) => {
    const friends = friendsByAccount[accountId] || [];
    setSelectedFriends((prev) => ({
      ...prev,
      [accountId]: friends.map((f) => f.steamId),
    }));
  };

  const deselectAllFriends = (accountId: string) => {
    setSelectedFriends((prev) => ({
      ...prev,
      [accountId]: [],
    }));
  };

  const handleInvite = async () => {
    if (!groupId.trim()) { alert("Введите Steam ID группы!"); return; }
    if (selectedAccounts.length === 0) { alert("Выберите хотя бы один аккаунт!"); return; }

    setInviting(true);
    setResults({});

    for (const accountId of selectedAccounts) {
      const friends = selectedFriends[accountId] || [];
      if (friends.length === 0) continue;

      try {
        const result = await inviteFriendsToGroup(accountId, groupId, friends);
        if (result.success && result.results) {
          setResults((prev) => ({ ...prev, [accountId]: result.results! }));
        }
      } catch (err) {
        console.error("Invite failed:", err);
      }
    }
    setInviting(false);
  };

  const handlePause = async (accountId: string) => {
    await pauseInvite(accountId);
  };

  const handleResume = async (accountId: string) => {
    await resumeInvite(accountId);
  };

  const handleStop = async (accountId: string) => {
    await stopInvite(accountId);
  };

  const totalSelected = Object.values(selectedFriends).reduce((sum, arr) => sum + arr.length, 0);
  const isRunning = inviteProgress !== null && !inviteControlState.isStopped;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Приглашение друзей в группу</h1>
        <p className="text-steam-text-muted text-sm mt-1">Массовое приглашение друзей из выбранных аккаунтов в Steam группу</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-border rounded-xl p-5">
        <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
          <i className="fas fa-users text-steam-accent" />Steam ID группы
        </label>
        <input type="text" value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="10358279142977246" className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent" />
        <p className="text-steam-text-muted text-xs mt-2">💡 Найдите ID группы в URL: steamcommunity.com/groups/<span className="text-steam-accent">groupname</span></p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-steam-card border border-steam-border rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-user-circle text-steam-accent" />Выберите аккаунты
        </h3>
        {onlineAccounts.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-user-slash text-3xl text-steam-text-muted mb-2" />
            <p className="text-steam-text-muted text-sm">Нет аккаунтов онлайн</p>
          </div>
        ) : (
          <div className="space-y-2">
            {onlineAccounts.map((account) => {
              const isSelected = selectedAccounts.includes(account.id);
              const friends = friendsByAccount[account.id] || [];
              const selectedCount = (selectedFriends[account.id] || []).length;

              return (
                <div key={account.id} className="border border-steam-border rounded-lg overflow-hidden">
                  <div className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isSelected ? "bg-steam-accent/10" : "bg-steam-darker hover:bg-steam-card-hover"}`} onClick={() => toggleAccount(account.id)}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-4 h-4 rounded border-steam-border bg-steam-darker text-steam-accent focus:ring-steam-accent" />
                      <div className="w-8 h-8 rounded-lg bg-steam-card border border-steam-border flex items-center justify-center">
                        <i className="fas fa-user text-steam-text-muted text-sm" />
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-medium">{account.name}</h4>
                        <p className="text-steam-text-muted text-xs font-mono">{account.accountName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSelected && friends.length > 0 && <span className="text-steam-accent text-xs">{selectedCount}/{friends.length} выбрано</span>}
                      <span className="text-steam-text-muted text-xs">{account.friendsCount} друзей</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isSelected && friends.length > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-steam-border overflow-hidden">
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-xs font-medium">Друзья аккаунта</span>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); selectAllFriends(account.id); }} className="text-steam-accent text-xs hover:underline">Выбрать всех</button>
                              <button onClick={(e) => { e.stopPropagation(); deselectAllFriends(account.id); }} className="text-steam-text-muted text-xs hover:underline">Снять выделение</button>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {friends.map((friend) => {
                              const isFriendSelected = (selectedFriends[account.id] || []).includes(friend.steamId);
                              return (
                                <div key={friend.steamId} onClick={(e) => { e.stopPropagation(); toggleFriend(account.id, friend.steamId); }} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isFriendSelected ? "bg-steam-accent/15 border border-steam-accent/30" : "bg-steam-darker border border-transparent hover:border-steam-border"}`}>
                                  <input type="checkbox" checked={isFriendSelected} onChange={() => {}} className="w-3.5 h-3.5 rounded border-steam-border bg-steam-card text-steam-accent focus:ring-steam-accent" />
                                  <div className={`w-2 h-2 rounded-full ${getStatusColor(friend.status)}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-medium truncate">{friend.name}</p>
                                    <p className="text-steam-text-muted text-[10px] font-mono truncate">{friend.steamId}</p>
                                  </div>
                                  <span className="text-steam-text-muted text-[10px]">{getStatusLabel(friend.status)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isSelected && loading && !friendsByAccount[account.id] && (
                    <div className="p-4 text-center border-t border-steam-border">
                      <i className="fas fa-spinner fa-spin text-steam-accent" />
                      <p className="text-steam-text-muted text-xs mt-2">Загрузка друзей...</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Progress with controls */}
      {inviteProgress && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-accent/30 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-tasks text-steam-accent" />Прогресс приглашений
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-steam-darker rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <i className="fas fa-user text-steam-accent text-sm" />
                  <span className="text-white text-sm font-medium">
                    {accounts.find((a) => a.id === inviteProgress.accountId)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-steam-green"><i className="fas fa-check mr-1" />{inviteProgress.success}</span>
                  {inviteProgress.failed > 0 && <span className="text-steam-red"><i className="fas fa-times mr-1" />{inviteProgress.failed}</span>}
                  <span className="text-steam-text-muted">{inviteProgress.current}/{inviteProgress.total}</span>
                </div>
              </div>
              <div className="w-full h-2 bg-steam-card rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(inviteProgress.current / inviteProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-full rounded-full ${inviteControlState.isPaused ? "bg-steam-yellow" : isRunning ? "bg-steam-accent" : "bg-steam-green"}`}
                />
              </div>
              
              {/* Control buttons */}
              {isRunning && (
                <div className="flex gap-2">
                  {inviteControlState.isPaused ? (
                    <button
                      onClick={() => handleResume(inviteProgress.accountId)}
                      className="flex-1 px-3 py-1.5 bg-steam-green/15 text-steam-green border border-steam-green/30 rounded-lg text-xs font-medium hover:bg-steam-green/25 transition-colors"
                    >
                      <i className="fas fa-play mr-1" />Продолжить
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePause(inviteProgress.accountId)}
                      className="flex-1 px-3 py-1.5 bg-steam-yellow/15 text-steam-yellow border border-steam-yellow/30 rounded-lg text-xs font-medium hover:bg-steam-yellow/25 transition-colors"
                    >
                      <i className="fas fa-pause mr-1" />Пауза
                    </button>
                  )}
                  <button
                    onClick={() => handleStop(inviteProgress.accountId)}
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

      {Object.keys(results).length > 0 && !isRunning && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-green/30 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-check-circle text-steam-green" />Результаты приглашения
          </h3>
          <div className="space-y-2">
            {Object.entries(results).map(([accountId, result]) => {
              const account = accounts.find((a) => a.id === accountId);
              return (
                <div key={accountId} className="flex items-center justify-between p-3 bg-steam-darker rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-user text-steam-accent" />
                    <span className="text-white text-sm">{account?.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-steam-green"><i className="fas fa-check mr-1" />{result.success} успешно</span>
                    {result.failed > 0 && <span className="text-steam-red"><i className="fas fa-times mr-1" />{result.failed} ошибок</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex items-center justify-between bg-steam-card border border-steam-border rounded-xl p-5">
        <div>
          <p className="text-white text-sm font-medium">Выбрано аккаунтов: <span className="text-steam-accent">{selectedAccounts.length}</span></p>
          <p className="text-steam-text-muted text-xs mt-1">Всего друзей для приглашения: <span className="text-steam-accent">{totalSelected}</span></p>
        </div>
        <button onClick={handleInvite} disabled={inviting || !groupId.trim() || selectedAccounts.length === 0 || totalSelected === 0} className="px-6 py-3 bg-steam-accent hover:bg-steam-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          {inviting ? (<><i className="fas fa-spinner fa-spin" />Приглашение...</>) : (<><i className="fas fa-paper-plane" />Пригласить в группу</>)}
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-steam-accent/10 border border-steam-accent/30 rounded-xl p-4">
        <p className="text-steam-accent text-xs flex items-start gap-2">
          <i className="fas fa-info-circle mt-0.5" />
          <span><strong>Важно:</strong> Между приглашениями будет задержка 1 секунда. Steam может ограничить количество приглашений в день (~20-30 на аккаунт).</span>
        </p>
      </motion.div>
    </div>
  );
}
