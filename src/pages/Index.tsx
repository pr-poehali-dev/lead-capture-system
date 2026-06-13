import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const WIDGET_URL = "https://functions.poehali.dev/8c88693e-a95b-423b-93a3-bf0b61b0e579";
const MONITOR_URL = "https://functions.poehali.dev/6fd4c8bd-5191-496b-bfcd-ed698a11e3a0";
const PARSER_URL = "https://functions.poehali.dev/359a7d15-a09f-4779-8859-b2b192d2ce4b";
const CRM_URL = "https://functions.poehali.dev/4a217c7b-f5ab-4bd1-a924-199e40b8a6e0";

// ─── CRM INTEGRATION ─────────────────────────────────────────────────────────
async function sendToCrm(phone: string|null, name: string|null, notes: string): Promise<boolean> {
  const payload = {
    action: "webhook",
    full_name: name || "Лид из ContactHunter",
    phone: phone || "",
    source: "ContactHunter",
    comment: notes,
  };
  const res = await fetch(CRM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

function useCrmSend() {
  const [sending, setSending] = useState<number|null>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());

  const send = async (id: number, phone: string|null, name: string|null, notes: string) => {
    setSending(id);
    const ok = await sendToCrm(phone, name, notes);
    setSending(null);
    if (ok) setSent(prev => new Set(prev).add(id));
    return ok;
  };

  return { sending, sent, send };
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface WidgetItem { id: number; name: string; site_url: string; competitors: string; token: string; created_at: string; }
interface WidgetLead { id: number; widget_id: number; phone: string|null; email: string|null; name: string|null; referrer: string|null; competitor_source: string|null; utm_source: string|null; page_url: string|null; created_at: string; }
interface MonitorTask { id: number; competitor_name: string; keywords: string; status: string; created_at: string; last_run: string|null; }
interface MonitorLead { id: number; source: string; author_name: string|null; phone: string|null; email: string|null; text: string|null; source_url: string|null; intent_score: number; created_at: string; }
interface ParseTask { id: number; url: string; status: string; created_at: string; finished_at: string|null; contacts_count: number; }
interface ParseContact { id: number; phone: string|null; email: string|null; name: string|null; social_vk: string|null; social_tg: string|null; raw_page_url: string; created_at: string; }

const NAV = [
  { id: "dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { id: "widget", label: "Виджет", icon: "Code2" },
  { id: "monitor", label: "Мониторинг", icon: "Radio" },
  { id: "parser", label: "Парсер сайтов", icon: "ScanSearch" },
  { id: "help", label: "Инструкция", icon: "BookOpen" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Badge({ label, type }: { label: string; type: "new"|"ok"|"warn"|"muted" }) {
  const cls = { new: "status-new", ok: "status-done", warn: "status-in-progress", muted: "bg-muted text-muted-foreground" }[type];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground">{score}</span>
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="text-center py-14 flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Icon name={icon} size={22} className="text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{text}</div>
      {sub && <div className="text-xs text-muted-foreground max-w-xs">{sub}</div>}
    </div>
  );
}

function exportCsv(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(v => `"${(v||"").replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ onNav }: { onNav: (p: string) => void }) {
  const [stats, setStats] = useState({ widgets: 0, widget_leads: 0, monitor_tasks: 0, parse_tasks: 0 });

  useEffect(() => {
    Promise.all([
      fetch(`${WIDGET_URL}?action=list`).then(r => r.json()).catch(() => ({})),
      fetch(MONITOR_URL).then(r => r.json()).catch(() => ({})),
      fetch(PARSER_URL).then(r => r.json()).catch(() => ({})),
    ]).then(([w, m, p]) => {
      setStats({ widgets: (w.widgets||[]).length, widget_leads: 0, monitor_tasks: (m.tasks||[]).length, parse_tasks: (p.tasks||[]).length });
    });
  }, []);

  const cards = [
    { label: "Виджетов активно", value: stats.widgets, icon: "Code2", color: "text-blue-400 bg-blue-400/10", page: "widget" },
    { label: "Лидов с форм", value: stats.widget_leads, icon: "MousePointerClick", color: "text-emerald-400 bg-emerald-400/10", page: "widget" },
    { label: "Задач мониторинга", value: stats.monitor_tasks, icon: "Radio", color: "text-amber-400 bg-amber-400/10", page: "monitor" },
    { label: "Задач парсинга", value: stats.parse_tasks, icon: "ScanSearch", color: "text-violet-400 bg-violet-400/10", page: "parser" },
  ];

  const modules = [
    { icon: "Code2", title: "Виджет перехвата", desc: "Установите один скрипт на свой сайт — посетители, пришедшие с сайтов конкурентов, при заполнении ваших форм попадают в базу лидов.", badge: "Модуль 1", page: "widget", border: "border-blue-500/30 bg-blue-500/5" },
    { icon: "Radio", title: "Мониторинг источников", desc: "Ищем в Яндексе, 2ГИС и соцсетях людей, которые упоминают конкурентов и ищут альтернативы — горячие лиды в реальном времени.", badge: "Модуль 2", page: "monitor", border: "border-amber-500/30 bg-amber-500/5" },
    { icon: "ScanSearch", title: "Парсер сайтов", desc: "Извлекаем телефоны, email, ФИО и соцсети прямо со страниц сайтов конкурентов: обходим весь сайт в поисках контактов.", badge: "Модуль 3", page: "parser", border: "border-violet-500/30 bg-violet-500/5" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <button key={i} onClick={() => onNav(c.page)}
            className="bg-card card-glow rounded-lg p-5 flex flex-col gap-3 text-left hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-widest leading-tight">{c.label}</span>
              <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${c.color}`}>
                <Icon name={c.icon} size={15} />
              </div>
            </div>
            <div className="font-mono text-3xl font-semibold text-foreground">{c.value}</div>
            <div className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Открыть <Icon name="ArrowRight" size={11} />
            </div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {modules.map((m, i) => (
          <button key={i} onClick={() => onNav(m.page)}
            className={`bg-card card-glow rounded-lg p-5 flex flex-col gap-3 text-left border ${m.border} hover:opacity-90 transition-opacity`}>
            <div className="flex items-center justify-between">
              <Icon name={m.icon} size={20} className="text-foreground" />
              <span className="text-xs text-muted-foreground">{m.badge}</span>
            </div>
            <div className="text-sm font-semibold text-foreground">{m.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed flex-1">{m.desc}</div>
            <div className="text-xs text-primary flex items-center gap-1">
              Перейти <Icon name="ArrowRight" size={11} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── WIDGET MODULE ────────────────────────────────────────────────────────────
function WidgetModule() {
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [leads, setLeads] = useState<WidgetLead[]>([]);
  const [selected, setSelected] = useState<WidgetItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", site_url: "", competitors: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState<"setup"|"leads">("setup");
  const { sending: crmSending, sent: crmSent, send: sendCrm } = useCrmSend();

  const fetchWidgets = useCallback(async () => {
    const r = await fetch(`${WIDGET_URL}?action=list`);
    const d = await r.json(); setWidgets(d.widgets || []);
  }, []);

  const fetchLeads = useCallback(async (id: number) => {
    const r = await fetch(`${WIDGET_URL}?action=leads&widget_id=${id}`);
    const d = await r.json(); setLeads(d.leads || []);
  }, []);

  useEffect(() => { fetchWidgets(); }, [fetchWidgets]);

  const create = async () => {
    if (!form.name || !form.site_url) return;
    setSaving(true);
    const r = await fetch(`${WIDGET_URL}?action=create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json(); setSaving(false);
    if (d.token || d.id) { setShowCreate(false); setForm({ name: "", site_url: "", competitors: "" }); fetchWidgets(); }
  };

  const copyScript = (token: string) => {
    navigator.clipboard.writeText(`<script src="${WIDGET_URL}?action=script&token=${token}" async></script>`);
    setCopied(token); setTimeout(() => setCopied(""), 2000);
  };

  const deleteWidget = async (id: number) => {
    if (!confirm("Удалить виджет? Все лиды тоже будут удалены.")) return;
    await fetch(`${WIDGET_URL}?action=delete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widget_id: id }),
    });
    setSelected(null);
    fetchWidgets();
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-card card-glow rounded-lg p-4 border-l-2 border-blue-500">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Как работает:</span> вставляете одну строку кода на свой сайт → посетители, пришедшие с сайтов конкурентов, при заполнении любой формы автоматически попадают к вам в базу лидов.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Виджеты</h3>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-primary-foreground text-xs px-3 py-2 rounded hover:bg-primary/90 transition-colors font-medium">
          <Icon name="Plus" size={14} /> Новый виджет
        </button>
      </div>

      {showCreate && (
        <div className="bg-card card-glow rounded-lg p-5 border border-primary/30 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Создать виджет</h4>
          {[
            { key: "name", label: "Название", placeholder: "Мой сайт" },
            { key: "site_url", label: "URL вашего сайта", placeholder: "https://mysite.ru" },
            { key: "competitors", label: "Сайты конкурентов (через запятую)", placeholder: "competitor1.ru, competitor2.ru" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block">{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                placeholder={f.placeholder} className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded hover:text-foreground">Отмена</button>
            <button onClick={create} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
              {saving && <Icon name="Loader2" size={13} className="animate-spin" />} Создать
            </button>
          </div>
        </div>
      )}

      {widgets.length === 0 && !showCreate && <EmptyState icon="Code2" text="Нет виджетов" sub="Создайте виджет и вставьте скрипт на свой сайт" />}

      {widgets.map(w => (
        <div key={w.id} className={`bg-card card-glow rounded-lg overflow-hidden border transition-colors ${selected?.id === w.id ? "border-primary/40" : "border-transparent"}`}>
          <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => { setSelected(w); setTab("setup"); }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Icon name="Globe" size={15} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{w.name}</div>
                <div className="text-xs text-muted-foreground truncate">{w.site_url}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge label="Активен" type="ok" />
              <button
                onClick={e => { e.stopPropagation(); deleteWidget(w.id); }}
                className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Удалить виджет">
                <Icon name="Trash2" size={14} />
              </button>
              <Icon name={selected?.id === w.id ? "ChevronUp" : "ChevronDown"} size={15} className="text-muted-foreground" />
            </div>
          </div>

          {selected?.id === w.id && (
            <div className="border-t border-border">
              <div className="flex border-b border-border">
                {[{id:"setup",label:"Установка"},{id:"leads",label:`Лиды (${leads.length})`}].map(t => (
                  <button key={t.id} onClick={() => { setTab(t.id as "setup"|"leads"); if(t.id==="leads") fetchLeads(w.id); }}
                    className={`px-4 py-2.5 text-xs font-medium transition-colors ${tab===t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "setup" && (
                <div className="p-5 space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Код для вставки</div>
                    <div className="flex items-center gap-2 bg-muted rounded p-3">
                      <Icon name="Code" size={13} className="text-muted-foreground flex-shrink-0" />
                      <code className="text-xs font-mono text-primary flex-1 truncate">{`<script src="${WIDGET_URL}?action=script&token=${w.token}" async></script>`}</code>
                      <button onClick={() => copyScript(w.token)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors">
                        <Icon name={copied === w.token ? "Check" : "Copy"} size={13} />
                        {copied === w.token ? "Скопировано" : "Копировать"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Вставьте перед закрывающим тегом &lt;/body&gt;</p>
                  </div>
                  {w.competitors && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Конкуренты</div>
                      <div className="flex flex-wrap gap-1.5">
                        {w.competitors.split(",").map((c, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{c.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "leads" && (
                <div className="p-4">
                  {leads.length > 0 && (
                    <div className="flex justify-end mb-3">
                      <button onClick={() => exportCsv([["Телефон","Email","Имя","Конкурент","UTM","Страница","Дата"],...leads.map(l=>[l.phone||"",l.email||"",l.name||"",l.competitor_source||"",l.utm_source||"",l.page_url||"",l.created_at])],"widget_leads.csv")}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground rounded transition-colors">
                        <Icon name="Download" size={12} /> CSV
                      </button>
                    </div>
                  )}
                  {leads.length === 0
                    ? <EmptyState icon="MousePointerClick" text="Лидов пока нет" sub="Скрипт установлен — ждём первых посетителей с сайтов конкурентов" />
                    : (
                      <table className="w-full">
                        <thead><tr className="border-b border-border">
                          {["Телефон","Email","Имя","Конкурент","UTM","Дата","CRM"].map(h => (
                            <th key={h} className="text-left text-xs text-muted-foreground uppercase tracking-widest px-3 py-2 font-medium">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>{leads.map(l => (
                          <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2.5 font-mono text-sm text-emerald-400">{l.phone||"—"}</td>
                            <td className="px-3 py-2.5 text-sm text-blue-400">{l.email||"—"}</td>
                            <td className="px-3 py-2.5 text-sm text-foreground">{l.name||"—"}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.competitor_source||"—"}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.utm_source||"—"}</td>
                            <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{l.created_at}</td>
                            <td className="px-3 py-2.5">
                              {crmSent.has(l.id)
                                ? <span className="text-xs text-emerald-400 flex items-center gap-1"><Icon name="Check" size={12} /> Отправлен</span>
                                : <button onClick={() => sendCrm(l.id, l.phone, l.name, `Виджет. Конкурент: ${l.competitor_source||"—"}. Страница: ${l.page_url||"—"}`)}
                                    disabled={crmSending === l.id}
                                    className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors disabled:opacity-50">
                                    {crmSending === l.id ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Send" size={11} />}
                                    В CRM
                                  </button>
                              }
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MONITOR MODULE ───────────────────────────────────────────────────────────
function MonitorModule() {
  const [tasks, setTasks] = useState<MonitorTask[]>([]);
  const [leads, setLeads] = useState<MonitorLead[]>([]);
  const [selected, setSelected] = useState<MonitorTask | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<number|null>(null);
  const { sending: crmSending, sent: crmSent, send: sendCrm } = useCrmSend();

  const fetchTasks = useCallback(async () => {
    const r = await fetch(MONITOR_URL); const d = await r.json(); setTasks(d.tasks||[]);
  }, []);

  const fetchLeads = useCallback(async (id: number) => {
    const r = await fetch(`${MONITOR_URL}?task_id=${id}`); const d = await r.json(); setLeads(d.leads||[]);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const [formCompetitors, setFormCompetitors] = useState("");
  const [formKeywords, setFormKeywords] = useState("");

  const create = async () => {
    const competitors = formCompetitors.split(",").map(s => s.trim()).filter(Boolean);
    const keywords = formKeywords.trim();
    if (competitors.length === 0 || !keywords) return;
    await Promise.all(competitors.map(competitor_name =>
      fetch(`${MONITOR_URL}?action=create`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ competitor_name, keywords }) })
    ));
    setShowCreate(false); setFormCompetitors(""); setFormKeywords(""); fetchTasks();
  };

  const runTask = async (id: number) => {
    setRunning(id);
    await fetch(`${MONITOR_URL}?action=run&task_id=${id}`, { method: "POST" });
    setRunning(null); fetchTasks(); if (selected?.id === id) fetchLeads(id);
  };

  const runAll = async () => {
    setRunning(-1);
    await fetch(`${MONITOR_URL}?action=autorun`, { method: "POST" });
    setRunning(null); fetchTasks();
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Удалить задачу и все её лиды?")) return;
    await fetch(`${MONITOR_URL}?action=delete&task_id=${id}`, { method: "POST" });
    if (selected?.id === id) setSelected(null);
    fetchTasks();
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-card card-glow rounded-lg p-4 border-l-2 border-amber-500">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Как работает:</span> указываете конкурента и ключевые слова — система ищет в Яндексе, 2ГИС и соцсетях людей, которые упоминают конкурента и ищут альтернативу. Горячие лиды с оценкой намерения.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Задачи мониторинга</h3>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <button onClick={runAll} disabled={running === -1}
              className="flex items-center gap-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs px-3 py-2 rounded transition-colors font-medium disabled:opacity-50">
              {running === -1 ? <><Icon name="Loader2" size={13} className="animate-spin"/>Запускаем все...</> : <><Icon name="PlayCircle" size={13}/>Запустить все</>}
            </button>
          )}
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-primary-foreground text-xs px-3 py-2 rounded hover:bg-primary/90 transition-colors font-medium">
            <Icon name="Plus" size={14} /> Добавить конкурента
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-card card-glow rounded-lg p-5 border border-primary/30 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Новая задача</h4>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block">Конкуренты</label>
            <input value={formCompetitors} onChange={e => setFormCompetitors(e.target.value)}
              placeholder="Компания А, Компания Б, Компания В" className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors" />
            <p className="text-xs text-muted-foreground mt-1">Несколько конкурентов через запятую — создадутся отдельные задачи</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block">Ключевые слова</label>
            <input value={formKeywords} onChange={e => setFormKeywords(e.target.value)}
              onKeyDown={e => e.key === "Enter" && create()}
              placeholder="ищу альтернативу, недоволен, порекомендуйте" className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors" />
            <p className="text-xs text-muted-foreground mt-1">Что пишут недовольные клиенты конкурента</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowCreate(false); setFormCompetitors(""); setFormKeywords(""); }} className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded hover:text-foreground">Отмена</button>
            <button onClick={create} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Создать</button>
          </div>
        </div>
      )}

      {tasks.length === 0 && !showCreate && <EmptyState icon="Radio" text="Нет задач" sub="Добавьте конкурента — будем следить за упоминаниями и искать горячих лидов" />}

      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className={`bg-card card-glow rounded-lg overflow-hidden border transition-colors ${selected?.id === task.id ? "border-primary/40" : "border-transparent"}`}>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 cursor-pointer flex-1" onClick={() => { setSelected(task); fetchLeads(task.id); }}>
                <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="Radio" size={15} className="text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{task.competitor_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{task.keywords}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge label={task.status==="done"?"Готово":"Ожидание"} type={task.status==="done"?"ok":"muted"} />
                <button onClick={() => runTask(task.id)} disabled={running === task.id || running === -1}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {running===task.id ? <><Icon name="Loader2" size={12} className="animate-spin"/>Ищем...</> : <><Icon name="Play" size={12}/>Запустить</>}
                </button>
                <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                  className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Удалить">
                  <Icon name="Trash2" size={13}/>
                </button>
              </div>
            </div>

            {selected?.id === task.id && (
              <div className="border-t border-border">
                {leads.length === 0
                  ? <EmptyState icon="SearchX" text="Упоминаний не найдено" sub='Нажмите "Запустить" для поиска' />
                  : (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground">Найдено {leads.length} упоминаний</span>
                        <button onClick={() => exportCsv([["Источник","Автор","Телефон","Email","Оценка","Текст","URL","Дата"],...leads.map(l=>[l.source||"",l.author_name||"",l.phone||"",l.email||"",String(l.intent_score),l.text||"",l.source_url||"",l.created_at])],"monitor_leads.csv")}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground rounded transition-colors">
                          <Icon name="Download" size={12} /> CSV
                        </button>
                      </div>
                      <table className="w-full">
                        <thead><tr className="border-b border-border">
                          {["Источник","Автор","Телефон","Email","Намерение","Текст","CRM"].map(h => (
                            <th key={h} className="text-left text-xs text-muted-foreground uppercase tracking-widest px-3 py-2 font-medium">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>{leads.map(l => (
                          <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2.5"><span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{l.source}</span></td>
                            <td className="px-3 py-2.5 text-sm text-foreground">{l.author_name||"—"}</td>
                            <td className="px-3 py-2.5 font-mono text-sm text-emerald-400">{l.phone||"—"}</td>
                            <td className="px-3 py-2.5 text-sm text-blue-400">{l.email||"—"}</td>
                            <td className="px-3 py-2.5"><ScoreBar score={l.intent_score} /></td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{l.text||"—"}</td>
                            <td className="px-3 py-2.5">
                              {crmSent.has(l.id)
                                ? <span className="text-xs text-emerald-400 flex items-center gap-1"><Icon name="Check" size={12}/>Добавлен</span>
                                : <button onClick={() => sendCrm(l.id, l.phone, l.author_name, `Источник: ${l.source}. ${l.text||""}`)}
                                    disabled={crmSending === l.id}
                                    className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors disabled:opacity-50">
                                    {crmSending === l.id ? <Icon name="Loader2" size={11} className="animate-spin"/> : <Icon name="Send" size={11}/>}
                                    В CRM
                                  </button>
                              }
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PARSER MODULE ────────────────────────────────────────────────────────────
function ParserModule() {
  const [mode, setMode] = useState<"single"|"bulk">("single");
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [tasks, setTasks] = useState<ParseTask[]>([]);
  const [contacts, setContacts] = useState<ParseContact[]>([]);
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [loadingC, setLoadingC] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const { sending: crmSending, sent: crmSent, send: sendCrm } = useCrmSend();

  const fetchTasks = useCallback(async () => {
    const r = await fetch(PARSER_URL); const d = await r.json(); setTasks(d.tasks||[]);
  }, []);

  const fetchContacts = useCallback(async (id: number) => {
    setLoadingC(true);
    const r = await fetch(`${PARSER_URL}?task_id=${id}`); const d = await r.json();
    setContacts(d.contacts||[]); setLoadingC(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const run = async () => {
    const urls = mode==="single" ? [singleUrl.trim()].filter(Boolean) : bulkUrls.split("\n").map(u=>u.trim()).filter(Boolean);
    if (!urls.length) { setError("Введите URL"); return; }
    setError(""); setRunning(true); setProgress({ current: 0, total: urls.length });
    let lastTaskId: number|null = null;
    for (let i = 0; i < urls.length; i++) {
      setProgress({ current: i + 1, total: urls.length });
      const r = await fetch(PARSER_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({urls: urls[i]}) }).catch(() => null);
      if (!r || !r.ok) continue;
      const d = await r.json().catch(() => ({}));
      if (d.success && d.task_ids?.[0]) lastTaskId = d.task_ids[0];
    }
    setRunning(false); setProgress({ current: 0, total: 0 });
    setSingleUrl(""); setBulkUrls(""); fetchTasks();
    if (lastTaskId) { setSelectedId(lastTaskId); fetchContacts(lastTaskId); }
  };

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const ms = !q || (c.phone||"").includes(q) || (c.email||"").toLowerCase().includes(q);
    const mt = filter==="all" || (filter==="phone"&&c.phone) || (filter==="email"&&c.email) || (filter==="social"&&(c.social_vk||c.social_tg));
    return ms && mt;
  });

  const doneTasks = tasks.filter(t => t.status==="done");

  const deleteTask = async (id: number) => {
    if (!confirm("Удалить задачу и все найденные контакты?")) return;
    await fetch(`${PARSER_URL}?action=delete`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ task_id: id, action: "delete" }) });
    if (selectedId === id) { setSelectedId(null); setContacts([]); }
    fetchTasks();
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card card-glow rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Запустить парсинг</h3>
          <div className="flex rounded overflow-hidden border border-border">
            {[{id:"single",label:"Один сайт"},{id:"bulk",label:"Список"}].map(m => (
              <button key={m.id} onClick={() => setMode(m.id as "single"|"bulk")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${mode===m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted hover:text-foreground"}`}>
                {m.label}
              </button>
            ))}
          </div>
          {mode==="single"
            ? <div className="flex items-center gap-2 bg-muted border border-border rounded px-3 focus-within:border-primary transition-colors">
                <Icon name="Link" size={13} className="text-muted-foreground flex-shrink-0" />
                <input value={singleUrl} onChange={e => setSingleUrl(e.target.value)} onKeyDown={e => e.key==="Enter" && run()}
                  placeholder="https://competitor.ru" className="flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              </div>
            : <textarea value={bulkUrls} onChange={e => setBulkUrls(e.target.value)}
                placeholder={"https://site1.ru\nhttps://site2.ru"} rows={5}
                className="w-full bg-muted border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none font-mono transition-colors" />
          }
          {error && <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 flex items-center gap-2"><Icon name="AlertCircle" size={12}/>{error}</div>}
          <button onClick={run} disabled={running} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {running
              ? <><Icon name="Loader2" size={14} className="animate-spin"/>
                  {progress.total > 1 ? `Парсим ${progress.current} из ${progress.total}...` : "Парсим..."}
                </>
              : <><Icon name="Zap" size={14}/>Запустить</>}
          </button>
        </div>

        <div className="bg-card card-glow rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">История</h3>
            <button onClick={fetchTasks} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="RefreshCw" size={14}/></button>
          </div>
          {doneTasks.length===0
            ? <EmptyState icon="History" text="Нет задач" sub="Запустите парсинг" />
            : <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {doneTasks.map(t => (
                  <div key={t.id} className={`flex items-center gap-1 rounded ${selectedId===t.id ? "bg-primary/10 border border-primary/30" : "bg-muted"}`}>
                    <button onClick={() => { setSelectedId(t.id); fetchContacts(t.id); }}
                      className="flex-1 flex items-center justify-between px-3 py-2 text-left transition-colors hover:opacity-80 min-w-0">
                      <span className="text-xs text-foreground truncate max-w-[130px]">
                        {(() => { try { return new URL(t.url.startsWith("http")?t.url:"https://"+t.url).hostname; } catch { return t.url; } })()}
                      </span>
                      <span className={`text-xs font-medium flex-shrink-0 ml-2 px-1.5 py-0.5 rounded ${t.contacts_count > 0 ? "bg-green-500/15 text-green-400" : "bg-muted-foreground/15 text-muted-foreground"}`}>
                        {t.contacts_count} лид{t.contacts_count===1?"":"ов"}
                      </span>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteTask(t.id); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 mr-1">
                      <Icon name="Trash2" size={13}/>
                    </button>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {selectedId && (
        <div className="bg-card card-glow rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
            <div className="flex items-center gap-1">
              {[{id:"all",label:"Все"},{id:"phone",label:"Телефоны"},{id:"email",label:"Email"},{id:"social",label:"Соцсети"}].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`text-xs px-3 py-1.5 rounded font-medium transition-all ${filter===f.id?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted rounded px-2.5 py-1.5">
                <Icon name="Search" size={12} className="text-muted-foreground"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск..."
                  className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-24"/>
              </div>
              {filtered.length>0 && (
                <button onClick={() => exportCsv([["Телефон","Email","Имя","VK","Telegram","Страница"],...filtered.map(c=>[c.phone||"",c.email||"",c.name||"",c.social_vk||"",c.social_tg||"",c.raw_page_url])],"contacts.csv")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground rounded transition-colors">
                  <Icon name="Download" size={12}/> CSV
                </button>
              )}
            </div>
          </div>

          {loadingC
            ? <div className="flex items-center justify-center gap-3 py-14 text-muted-foreground text-sm"><Icon name="Loader2" size={18} className="animate-spin text-primary"/>Загружаем...</div>
            : filtered.length===0
              ? <EmptyState icon="SearchX" text="Контакты не найдены"/>
              : (
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    {["Телефон","Email","Контекст","VK","Telegram","Страница","CRM"].map(h => (
                      <th key={h} className="text-left text-xs text-muted-foreground uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{filtered.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">{c.phone ? <a href={`tel:${c.phone}`} className="font-mono text-sm text-emerald-400 hover:underline">{c.phone}</a> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-2.5">{c.email ? <a href={`mailto:${c.email}`} className="text-sm text-blue-400 hover:underline truncate block max-w-[150px]">{c.email}</a> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-2.5 text-sm text-foreground">{c.name||<span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-2.5">{c.social_vk ? <a href={c.social_vk} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline">VK</a> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-2.5">{c.social_tg ? <a href={c.social_tg.startsWith("http")?c.social_tg:`https://t.me/${c.social_tg.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline">TG</a> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-2.5"><a href={c.raw_page_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground truncate block max-w-[130px]">{c.raw_page_url.replace(/^https?:\/\//,"").split("/")[0]}</a></td>
                      <td className="px-4 py-2.5">
                        {crmSent.has(c.id)
                          ? <span className="text-xs text-emerald-400 flex items-center gap-1"><Icon name="Check" size={12}/>Добавлен</span>
                          : <button onClick={() => sendCrm(c.id, c.phone, c.name, `Парсер: ${c.raw_page_url}`)}
                              disabled={crmSending === c.id}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors disabled:opacity-50">
                              {crmSending === c.id ? <Icon name="Loader2" size={11} className="animate-spin"/> : <Icon name="Send" size={11}/>}
                              В CRM
                            </button>
                        }
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )
          }
          {!loadingC && <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">{filtered.length} записей</div>}
        </div>
      )}
    </div>
  );
}

// ─── HELP MODULE ─────────────────────────────────────────────────────────────
function HelpModule() {
  const [open, setOpen] = useState<number|null>(0);

  const sections = [
    {
      icon: "LayoutDashboard",
      color: "text-blue-400 bg-blue-400/10",
      title: "Дашборд",
      short: "Главная страница со статистикой",
      content: (
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>Дашборд показывает общую статистику по всем трём модулям: сколько виджетов активно, лидов собрано, задач запущено.</p>
          <p>Нажмите на любую карточку или блок модуля — перейдёте в нужный раздел.</p>
        </div>
      ),
    },
    {
      icon: "Code2",
      color: "text-emerald-400 bg-emerald-400/10",
      title: "Виджет перехвата",
      short: "Собирает лидов с ваших форм",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><span className="text-foreground font-medium">Суть:</span> человек побывал на сайте конкурента, потом зашёл на <span className="text-foreground">ваш</span> сайт и заполнил форму — его контакт автоматически сохраняется.</p>
          <div className="space-y-2">
            <p className="text-foreground font-medium text-xs uppercase tracking-widest">Как настроить:</p>
            {["Откройте раздел «Виджет»", "Нажмите «Новый виджет»", "Укажите название, URL вашего сайта и сайты конкурентов (можно оставить пустым — тогда ловим всех)", "Нажмите «Создать»", "Скопируйте строку кода и вставьте на ваш сайт перед тегом </body>"].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">{i+1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded p-3 text-xs">
            <span className="text-foreground font-medium">Результат:</span> вкладка «Лиды» внутри виджета — телефон, email, имя и с какого сайта пришёл человек.
          </div>
        </div>
      ),
    },
    {
      icon: "Radio",
      color: "text-amber-400 bg-amber-400/10",
      title: "Мониторинг источников",
      short: "Ищет горячих лидов в интернете",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><span className="text-foreground font-medium">Суть:</span> система сама ищет в Яндексе, 2ГИС и соцсетях людей, которые упоминают конкурентов и ищут альтернативу.</p>
          <div className="space-y-2">
            <p className="text-foreground font-medium text-xs uppercase tracking-widest">Как использовать:</p>
            {[
              "Откройте раздел «Мониторинг»",
              "Нажмите «Добавить конкурента»",
              'Укажите название конкурента и ключевые слова — что пишут недовольные клиенты, например: "ищу альтернативу, недоволен, порекомендуйте"',
              "Нажмите «Создать», затем «Запустить»",
              "Дождитесь результатов — обычно 10–30 секунд",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">{i+1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded p-3 text-xs">
            <span className="text-foreground font-medium">Оценка намерения (0–100):</span> чем выше цифра — тем горячее лид. 80+ означает, что человек прямо сейчас ищет замену конкуренту.
          </div>
        </div>
      ),
    },
    {
      icon: "ScanSearch",
      color: "text-violet-400 bg-violet-400/10",
      title: "Парсер сайтов",
      short: "Извлекает контакты с сайтов конкурентов",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><span className="text-foreground font-medium">Суть:</span> вводите адрес сайта конкурента — система обходит все страницы и собирает телефоны, email, имена, ВКонтакте и Telegram.</p>
          <div className="space-y-2">
            <p className="text-foreground font-medium text-xs uppercase tracking-widest">Как использовать:</p>
            {[
              'Откройте раздел «Парсер сайтов»',
              '«Один сайт» — вставьте один URL. «Список» — несколько URL каждый с новой строки (до 20)',
              "Нажмите «Запустить» и подождите 10–30 секунд",
              "Используйте фильтры: Телефоны / Email / Соцсети",
              "Нажмите «CSV» для выгрузки в Excel",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">{i+1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded p-3 text-xs">
            <span className="text-foreground font-medium">История задач</span> справа — можно вернуться к результатам любого прошлого парсинга.
          </div>
        </div>
      ),
    },
    {
      icon: "Send",
      color: "text-emerald-400 bg-emerald-400/10",
      title: "Отправка в CRM",
      short: "Один клик — лид в вашей CRM",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><span className="text-foreground font-medium">Суть:</span> найденные контакты можно отправить в вашу CRM прямо из таблицы — без ручного копирования.</p>
          <div className="space-y-2">
            <p className="text-foreground font-medium text-xs uppercase tracking-widest">Как использовать:</p>
            {[
              "В таблице результатов парсера или мониторинга найдите нужный контакт",
              "Нажмите кнопку «В CRM» в последнем столбце",
              "Лид автоматически создаётся в CRM с телефоном, именем и пометкой об источнике",
              "Кнопка меняется на «Добавлен» — повторно не отправится",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">{i+1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded p-3 text-xs">
            <span className="text-foreground font-medium">Подключена CRM:</span> система учёта кандидатов. Лид попадает в раздел «Кандидаты» с пометкой источника ContactHunter.
          </div>
        </div>
      ),
    },
    {
      icon: "PlayCircle",
      color: "text-violet-400 bg-violet-400/10",
      title: "Запустить все задачи мониторинга",
      short: "Одна кнопка — поиск по всем конкурентам",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><span className="text-foreground font-medium">Суть:</span> если у вас несколько конкурентов в мониторинге — не нужно запускать каждого по отдельности.</p>
          <div className="space-y-2">
            <p className="text-foreground font-medium text-xs uppercase tracking-widest">Как использовать:</p>
            {[
              "Откройте раздел «Мониторинг»",
              "Добавьте всех нужных конкурентов",
              "Нажмите кнопку «Запустить все» в правом верхнем углу раздела",
              "Система последовательно обойдёт все источники по каждому конкуренту",
              "После завершения — результаты появятся у каждой задачи",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">{i+1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded p-3 text-xs">
            <span className="text-foreground font-medium">Совет:</span> запускайте раз в день — утром перед работой, чтобы к началу дня уже был свежий список горячих лидов.
          </div>
        </div>
      ),
    },
    {
      icon: "Download",
      color: "text-sky-400 bg-sky-400/10",
      title: "Экспорт контактов",
      short: "Выгрузка в Excel/CSV",
      content: (
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>В каждом модуле есть кнопка <span className="text-foreground font-medium">«Скачать CSV»</span> — нажмите её, чтобы выгрузить все найденные контакты.</p>
          <p>Файл открывается в Excel, Google Таблицах или любой CRM-системе. Разделитель — точка с запятой (;), кодировка UTF-8.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in max-w-2xl space-y-3">
      <div className="bg-card card-glow rounded-lg p-5 border-l-2 border-primary mb-6">
        <div className="flex items-start gap-3">
          <Icon name="BookOpen" size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-foreground mb-1">Как работает ContactHunter</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Три модуля для сбора контактов потенциальных клиентов. Нажмите на любой раздел ниже, чтобы прочитать подробную инструкцию.
            </p>
          </div>
        </div>
      </div>

      {sections.map((s, i) => (
        <div key={i} className={`bg-card card-glow rounded-lg overflow-hidden border transition-colors ${open === i ? "border-primary/30" : "border-transparent"}`}>
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <Icon name={s.icon} size={15} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.short}</div>
              </div>
            </div>
            <Icon name={open === i ? "ChevronUp" : "ChevronDown"} size={15} className="text-muted-foreground flex-shrink-0" />
          </button>
          {open === i && (
            <div className="px-5 pb-5 border-t border-border pt-4">
              {s.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function Index() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const titles: Record<string,string> = { dashboard:"Дашборд", widget:"Виджет перехвата", monitor:"Мониторинг источников", parser:"Парсер сайтов", help:"Инструкция" };
  const content: Record<string,JSX.Element> = { dashboard:<Dashboard onNav={setPage}/>, widget:<WidgetModule/>, monitor:<MonitorModule/>, parser:<ParserModule/>, help:<HelpModule/> };

  return (
    <div className="flex h-screen bg-background overflow-hidden grid-bg">
      <aside className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0 ${sidebarOpen?"w-56":"w-14"}`}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border flex-shrink-0">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <Icon name="Crosshair" size={14} className="text-white"/>
          </div>
          {sidebarOpen && <span className="text-sm font-semibold text-foreground tracking-tight whitespace-nowrap">ContactHunter</span>}
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all ${page===item.id?"bg-sidebar-accent text-sidebar-accent-foreground font-medium":"text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"}`}>
              <Icon name={item.icon} size={16} className="flex-shrink-0"/>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && page===item.id && <div className="ml-auto w-1 h-4 rounded-full bg-primary"/>}
            </button>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-sidebar-border">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all">
            <Icon name={sidebarOpen?"PanelLeftClose":"PanelLeftOpen"} size={16} className="flex-shrink-0"/>
            {sidebarOpen && <span>Свернуть</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">ContactHunter</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground"/>
            <span className="text-foreground font-medium">{titles[page]}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">АД</div>
            <span className="text-sm text-foreground hidden sm:block">Администратор</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-foreground">{titles[page]}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </p>
            </div>
            {content[page]}
          </div>
        </main>
      </div>
    </div>
  );
}