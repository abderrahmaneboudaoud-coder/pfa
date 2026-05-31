import { PlatformBadge } from "../../components/PlatformBadge";
import { ALERT_STYLES } from "../../data/mockData";
import type { Alert } from "../../types/types";

export function AlertsPanel({ alerts, onMarkRead }: { alerts: Alert[]; onMarkRead: (id: number) => void }) {
  const unread = alerts.filter(a => !a.read).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-stone-700">{unread} unread alerts</span>
        {unread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>}
      </div>
      <div className="space-y-3">
        {alerts.map(a => {
          const style = ALERT_STYLES[a.type];
          return (
            <div key={a.id} className={`rounded-2xl p-4 border flex items-start gap-4 transition-opacity ${style.bg} ${a.read ? "opacity-60" : ""}`}>
              <div className="text-2xl leading-none mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-bold text-stone-700">{a.product}</span>
                  <PlatformBadge name={a.platform} />
                  <span className="text-xs text-stone-400">{a.time}</span>
                </div>
                <p className="text-sm text-stone-600">{a.message}</p>
              </div>
              {!a.read && (
                <button onClick={() => onMarkRead(a.id)}
                  className="text-xs text-stone-400 hover:text-stone-700 shrink-0 mt-0.5 underline">
                  Mark read
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}