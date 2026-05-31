import { useState, useEffect, useRef, useCallback } from "react";
import { api, type TaskState } from "../../api/client";

type Platform = "Amazon" | "Jumia" | "Hmizate";

interface Job {
  taskId: string;
  url: string;
  site: Platform;
  state: TaskState;
  startedAt: Date;
  finishedAt?: Date;
}

interface Toast {
  id: string;
  job: Job;
  visible: boolean;
}

const PLATFORMS: Platform[] = ["Amazon", "Jumia", "Hmizate"];

const PLATFORM_HINTS: Record<Platform, string> = {
  Amazon:  "https://www.amazon.com/dp/...",
  Jumia:   "https://www.jumia.ma/...",
  Hmizate: "https://www.hmizate.ma/...",
};

const STATE_CFG: Record<TaskState, { label: string; dot: string; text: string }> = {
  PENDING: { label: "Pending",  dot: "bg-amber-400 animate-pulse",  text: "text-amber-600" },
  STARTED: { label: "Running",  dot: "bg-blue-400 animate-ping",    text: "text-blue-600"  },
  SUCCESS: { label: "Complete", dot: "bg-emerald-500",               text: "text-emerald-600" },
  FAILURE: { label: "Failed",   dot: "bg-red-500",                   text: "text-red-600"  },
  RETRY:   { label: "Retrying", dot: "bg-orange-400 animate-pulse",  text: "text-orange-600" },
};

function elapsed(from: Date, to?: Date): string {
  const secs = Math.floor(((to ?? new Date()).getTime() - from.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const isSuccess = toast.job.state === "SUCCESS";
  const cfg = STATE_CFG[toast.job.state];

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className={`flex items-start gap-3 bg-white border rounded-xl shadow-xl p-4 w-80 transition-all duration-300 ${
      toast.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
    } ${isSuccess ? "border-emerald-200" : "border-red-200"}`}>
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        isSuccess ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
      }`}>
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {isSuccess
            ? <polyline points="1.5,6 4.5,9 10.5,3" />
            : <><line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" /></>
          }
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-stone-800">
          {isSuccess ? "Scraping complete" : "Scraping failed"}
        </p>
        <p className="text-xs text-stone-500 mt-0.5 truncate">{toast.job.site} · {toast.job.url}</p>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-stone-300 hover:text-stone-500 transition-colors ml-1 flex-shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
        </svg>
      </button>
    </div>
  );
}

function JobRow({ job, elapsed: elapsedStr }: { job: Job; elapsed: string }) {
  const cfg = STATE_CFG[job.state];
  const isActive = job.state === "PENDING" || job.state === "STARTED" || job.state === "RETRY";

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors">
      <div className="relative flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        {isActive && (
          <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${cfg.dot} opacity-50`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{job.site}</span>
          <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
        </div>
        <p className="text-sm text-stone-700 truncate">{job.url}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-xs text-stone-400">{isActive ? "Running for" : "Took"}</p>
        <p className="text-xs font-semibold text-stone-600 tabular-nums">{elapsedStr}</p>
      </div>
    </div>
  );
}

export function ScrapingPage() {
  const [site, setSite]           = useState<Platform>("Amazon");
  const [url, setUrl]             = useState("");
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [toasts, setToasts]       = useState<Toast[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [, tick]                  = useState(0);

  const jobsRef = useRef<Job[]>([]);
  jobsRef.current = jobs;

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  // Tick every second to refresh elapsed times for active jobs
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll active jobs every 2.5 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      const active = jobsRef.current.filter(
        j => j.state === "PENDING" || j.state === "STARTED" || j.state === "RETRY"
      );
      for (const job of active) {
        try {
          const status = await api.getTaskStatus(job.taskId);
          if (status.state !== job.state) {
            const updated: Job = { ...job, state: status.state, finishedAt: status.state === "SUCCESS" || status.state === "FAILURE" ? new Date() : undefined };
            setJobs(prev => prev.map(j => j.taskId === job.taskId ? updated : j));
            if (status.state === "SUCCESS" || status.state === "FAILURE") {
              const toastId = `${job.taskId}-${Date.now()}`;
              setToasts(prev => [...prev, { id: toastId, job: updated, visible: true }]);
            }
          }
        } catch {
          // Ignore poll errors silently
        }
      }
    }, 2500);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.startScrape(trimmed, site);
      const newJob: Job = {
        taskId: res.task_id,
        url: trimmed,
        site,
        state: "PENDING",
        startedAt: new Date(),
      };
      setJobs(prev => [newJob, ...prev]);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scraping");
    } finally {
      setSubmitting(false);
    }
  }

  const activeCount = jobs.filter(j => j.state === "PENDING" || j.state === "STARTED" || j.state === "RETRY").length;

 return (
  <div className="min-h-screen bg-[#F9F8F6] text-stone-900 p-8 antialiased">
    {/* Toast container - Added glassmorphism and subtle slide-up animation entry */}
    <div className="fixed bottom-8 right-8 z-100 flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto transform transition-all duration-300 ease-out animate-in slide-in-from-right-5">
          <ToastNotification toast={t} onDismiss={dismissToast} />
        </div>
      ))}
    </div>

    <div className="max-w-3xl mx-auto space-y-8">

      {/* Form Card - Modernized with "Focus Ring" effects and better grouping */}
      <section className="bg-white rounded-3xl border border-stone-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">New Scrape Job</h3>
              <p className="text-[11px] text-stone-400 font-medium leading-none mt-1">Background tasking enabled</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
          {/* Platform selector - High-contrast toggle group style */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4 px-1">Source Platform</label>
            <div className="grid grid-cols-3 gap-3 p-1.5 bg-stone-50 rounded-2xl border border-stone-100">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setSite(p); setUrl(""); setError(null); }}
                  className={`relative py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                    site === p
                      ? "bg-white text-stone-900 shadow-[0_2px_10px_rgb(0,0,0,0.06)] ring-1 ring-stone-200/50"
                      : "text-stone-400 hover:text-stone-600 hover:bg-stone-100/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* URL input - Larger touch target and improved iconography */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4 px-1">Endpoint URL</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-800 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <input
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(null); }}
                placeholder={PLATFORM_HINTS[site]}
                className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-4 focus:ring-stone-100 focus:border-stone-400 transition-all shadow-inner"
              />
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1">
                <div className="w-1 h-1 rounded-full bg-red-500" />
                <p className="text-[11px] text-red-500 font-bold uppercase tracking-tight">{error}</p>
              </div>
            )}
          </div>

          {/* Submit - Magnetic feel with better state handling */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !url.trim()}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-stone-900 text-white text-[13px] font-bold rounded-2xl hover:bg-stone-800 disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] shadow-xl shadow-stone-200/50"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing Request...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                  <span>Initialize Scraper</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Jobs list - Cleaner row styling */}
      {jobs.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="px-8 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/30">
            <div>
              <h3 className="text-sm font-bold text-stone-800">Recent Activity</h3>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">{jobs.length} tracked tasks</p>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ring-1 ring-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {activeCount} active
              </div>
            )}
          </div>

          <div className="divide-y divide-stone-50">
            {jobs.map(job => {
              const duration = elapsed(job.startedAt, job.finishedAt);
              return <JobRow key={job.taskId} job={job} elapsed={duration} />;
            })}
          </div>

          <div className="px-8 py-4 bg-stone-50/30 flex justify-center">
            <button
              onClick={() => setJobs(prev => prev.filter(j => ["PENDING", "STARTED", "RETRY"].includes(j.state)))}
              className="text-[10px] text-stone-400 hover:text-stone-900 font-black uppercase tracking-widest transition-colors"
            >
              Clear Completed Logs
            </button>
          </div>
        </div>
      )}

      {/* Empty state - More "airy" and illustrative */}
      {jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-stone-200 blur-2xl opacity-20 rounded-full" />
            <div className="relative w-20 h-20 rounded-3xl bg-white border border-stone-100 shadow-xl flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
              <svg className="w-10 h-10 text-stone-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
          </div>
          <p className="text-base font-bold text-stone-800">Queue is empty</p>
          <p className="text-xs text-stone-400 mt-2 max-w-[200px] leading-relaxed font-medium">Ready to start indexing? Paste a URL to begin.</p>
        </div>
      )}
    </div>
  </div>
);
}
