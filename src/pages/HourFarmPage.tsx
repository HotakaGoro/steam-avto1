import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAppContext } from "../App";

const GAME_DATABASE: Record<number, { name: string; icon: string }> = {
  730: { name: "Counter-Strike 2", icon: "🔫" },
  570: { name: "Dota 2", icon: "⚔️" },
  440: { name: "Team Fortress 2", icon: "🎩" },
  753: { name: "Steam (idle)", icon: "🎮" },
  252490: { name: "Rust", icon: "🏚️" },
  1091500: { name: "Cyberpunk 2077", icon: "🌆" },
  1172470: { name: "Apex Legends", icon: "🎯" },
  578080: { name: "PUBG", icon: "🪖" },
  271590: { name: "GTA V", icon: "🚗" },
  1085660: { name: "Destiny 2", icon: "🌌" },
};

const getGameInfo = (appId: number) => GAME_DATABASE[appId] || { name: `App #${appId}`, icon: "🎮" };

export default function HourFarmPage() {
  const { accounts, isRealElectron, startHourFarm, stopHourFarm, updateSettings } = useAppContext();
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [newGameInputs, setNewGameInputs] = useState<Record<string, string>>({});

  const onlineAccounts = accounts.filter((a) => a.status === "online");
  const farmingAccounts = accounts.filter((a) => a.hourFarmActive);
  const totalHours = accounts.reduce((sum, a) => sum + a.hoursFarmed, 0);

  const getAccountGames = (account: any) => account?.settings?.farmGames || [];

  const addGameToAccount = async (accountId: string, appId: number) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const currentGames = getAccountGames(account);
    if (currentGames.includes(appId)) return;
    const newGames = [...currentGames, appId];
    await updateSettings(accountId, { farmGames: newGames });
    setNewGameInputs((prev) => ({ ...prev, [accountId]: "" }));
  };

  const removeGameFromAccount = async (accountId: string, appId: number) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const newGames = getAccountGames(account).filter((g: number) => g !== appId);
    await updateSettings(accountId, { farmGames: newGames });
  };

  const handleAddGame = (accountId: string) => {
    const input = newGameInputs[accountId] || "";
    const ids = input.split(/[\s,]+/).map((s) => s.trim()).filter((s) => s.length > 0).map((s) => parseInt(s)).filter((n) => !isNaN(n) && n > 0);
    if (ids.length === 0) return;
    ids.forEach((id) => addGameToAccount(accountId, id));
    setNewGameInputs((prev) => ({ ...prev, [accountId]: "" }));
  };

  const handleStartFarm = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const games = getAccountGames(account);
    if (games.length === 0) {
      alert("Добавьте хотя бы одну игру для фарма!");
      return;
    }
    await startHourFarm(accountId, games);
  };

  const quickGames = [
    { id: 730, name: "CS2", icon: "🔫" },
    { id: 570, name: "Dota 2", icon: "⚔️" },
    { id: 440, name: "TF2", icon: "🎩" },
    { id: 753, name: "Idle", icon: "🎮" },
    { id: 252490, name: "Rust", icon: "🏚️" },
    { id: 271590, name: "GTA V", icon: "🚗" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Фарм часов</h1>
        <p className="text-steam-text-muted text-sm mt-1">Управляйте фармом часов для каждого аккаунта отдельно</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-steam-card border border-steam-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-steam-green to-green-700 flex items-center justify-center">
              <i className="fas fa-clock text-white text-sm" />
            </div>
            <div>
              <p className="text-steam-text-muted text-xs">Всего часов</p>
              <p className="text-xl font-bold text-white">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-steam-card border border-steam-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-steam-accent to-blue-700 flex items-center justify-center">
              <i className="fas fa-play text-white text-sm" />
            </div>
            <div>
              <p className="text-steam-text-muted text-xs">Фармят сейчас</p>
              <p className="text-xl font-bold text-white">{farmingAccounts.length}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-steam-card border border-steam-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <i className="fas fa-server text-white text-sm" />
            </div>
            <div>
              <p className="text-steam-text-muted text-xs">Онлайн аккаунтов</p>
              <p className="text-xl font-bold text-white">{onlineAccounts.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="space-y-3">
        {accounts.map((account, i) => {
          const games = getAccountGames(account);
          const isExpanded = expandedAccount === account.id;
          const isOnline = account.status === "online";

          return (
            <motion.div key={account.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-steam-card border border-steam-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-steam-card-hover transition-colors" onClick={() => setExpandedAccount(isExpanded ? null : account.id)}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-steam-darker border border-steam-border flex items-center justify-center">
                      <i className="fas fa-user text-steam-text-muted" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-steam-card ${isOnline ? "bg-steam-green" : "bg-gray-500"}`} />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-medium">{account.name}</h4>
                    <p className="text-steam-text-muted text-xs font-mono">{account.accountName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-steam-darker rounded-md">
                      <i className="fas fa-gamepad text-steam-accent text-[10px]" />
                      <span className="text-steam-text text-xs font-medium">{games.length}</span>
                    </div>
                    <span className="text-steam-text-muted text-xs hidden sm:inline">игр</span>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-white font-bold text-sm">{account.hoursFarmed.toFixed(1)}ч</p>
                    <p className="text-steam-text-muted text-[10px]">накопано</p>
                  </div>
                  {account.hourFarmActive && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-steam-green/15 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-steam-green animate-pulse" />
                      <span className="text-steam-green text-xs font-medium">Фармит</span>
                    </div>
                  )}
                  <i className={`fas fa-chevron-${isExpanded ? "up" : "down"} text-steam-text-muted text-sm transition-transform`} />
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-steam-border overflow-hidden">
                    <div className="p-4 space-y-4">
                      <div>
                        <h5 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                          <i className="fas fa-list text-steam-accent text-xs" />Игры для фарма ({games.length})
                        </h5>
                        {games.length === 0 ? (
                          <div className="p-4 bg-steam-darker rounded-lg text-center">
                            <i className="fas fa-gamepad text-2xl text-steam-text-muted mb-2" />
                            <p className="text-steam-text-muted text-sm">Нет добавленных игр</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {games.map((appId: number) => {
                              const gameInfo = getGameInfo(appId);
                              return (
                                <motion.div key={appId} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 px-3 py-2 bg-steam-darker border border-steam-border rounded-lg group hover:border-steam-accent/30 transition-colors">
                                  <span className="text-base">{gameInfo.icon}</span>
                                  <div>
                                    <p className="text-white text-xs font-medium">{gameInfo.name}</p>
                                    <p className="text-steam-text-muted text-[10px] font-mono">App ID: {appId}</p>
                                  </div>
                                  <button onClick={() => removeGameFromAccount(account.id, appId)} className="ml-2 w-5 h-5 rounded-full bg-steam-red/15 text-steam-red flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-steam-red/25" title="Удалить игру">
                                    <i className="fas fa-times text-[8px]" />
                                  </button>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                          <i className="fas fa-plus text-steam-green text-xs" />Добавить игру
                        </h5>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <i className="fas fa-hashtag absolute left-3 top-1/2 -translate-y-1/2 text-steam-text-muted text-sm" />
                            <input
                              type="text"
                              value={newGameInputs[account.id] || ""}
                              onChange={(e) => setNewGameInputs((prev) => ({ ...prev, [account.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") handleAddGame(account.id); }}
                              placeholder="App ID (можно несколько через запятую: 730, 570, 440)"
                              className="w-full pl-8 pr-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent"
                            />
                          </div>
                          <button onClick={() => handleAddGame(account.id)} disabled={!newGameInputs[account.id]?.trim()} className="px-4 py-2 bg-steam-green/15 text-steam-green border border-steam-green/30 rounded-lg text-sm font-medium hover:bg-steam-green/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <i className="fas fa-plus mr-1" />Добавить
                          </button>
                        </div>
                        <p className="text-steam-text-muted text-xs mt-1.5">💡 Найдите App ID в URL: store.steampowered.com/app/<span className="text-steam-accent">730</span>/</p>
                      </div>

                      <div>
                        <h5 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                          <i className="fas fa-star text-steam-yellow text-xs" />Быстрое добавление
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {quickGames.map((game) => {
                            const alreadyAdded = games.includes(game.id);
                            return (
                              <button key={game.id} onClick={() => !alreadyAdded && addGameToAccount(account.id, game.id)} disabled={alreadyAdded} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${alreadyAdded ? "bg-steam-accent/10 text-steam-accent/50 border border-steam-accent/20 cursor-not-allowed" : "bg-steam-darker text-steam-text border border-steam-border hover:border-steam-accent/30 hover:text-white"}`}>
                                <span>{game.icon}</span>
                                <span>{game.name}</span>
                                {alreadyAdded && <i className="fas fa-check text-[8px]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-steam-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {account.hourFarmActive ? (
                            <>
                              <span className="text-steam-green text-sm font-medium"><i className="fas fa-circle text-[8px] animate-pulse mr-1" />Фарм активен</span>
                              <span className="text-steam-text-muted text-xs">Игры: [{games.join(", ")}]</span>
                            </>
                          ) : (
                            <span className="text-steam-text-muted text-sm">Готов к запуску</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {account.hourFarmActive ? (
                            <button onClick={() => stopHourFarm(account.id)} className="px-4 py-2 bg-steam-red/15 text-steam-red border border-steam-red/30 rounded-lg text-sm font-medium hover:bg-steam-red/25 transition-colors">
                              <i className="fas fa-stop mr-1" />Остановить
                            </button>
                          ) : (
                            <button onClick={() => handleStartFarm(account.id)} disabled={!isOnline || games.length === 0} className="px-4 py-2 bg-steam-green/15 text-steam-green border border-steam-green/30 rounded-lg text-sm font-medium hover:bg-steam-green/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <i className="fas fa-play mr-1" />Запустить фарм
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {farmingAccounts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-steam-card border border-steam-green/30 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-steam-green animate-pulse" />Активный фарм
          </h3>
          <div className="space-y-2">
            {farmingAccounts.map((account) => {
              const games = getAccountGames(account);
              return (
                <div key={account.id} className="flex items-center justify-between p-3 bg-steam-darker rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-gamepad text-steam-green" />
                    <div>
                      <span className="text-white text-sm font-medium">{account.name}</span>
                      <div className="flex gap-1 mt-0.5">
                        {games.slice(0, 5).map((appId: number) => (
                          <span key={appId} className="text-[10px] px-1.5 py-0.5 bg-steam-card rounded text-steam-text-muted">
                            {getGameInfo(appId).icon} {appId}
                          </span>
                        ))}
                        {games.length > 5 && <span className="text-[10px] px-1.5 py-0.5 bg-steam-card rounded text-steam-text-muted">+{games.length - 5}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-sm">{account.hoursFarmed.toFixed(1)}ч</span>
                    <button onClick={() => stopHourFarm(account.id)} className="text-steam-red text-xs hover:underline"><i className="fas fa-stop mr-1" />Стоп</button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
