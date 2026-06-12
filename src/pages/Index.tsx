import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const PARSER_URL = "https://functions.poehali.dev/359a7d15-a09f-4779-8859-b2b192d2ce4b";

interface ParseTask {
  id: number;
  url: string;
  status: string;
  created_at: string;
  finished_at: string | null;
}

interface Contact {
  id: number;
  source_url: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  social_vk: string | null;
  social_tg: string | null;
  social_other: string | null;
  raw_page_url: string;
  created_at: string;
}

const NAV_ITEMS = [
  { id: "parse", label: "Парсинг", icon: "ScanSearch" },
  { id: "results", label: "Контакты", icon: "Users" },
  { id: "history", label: "История", icon: "History" },
];

function useTasksAndContacts() {
  const [tasks, setTasks] = useState<ParseTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    const res = await fetch(PARSER_URL);
    const data = await res.json();
    setTasks(data.tasks || []);
  }, []);

  const fetchContacts = useCallback(async (taskId: number) => {
    setLoading(true);
    const res = await fetch(`${PARSER_URL}?task_id=${taskId}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { tasks, contacts, loading, fetchAll, fetchContacts };
}

// ─── ПАРСИНГ ──────────────────────────────────────────────────────────────────
function ParsePage({ onDone }: { onDone: (taskId: number) => void }) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const getUrls = () => {
    if (mode === "single") return singleUrl.trim() ? [singleUrl.trim()] : [];
    return bulkUrls.split("\n").map(u => u.trim()).filter(Boolean);
  };

  const start = async () => {
    const urls = getUrls();
    if (!urls.length) { setError("Введите хотя бы один URL"); return; }
    setError("");
    setRunning(true);
    setProgress(`Парсим ${urls.length} сайт${urls.length > 1 ? "ов" : ""}...`);
    const res = await fetch(PARSER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: urls.join("\n") }),
    });
    const data = await res.json();
    setRunning(false);
    if (data.success) {
      setProgress("");
      setSingleUrl("");
      setBulkUrls("");
      onDone(data.task_ids[0]);
    } else {
      setError(data.error || "Ошибка при парсинге");
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <div className="bg-card card-glow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
            <Icon name="ScanSearch" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Парсинг контактов</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Извлекаем телефоны, email, имена и соцсети с сайта</p>
          </div>
        </div>

        {/* Режим */}
        <div className="flex rounded overflow-hidden border border-border mb-6">
          {[
            { id: "single", label: "Один сайт", icon: "Globe" },
            { id: "bulk", label: "Список сайтов", icon: "List" },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as "single" | "bulk")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground bg-muted"
              }`}
            >
              <Icon name={m.icon} size={15} />
              {m.label}
            </button>
          ))}
        </div>

        {mode === "single" ? (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">URL сайта конкурента</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-muted border border-border rounded px-3 focus-within:border-primary transition-colors">
                <Icon name="Link" size={14} className="text-muted-foreground flex-shrink-0" />
                <input
                  value={singleUrl}
                  onChange={e => setSingleUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && start()}
                  placeholder="https://competitor.ru"
                  className="flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">
              Список URL (каждый с новой строки, до 20 сайтов)
            </label>
            <textarea
              value={bulkUrls}
              onChange={e => setBulkUrls(e.target.value)}
              placeholder={"https://competitor1.ru\nhttps://competitor2.ru\nhttps://competitor3.ru"}
              rows={6}
              className="w-full bg-muted border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Введено: {bulkUrls.split("\n").filter(u => u.trim()).length} сайтов
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 text-xs text-destructive bg-destructive/10 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="AlertCircle" size={13} />
            {error}
          </div>
        )}

        <button
          onClick={start}
          disabled={running}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {running ? (
            <><Icon name="Loader2" size={16} className="animate-spin" />{progress}</>
          ) : (
            <><Icon name="Zap" size={16} />Запустить парсинг</>
          )}
        </button>
      </div>

      {/* Что ищем */}
      <div className="bg-card card-glow rounded-lg p-5">
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Что извлекаем</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "Phone", label: "Телефоны", desc: "Все форматы RU номеров", color: "text-emerald-400 bg-emerald-400/10" },
            { icon: "Mail", label: "Email-адреса", desc: "Из текста и mailto-ссылок", color: "text-blue-400 bg-blue-400/10" },
            { icon: "User", label: "Имена / ФИО", desc: "Русскоязычные имена", color: "text-amber-400 bg-amber-400/10" },
            { icon: "Share2", label: "Соцсети", desc: "VK, Telegram и другие", color: "text-violet-400 bg-violet-400/10" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-muted/40 rounded">
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <Icon name={item.icon} size={14} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── РЕЗУЛЬТАТЫ / КОНТАКТЫ ─────────────────────────────────────────────────────
function ResultsPage({
  tasks, contacts, loading, onSelectTask, selectedTaskId, fetchAll
}: {
  tasks: ParseTask[];
  contacts: Contact[];
  loading: boolean;
  onSelectTask: (id: number) => void;
  selectedTaskId: number | null;
  fetchAll: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q);
    const matchType =
      filterType === "all" ||
      (filterType === "phone" && c.phone) ||
      (filterType === "email" && c.email) ||
      (filterType === "social" && (c.social_vk || c.social_tg));
    return matchSearch && matchType;
  });

  const doneTasks = tasks.filter(t => t.status === "done");

  const exportCsv = () => {
    const rows = [["Телефон", "Email", "Имя", "VK", "Telegram", "Источник", "Страница"]];
    filtered.forEach(c => {
      rows.push([c.phone || "", c.email || "", c.name || "", c.social_vk || "", c.social_tg || "", c.source_url, c.raw_page_url]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contacts.csv";
    a.click();
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Выбор задачи */}
      <div className="bg-card card-glow rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest">Выберите задачу</h3>
          <button onClick={fetchAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Icon name="RefreshCw" size={12} />
            Обновить
          </button>
        </div>
        {doneTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет завершённых задач. Запустите парсинг.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {doneTasks.map(t => (
              <button
                key={t.id}
                onClick={() => onSelectTask(t.id)}
                className={`text-xs px-3 py-1.5 rounded border transition-all max-w-xs truncate ${
                  selectedTaskId === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
                title={t.url}
              >
                {new URL(t.url.startsWith("http") ? t.url : "https://" + t.url).hostname}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTaskId && (
        <>
          {/* Фильтры */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {[
                { id: "all", label: "Все" },
                { id: "phone", label: "Телефоны" },
                { id: "email", label: "Email" },
                { id: "social", label: "Соцсети" },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterType(f.id)}
                  className={`text-xs px-3 py-1.5 rounded font-medium transition-all ${
                    filterType === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-muted rounded px-3 py-1.5 flex-1 min-w-[180px] max-w-xs">
              <Icon name="Search" size={13} className="text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
            </div>
            {filtered.length > 0 && (
              <button onClick={exportCsv}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground rounded transition-all ml-auto">
                <Icon name="Download" size={13} />
                Скачать CSV
              </button>
            )}
          </div>

          {/* Таблица */}
          <div className="bg-card card-glow rounded-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center gap-3">
                <Icon name="Loader2" size={24} className="animate-spin text-primary" />
                Загрузка контактов...
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Телефон", "Email", "Имя", "VK", "Telegram", "Страница"].map(h => (
                      <th key={h} className="text-left text-xs text-muted-foreground uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="font-mono text-sm text-emerald-400 hover:underline">{c.phone}</a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="text-sm text-blue-400 hover:underline truncate block max-w-[160px]">{c.email}</a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{c.name || <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-3">
                        {c.social_vk ? (
                          <a href={c.social_vk} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline truncate block max-w-[120px]">VK</a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.social_tg ? (
                          <a href={c.social_tg.startsWith("http") ? c.social_tg : `https://t.me/${c.social_tg.replace("@", "")}`}
                            target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline">TG</a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <a href={c.raw_page_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground truncate block max-w-[150px]">
                          {c.raw_page_url.replace(/^https?:\/\//, "").split("/")[0]}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {contacts.length === 0 ? "Контакты не найдены для этого сайта" : "Ничего не найдено по фильтру"}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Найдено: {filtered.length} записей
            {contacts.length !== filtered.length && ` (из ${contacts.length})`}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ИСТОРИЯ ──────────────────────────────────────────────────────────────────
function HistoryPage({ tasks, onSelectTask }: { tasks: ParseTask[]; onSelectTask: (id: number) => void }) {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-card card-glow rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Сайт", "Статус", "Запущен", "Завершён", ""].map(h => (
                <th key={h} className="text-left text-xs text-muted-foreground uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name="Globe" size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate max-w-[220px]">{t.url}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.status === "done" ? "status-done" :
                    t.status === "running" ? "status-in-progress" : "status-new"
                  }`}>
                    {t.status === "done" ? "Готово" : t.status === "running" ? "Выполняется" : "Ожидание"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{t.created_at}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{t.finished_at || "—"}</td>
                <td className="px-4 py-3">
                  {t.status === "done" && (
                    <button onClick={() => onSelectTask(t.id)}
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Icon name="Eye" size={12} />
                      Посмотреть
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">История задач пуста</div>
        )}
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ─────────────────────────────────────────────────────────
export default function Index() {
  const [activePage, setActivePage] = useState("parse");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const { tasks, contacts, loading, fetchAll, fetchContacts } = useTasksAndContacts();

  const handleTaskDone = (taskId: number) => {
    fetchAll();
    setSelectedTaskId(taskId);
    setActivePage("results");
  };

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    fetchContacts(taskId);
    setActivePage("results");
  };

  const pageTitles: Record<string, string> = {
    parse: "Парсинг сайтов",
    results: "Найденные контакты",
    history: "История задач",
  };

  const totalContacts = contacts.length;

  return (
    <div className="flex h-screen bg-background overflow-hidden grid-bg">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0 ${sidebarOpen ? "w-56" : "w-14"}`}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border flex-shrink-0">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <Icon name="Crosshair" size={14} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-sm font-semibold text-foreground tracking-tight whitespace-nowrap">
              ContactHunter
            </span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all ${
                activePage === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}>
              <Icon name={item.icon} size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && activePage === item.id && (
                <div className="ml-auto w-1 h-4 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="bg-primary/10 rounded p-3 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Статистика</div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Задач</span>
                <span className="font-mono text-foreground">{tasks.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Контактов</span>
                <span className="font-mono text-emerald-400">{totalContacts}</span>
              </div>
            </div>
          </div>
        )}

        <div className="px-2 py-3 border-t border-sidebar-border">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all">
            <Icon name={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Свернуть</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">ContactHunter</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="text-foreground font-medium">{pageTitles[activePage]}</span>
          </div>
          <div className="flex items-center gap-3">
            {selectedTaskId && activePage === "results" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded">
                <Icon name="Database" size={12} />
                {totalContacts} контактов найдено
              </div>
            )}
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                АД
              </div>
              <span className="text-sm text-foreground hidden sm:block">Администратор</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-foreground">{pageTitles[activePage]}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {activePage === "parse" && <ParsePage onDone={handleTaskDone} />}
            {activePage === "results" && (
              <ResultsPage
                tasks={tasks}
                contacts={contacts}
                loading={loading}
                onSelectTask={handleSelectTask}
                selectedTaskId={selectedTaskId}
                fetchAll={fetchAll}
              />
            )}
            {activePage === "history" && (
              <HistoryPage tasks={tasks} onSelectTask={handleSelectTask} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
