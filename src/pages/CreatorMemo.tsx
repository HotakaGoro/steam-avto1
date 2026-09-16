import { motion } from "framer-motion";

export default function CreatorMemo() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Памятка создателя</h1>
        <p className="text-steam-text-muted text-sm mt-1">Информация о разработчике</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-steam-card border border-steam-border rounded-xl p-8"
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-steam-accent to-blue-700 flex items-center justify-center">
            <i className="fas fa-user-circle text-white text-6xl" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">HotakaGoro</h2>
            <p className="text-steam-text-muted text-lg">Создатель Steam Friend Bot</p>
          </div>

          <div className="pt-6 border-t border-steam-border space-y-4">
            <div className="flex items-center justify-center gap-3">
              <i className="fas fa-envelope text-steam-accent text-xl" />
              <a
                href="mailto:hotaka.goro@gmail.com"
                className="text-white text-lg hover:text-steam-accent transition-colors"
              >
                hotaka.goro@gmail.com
              </a>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <p className="text-steam-text-muted text-sm">
              Спасибо за использование Steam Friend Bot!
            </p>
            <p className="text-steam-text-muted text-xs">
              Если у вас есть вопросы или предложения, не стесняйтесь обращаться.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-steam-accent/10 border border-steam-accent/30 rounded-xl p-4"
      >
        <p className="text-steam-accent text-xs flex items-start gap-2">
          <i className="fas fa-info-circle mt-0.5" />
          <span>
            <strong>Версия приложения:</strong> 2.0.0<br />
            <strong>Дата создания:</strong> 2024<br />
            <strong>Технологии:</strong> Electron, React, TypeScript, Steam User API
          </span>
        </p>
      </motion.div>
    </div>
  );
}
