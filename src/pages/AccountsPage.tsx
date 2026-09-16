import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAppContext } from "../App";
import DelaySettingsModal from "../components/DelaySettingsModal";

export default function AccountsPage() {
  const { accounts, createAccount, login, deleteAccount, logout, steamGuardResponse, startFriendBot, stopFriendBot, fetchAccounts } = useAppContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [delaySettingsAccountId, setDelaySettingsAccountId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({ 
    accountName: "", 
    password: "", 
    steamGuardCode: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [steamGuardModal, setSteamGuardModal] = useState<{ accountId: string; domain: string | null } | null>(null);
  const [steamGuardCode, setSteamGuardCode] = useState("");
  const [isSubmittingGuard, setIsSubmittingGuard] = useState(false);

  const getStatusColor = (status: string) => status === "online" ? "text-steam-green" : status === "connecting" ? "text-steam-yellow" : status === "error" ? "text-steam-red" : "text-gray-400";
  const getStatusDot = (status: string) => status === "online" ? "bg-steam-green" : status === "connecting" ? "bg-steam-yellow animate-pulse" : status === "error" ? "bg-steam-red" : "bg-gray-500";
  const getStatusLabel = (status: string) => status === "online" ? "В сети" : status === "connecting" ? "Подключение..." : status === "error" ? "Ошибка" : "Не в сети";

  // Обработчик запроса Steam Guard кода
  useEffect(() => {
    const api = (window as any).steamBot;
    if (api?.onSteamGuardRequest) {
      api.onSteamGuardRequest((data: { accountId: string; domain: string | null }) => {
        console.log("Получен запрос Steam Guard:", data);
        setSteamGuardModal(data);
        setSteamGuardCode("");
      });
    }
  }, []);

  const handleSubmitSteamGuard = async () => {
    if (!steamGuardCode.trim()) {
      alert("Введите Steam Guard код!");
      return;
    }

    setIsSubmittingGuard(true);
    try {
      console.log("Отправка Steam Guard кода:", steamGuardCode, "для аккаунта:", steamGuardModal?.accountId);
      const result = await steamGuardResponse(steamGuardModal!.accountId, steamGuardCode);
      console.log("Результат отправки Steam Guard:", result);
      
      if (result.success) {
        setSteamGuardModal(null);
        setSteamGuardCode("");
      } else {
        alert("Ошибка: " + (result.error || "Неверный код"));
      }
    } catch (error) {
      console.error("Ошибка отправки Steam Guard:", error);
      alert("Ошибка при отправке кода");
    } finally {
      setIsSubmittingGuard(false);
    }
  };

  const handleCreateAndLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    
    if (!newAccount.accountName || !newAccount.password) {
      setError("Введите Steam логин и пароль!");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Создание аккаунта...", newAccount.accountName);
      
      const result = await createAccount({
        name: newAccount.accountName,
        accountName: newAccount.accountName,
        password: newAccount.password,
      });
      console.log("Результат создания:", result);
      
      if (result.success && result.id) {
        const accountId = result.id;
        console.log("Вход в аккаунт...", accountId);
        const loginResult = await login(accountId, {
          password: newAccount.password,
          steamGuardCode: newAccount.steamGuardCode,
        });
        console.log("Результат входа:", loginResult);
        
        if (loginResult.success) {
          setShowAddModal(false);
          setNewAccount({ accountName: "", password: "", steamGuardCode: "" });
          await fetchAccounts();
        } else {
          setError(loginResult.error || "Ошибка входа");
        }
      } else {
        setError("Ошибка создания аккаунта");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      setError("Ошибка при подключении: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Аккаунты</h1>
          <p className="text-steam-text-muted text-sm mt-1">{accounts.filter((a) => a.status === "online").length} из {accounts.length} в сети</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-steam-accent hover:bg-steam-accent-hover text-white rounded-lg transition-colors text-sm font-medium">
          <i className="fas fa-plus text-xs" />
          Добавить аккаунт
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-user-plus text-4xl text-steam-text-muted mb-3" />
          <p className="text-steam-text-muted">Нет аккаунтов</p>
          <p className="text-steam-text-muted text-xs mt-1">Нажмите "Добавить аккаунт" чтобы начать</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-steam-card border border-steam-border rounded-xl p-5 hover:border-steam-accent/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-steam-darker border border-steam-border flex items-center justify-center">
                      <i className="fas fa-user text-steam-text-muted text-lg" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getStatusDot(account.status)} border-2 border-steam-card`} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{account.name}</h3>
                    <p className="text-steam-text-muted text-xs font-mono">{account.accountName}</p>
                    <span className={`text-xs ${getStatusColor(account.status)}`}>{getStatusLabel(account.status)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setDelaySettingsAccountId(account.id)} className="w-8 h-8 rounded-lg bg-steam-darker flex items-center justify-center text-steam-text-muted hover:text-steam-accent transition-colors" title="Настройки задержек">
                      <i className="fas fa-sliders-h text-sm" />
                    </button>
                    <button type="button" onClick={() => setSelectedAccount(account)} className="w-8 h-8 rounded-lg bg-steam-darker flex items-center justify-center text-steam-text-muted hover:text-white transition-colors">
                      <i className="fas fa-ellipsis-v text-sm" />
                    </button>                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-steam-darker rounded-lg">
                  <p className="text-white font-bold text-sm">{account.friendsCount}</p>
                  <p className="text-steam-text-muted text-[10px]">Друзья</p>
                </div>
                <div className="text-center p-2 bg-steam-darker rounded-lg">
                  <p className="text-white font-bold text-sm">{account.hoursFarmed.toFixed(1)}</p>
                  <p className="text-steam-text-muted text-[10px]">Часы</p>
                </div>
                <div className="text-center p-2 bg-steam-darker rounded-lg">
                  <p className="text-white font-bold text-sm">{account.stats.friendsAdded}</p>
                  <p className="text-steam-text-muted text-[10px]">Добавлено</p>
                </div>
                <div className="text-center p-2 bg-steam-darker rounded-lg">
                  <p className="text-white font-bold text-sm">{account.queueLength || 0}</p>
                  <p className="text-steam-text-muted text-[10px]">В очереди</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4 flex-wrap">
                {account.friendBotActive && (
                  <span className="px-2 py-1 bg-steam-accent/15 text-steam-accent rounded-md text-xs font-medium">
                    <i className="fas fa-user-plus mr-1" />Бот друзей
                  </span>
                )}
                {account.hourFarmActive && (
                  <span className="px-2 py-1 bg-steam-green/15 text-steam-green rounded-md text-xs font-medium">
                    <i className="fas fa-clock mr-1" />Фарм часов
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {account.status === "online" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => account.friendBotActive ? stopFriendBot(account.id) : startFriendBot(account.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        account.friendBotActive ? "bg-steam-accent/15 text-steam-accent border border-steam-accent/30 hover:bg-steam-accent/25" : "bg-steam-darker text-steam-text-muted border border-steam-border hover:border-steam-accent/30"
                      }`}
                    >
                      <i className={`fas ${account.friendBotActive ? "fa-stop" : "fa-play"} mr-1`} />
                      {account.friendBotActive ? "Остановить бота" : "Запустить бота"}
                    </button>
                    <button type="button" onClick={() => logout(account.id)} className="px-3 py-2 bg-steam-red/15 text-steam-red border border-steam-red/30 rounded-lg text-xs font-medium hover:bg-steam-red/25 transition-colors">
                      <i className="fas fa-sign-out-alt" />
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => login(account.id, {})} className="flex-1 px-3 py-2 bg-steam-green/15 text-steam-green border border-steam-green/30 rounded-lg text-xs font-medium hover:bg-steam-green/25 transition-colors">
                    <i className="fas fa-sign-in-alt mr-1" />Войти
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {delaySettingsAccountId && <DelaySettingsModal accountId={delaySettingsAccountId} onClose={() => setDelaySettingsAccountId(null)} />}

      {showAddModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !isLoading && setShowAddModal(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="bg-steam-card border border-steam-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Вход в Steam</h3>
            <form onSubmit={handleCreateAndLogin} className="space-y-4">
              <div>
                <label className="text-steam-text-muted text-sm mb-1 block">Steam логин</label>
                <input 
                  type="text" 
                  value={newAccount.accountName} 
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })} 
                  placeholder="Ваш Steam логин" 
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent disabled:opacity-50" 
                />
              </div>
              <div>
                <label className="text-steam-text-muted text-sm mb-1 block">Пароль</label>
                <input 
                  type="password" 
                  value={newAccount.password} 
                  onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} 
                  placeholder="Ваш пароль" 
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent disabled:opacity-50" 
                />
              </div>
              
              {error && (
                <div className="p-3 bg-steam-red/10 border border-steam-red/30 rounded-lg">
                  <p className="text-steam-red text-xs flex items-center gap-2">
                    <i className="fas fa-exclamation-circle" />
                    {error}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 mt-6">
                <button 
                  type="submit"
                  disabled={isLoading || !newAccount.accountName || !newAccount.password} 
                  className="flex-1 px-4 py-2 bg-steam-accent hover:bg-steam-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {isLoading ? (
                    <><i className="fas fa-spinner fa-spin mr-2" />Подключение...</>
                  ) : (
                    <><i className="fas fa-sign-in-alt mr-2" />Войти</>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)} 
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-steam-darker border border-steam-border text-steam-text rounded-lg transition-colors text-sm font-medium"
                >
                  Отмена
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {selectedAccount && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedAccount(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="bg-steam-card border border-steam-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">{selectedAccount.name}</h3>
              <button onClick={() => setSelectedAccount(null)} className="w-8 h-8 rounded-lg bg-steam-darker flex items-center justify-center text-steam-text-muted hover:text-white transition-colors">
                <i className="fas fa-times text-sm" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between p-3 bg-steam-darker rounded-lg">
                <span className="text-steam-text-muted text-sm">Логин</span>
                <span className="text-white text-sm font-mono">{selectedAccount.accountName}</span>
              </div>
              <div className="flex justify-between p-3 bg-steam-darker rounded-lg">
                <span className="text-steam-text-muted text-sm">Статус</span>
                <span className={`text-sm font-medium ${getStatusColor(selectedAccount.status)}`}>{getStatusLabel(selectedAccount.status)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setSelectedAccount(null); setDelaySettingsAccountId(selectedAccount.id); }} className="flex-1 px-4 py-2 bg-steam-accent/15 text-steam-accent border border-steam-accent/30 rounded-lg text-sm font-medium hover:bg-steam-accent/25 transition-colors">
                <i className="fas fa-sliders-h mr-2" />Настройки задержек
              </button>
              <button type="button" onClick={async () => { 
                if (confirm("Удалить аккаунт?")) { 
                  await deleteAccount(selectedAccount.id); 
                  await fetchAccounts();
                  setSelectedAccount(null); 
                } 
              }} className="px-4 py-2 bg-steam-red/15 text-steam-red border border-steam-red/30 rounded-lg text-sm font-medium hover:bg-steam-red/25 transition-colors">
                <i className="fas fa-trash" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Модальное окно для ввода Steam Guard кода */}
      {steamGuardModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-steam-card border border-steam-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fas fa-shield-alt text-steam-yellow" />
              Требуется Steam Guard код
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-steam-yellow/10 border border-steam-yellow/30 rounded-lg">
                <p className="text-steam-yellow text-sm">
                  <i className="fas fa-info-circle mr-2" />
                  Steam запрашивает код подтверждения
                  {steamGuardModal.domain && (
                    <span className="block mt-1 text-xs">
                      Домен: <span className="font-mono">{steamGuardModal.domain}</span>
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-steam-text-muted text-sm mb-1 block">Код из Steam Guard</label>
                <input 
                  type="text" 
                  value={steamGuardCode}
                  onChange={(e) => setSteamGuardCode(e.target.value)}
                  placeholder="XXXXX" 
                  disabled={isSubmittingGuard}
                  autoFocus
                  className="w-full px-3 py-2 bg-steam-darker border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent disabled:opacity-50" 
                />
                <p className="text-steam-text-muted text-xs mt-1">
                  Введите 5-значный код из мобильного приложения Steam Guard или email
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button 
                type="button"
                onClick={handleSubmitSteamGuard}
                disabled={isSubmittingGuard || !steamGuardCode.trim()}
                className="flex-1 px-4 py-2 bg-steam-accent hover:bg-steam-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isSubmittingGuard ? (
                  <><i className="fas fa-spinner fa-spin mr-2" />Отправка...</>
                ) : (
                  <><i className="fas fa-check mr-2" />Подтвердить</>
                )}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSteamGuardModal(null);
                  setSteamGuardCode("");
                }}
                disabled={isSubmittingGuard}
                className="flex-1 px-4 py-2 bg-steam-darker border border-steam-border text-steam-text rounded-lg transition-colors text-sm font-medium"
              >
                Отмена
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
