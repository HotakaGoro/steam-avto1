import { motion } from "framer-motion";
import { useState } from "react";
import { useAppContext } from "../App";

export default function LogsPage() {
  const { logs } = useAppContext();
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error" | "success">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.level === filter;
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.accountId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info": return "fa-info text-steam-accent";
      case "warn": return "fa-exclamation-triangle text-steam-yellow";
      case "error": return "fa-times-circle text-steam-red";
      case "success": return "fa-check-circle text-steam-green";
      default: return "fa-circle text-gray-500";
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case "info": return "border-l-steam-accent";
      case "warn": return "border-l-steam-yellow";
      case "error": return "border-l-steam-red";
      case "success": return "border-l-steam-green";
      default: return "border-l-gray-500";
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return timestamp;
    }
  };

  const logCounts = {
    all: logs.length,
    info: logs.filter((l) => l.level === "info").length,
    warn: logs.filter((l) => l.level === "warn").length,
    error: logs.filter((l) => l.level === "error").length,
    success: logs.filter((l) => l.level === "success").length,
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Логи</h1>
          <p className="text-steam-text-muted text-sm mt-1">{filteredLogs.length} записей</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-steam-text-muted text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск в логах..."
            className="w-full pl-9 pr-4 py-2.5 bg-steam-card border border-steam-border rounded-lg text-white text-sm placeholder:text-steam-text-muted focus:outline-none focus:border-steam-accent"
          />
        </div>
        <div className="flex gap-1 bg-steam-card border border-steam-border rounded-lg p-1 flex-wrap">
          {(["all", "info", "success", "warn", "error"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f ? "bg-steam-accent text-white" : "text-steam-text-muted hover:text-white"
              }`}
            >
              {f === "all" ? "Все" : f === "info" ? "Info" : f === "success" ? "OK" : f === "warn" ? "Warn" : "Error"}
              <span className="ml-1 opacity-60">{logCounts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-steam-darker border border-steam-border rounded-xl">
        <div className="p-2 space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-scroll text-4xl text-steam-text-muted mb-3" />
              <p className="text-steam-text-muted">Логи пусты</p>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <motion.div
                key={`${log.timestamp}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className={`flex items-start gap-3 p-2.5 rounded-lg border-l-2 ${getLevelBg(log.level)} hover:bg-steam-card/50 transition-colors`}
              >
                <i className={`fas ${getLevelIcon(log.level)} text-xs mt-0.5 w-4 text-center`} />
                <span className="text-steam-text-muted text-xs font-mono whitespace-nowrap mt-0.5">{formatTime(log.timestamp)}</span>
                <span className="text-steam-accent text-xs font-mono font-medium whitespace-nowrap mt-0.5">[{log.accountId}]</span>
                <span className="text-steam-text text-sm flex-1 break-all">{log.message}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
