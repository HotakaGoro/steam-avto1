import { motion } from "framer-motion";
import type { Page } from "../App";

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "accounts", label: "Аккаунты", icon: "fa-user-circle" },
  { id: "hourfarm", label: "Фарм часов", icon: "fa-clock" },
  { id: "invite", label: "Приглашения", icon: "fa-user-plus" },
  { id: "broadcast", label: "Рассылка", icon: "fa-bullhorn" },
  { id: "comments", label: "Комментарии", icon: "fa-comment-dots" },
  { id: "logs", label: "Логи", icon: "fa-scroll" },
  { id: "settings", label: "Настройки", icon: "fa-gear" },
  { id: "creator", label: "Памятка создателя", icon: "fa-heart" },
];

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 240 : 64 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col h-full bg-steam-darker border-r border-steam-border z-10"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-6 w-6 h-6 bg-steam-card border border-steam-border rounded-full flex items-center justify-center text-steam-text-muted hover:text-steam-accent hover:border-steam-accent transition-colors z-20"
      >
        <i className={`fas fa-chevron-${isOpen ? "left" : "right"} text-[10px]`} />
      </button>

      <div className="flex items-center gap-3 px-4 py-5 border-b border-steam-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-steam-accent to-blue-700 flex items-center justify-center flex-shrink-0">
          <i className="fas fa-robot text-white text-sm" />
        </div>
        {isOpen && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-white text-sm whitespace-nowrap">
            Steam Friend Bot
          </motion.span>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-steam-accent/15 text-steam-accent border border-steam-accent/30"
                  : "text-steam-text-muted hover:text-steam-text hover:bg-steam-card border border-transparent"
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center text-sm`} />
              {isOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 border-t border-steam-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-steam-green animate-pulse" />
            <span className="text-xs text-steam-text-muted">v2.0.0</span>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
