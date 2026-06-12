import { useState } from "react";
import Icon from "@/components/ui/icon";

const NAV_ITEMS = [
  { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
  { id: "leads", label: "Лиды", icon: "Users" },
  { id: "analytics", label: "Аналитика", icon: "BarChart2" },
  { id: "integrations", label: "Интеграции", icon: "Plug" },
];

const MOCK_LEADS = [
  { id: 1, name: "ООО «Технопром»", contact: "Иванов А.В.", source: "Сайт", status: "new", score: 92, amount: "1 200 000 ₽", date: "12.06.2026", phone: "+7 (495) 123-45-67" },
  { id: 2, name: "АО «МегаСтрой»", contact: "Петрова Е.И.", source: "Звонок", status: "in-progress", score: 78, amount: "3 500 000 ₽", date: "11.06.2026", phone: "+7 (499) 234-56-78" },
  { id: 3, name: "ИП Сидоров К.П.", contact: "Сидоров К.П.", source: "Email", status: "done", score: 65, amount: "450 000 ₽", date: "10.06.2026", phone: "+7 (985) 345-67-89" },
  { id: 4, name: "ЗАО «ИнфоТех»", contact: "Николаев Д.С.", source: "Реклама", status: "in-progress", score: 84, amount: "2 100 000 ₽", date: "09.06.2026", phone: "+7 (916) 456-78-90" },
  { id: 5, name: "ООО «РосГрупп»", contact: "Смирнова Т.В.", source: "Партнёр", status: "lost", score: 34, amount: "800 000 ₽", date: "08.06.2026", phone: "+7 (903) 567-89-01" },
  { id: 6, name: "ПАО «АльфаЛогист»", contact: "Козлов В.Н.", source: "Сайт", status: "new", score: 88, amount: "5 700 000 ₽", date: "07.06.2026", phone: "+7 (926) 678-90-12" },
  { id: 7, name: "ООО «БетаПрайм»", contact: "Морозова О.К.", source: "Email", status: "done", score: 71, amount: "990 000 ₽", date: "06.06.2026", phone: "+7 (967) 789-01-23" },
  { id: 8, name: "ЗАО «ГаммаСистемс»", contact: "Волков И.Р.", source: "Звонок", status: "new", score: 95, amount: "8 400 000 ₽", date: "05.06.2026", phone: "+7 (977) 890-12-34" },
];

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  "in-progress": "В работе",
  done: "Закрыт",
  lost: "Потерян",
};

const STATUS_CLASSES: Record<string, string> = {
  new: "status-new",
  "in-progress": "status-in-progress",
  done: "status-done",
  lost: "status-lost",
};

const STAT_CARDS = [
  { label: "Всего лидов", value: "248", delta: "+18%", icon: "Users", color: "text-blue-400" },
  { label: "Новые сегодня", value: "14", delta: "+3", icon: "UserPlus", color: "text-emerald-400" },
  { label: "Конверсия", value: "23.4%", delta: "+2.1%", icon: "TrendingUp", color: "text-amber-400" },
  { label: "Выручка в работе", value: "42.3 млн", delta: "+8.7%", icon: "DollarSign", color: "text-violet-400" },
];

const INTEGRATIONS = [
  { name: "Bitrix24", desc: "CRM-система", icon: "Link2", color: "bg-blue-500/10 text-blue-400" },
  { name: "AmoCRM", desc: "Управление сделками", icon: "Briefcase", color: "bg-emerald-500/10 text-emerald-400" },
  { name: "Telegram Bot", desc: "Уведомления в мессенджер", icon: "MessageCircle", color: "bg-sky-500/10 text-sky-400" },
  { name: "Google Analytics", desc: "Веб-аналитика", icon: "BarChart", color: "bg-orange-500/10 text-orange-400" },
  { name: "Email (SMTP)", desc: "Автоматические письма", icon: "Mail", color: "bg-rose-500/10 text-rose-400" },
  { name: "WhatsApp Business", desc: "Чат-уведомления", icon: "Phone", color: "bg-green-500/10 text-green-400" },
];

const CHART_DATA = [
  { month: "Янв", leads: 31, conv: 6 },
  { month: "Фев", leads: 42, conv: 9 },
  { month: "Мар", leads: 58, conv: 14 },
  { month: "Апр", leads: 47, conv: 11 },
  { month: "Май", leads: 73, conv: 18 },
  { month: "Июн", leads: 65, conv: 16 },
];

const SOURCE_DATA = [
  { label: "Сайт", value: 38, color: "#3b82f6" },
  { label: "Звонок", value: 22, color: "#f59e0b" },
  { label: "Email", value: 18, color: "#8b5cf6" },
  { label: "Реклама", value: 14, color: "#10b981" },
  { label: "Партнёр", value: 8, color: "#f43f5e" },
];

function BarChartCustom() {
  const maxLeads = Math.max(...CHART_DATA.map((d) => d.leads));
  return (
    <div className="flex items-end gap-3 h-40 w-full">
      {CHART_DATA.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="w-full flex flex-col items-center gap-0.5 relative">
            <div
              className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-all duration-300 relative"
              style={{ height: `${(d.leads / maxLeads) * 120}px` }}
            >
              <div
                className="absolute bottom-0 w-full rounded-sm bg-emerald-500/60"
                style={{ height: `${(d.conv / d.leads) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart() {
  const total = SOURCE_DATA.reduce((acc, d) => acc + d.value, 0);
  let offset = 0;
  const r = 60, cx = 80, cy = 80, strokeWidth = 18;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(220, 14%, 16%)" strokeWidth={strokeWidth} />
        {SOURCE_DATA.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = circumference * 0.25 - offset * circumference;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={currentOffset}
              className="transition-all duration-500"
            />
          );
          offset += pct;
          return el;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="hsl(210, 20%, 92%)" fontSize="22" fontWeight="600" fontFamily="IBM Plex Mono">248</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(215, 15%, 55%)" fontSize="11" fontFamily="IBM Plex Sans">лидов</text>
      </svg>
      <div className="flex flex-col gap-2 flex-1">
        {SOURCE_DATA.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-sm text-muted-foreground">{d.label}</span>
            </div>
            <span className="text-sm font-mono font-medium text-foreground">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => (
          <div key={i} className="bg-card card-glow rounded p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">{card.label}</span>
              <div className={`${card.color} opacity-70`}>
                <Icon name={card.icon} size={16} />
              </div>
            </div>
            <div className="font-mono text-2xl font-semibold text-foreground">{card.value}</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <Icon name="ArrowUpRight" size={12} />
              {card.delta} за месяц
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card card-glow rounded p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Динамика лидов</h3>
              <p className="text-xs text-muted-foreground mt-0.5">По месяцам, 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-primary/70" />
                Лидов
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-emerald-500/60" />
                Закрыто
              </div>
            </div>
          </div>
          <BarChartCustom />
        </div>

        <div className="bg-card card-glow rounded p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">Источники лидов</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Распределение по каналам</p>
          </div>
          <DonutChart />
        </div>
      </div>

      <div className="bg-card card-glow rounded p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Последние лиды</h3>
        <div className="space-y-2">
          {MOCK_LEADS.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  {lead.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{lead.name}</div>
                  <div className="text-xs text-muted-foreground">{lead.contact} · {lead.source}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-foreground">{lead.amount}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[lead.status]}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Leads() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = MOCK_LEADS.filter((l) => {
    const matchStatus = filter === "all" || l.status === filter;
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.contact.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {["all", "new", "in-progress", "done", "lost"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded transition-all font-medium ${
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Все" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-muted rounded px-3 py-1.5 w-64">
          <Icon name="Search" size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по лидам..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
      </div>

      <div className="bg-card card-glow rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Компания", "Контакт", "Источник", "Телефон", "Статус", "Оценка", "Сумма", "Дата"].map((h) => (
                <th key={h} className="text-left text-xs text-muted-foreground uppercase tracking-widest px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => (
              <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                      {lead.name[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{lead.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.contact}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{lead.source}</span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{lead.phone}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${lead.score >= 80 ? "bg-emerald-400" : lead.score >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-foreground">{lead.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{lead.amount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{lead.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Лиды не найдены</div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Показано {filtered.length} из {MOCK_LEADS.length} лидов</span>
        <div className="flex items-center gap-1">
          <button className="px-2 py-1 bg-muted rounded hover:bg-muted/80">←</button>
          <button className="px-2 py-1 bg-primary text-primary-foreground rounded">1</button>
          <button className="px-2 py-1 bg-muted rounded hover:bg-muted/80">2</button>
          <button className="px-2 py-1 bg-muted rounded hover:bg-muted/80">→</button>
        </div>
      </div>
    </div>
  );
}

function Analytics() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Конверсия сайт", value: "31.2%", delta: "+4.1%", good: true },
          { label: "Конверсия реклама", value: "12.8%", delta: "-1.3%", good: false },
          { label: "Ср. время закрытия", value: "8.4 дн", delta: "-1.2 дн", good: true },
          { label: "Ср. сумма сделки", value: "2.1 млн", delta: "+18%", good: true },
        ].map((m, i) => (
          <div key={i} className="bg-card card-glow rounded p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{m.label}</div>
            <div className="font-mono text-2xl font-semibold text-foreground mb-2">{m.value}</div>
            <div className={`text-xs flex items-center gap-1 ${m.good ? "text-emerald-400" : "text-rose-400"}`}>
              <Icon name={m.good ? "ArrowUpRight" : "ArrowDownRight"} size={12} />
              {m.delta} к прошлому месяцу
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card card-glow rounded p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Воронка продаж</h3>
          <p className="text-xs text-muted-foreground mb-6">Конверсия по этапам</p>
          <div className="space-y-3">
            {[
              { stage: "Новые лиды", count: 248, pct: 100, color: "bg-blue-500" },
              { stage: "Квалификация", count: 186, pct: 75, color: "bg-indigo-500" },
              { stage: "Переговоры", count: 112, pct: 45, color: "bg-violet-500" },
              { stage: "КП отправлено", count: 74, pct: 30, color: "bg-amber-500" },
              { stage: "Закрытые", count: 58, pct: 23, color: "bg-emerald-500" },
            ].map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{s.stage}</span>
                  <span className="font-mono text-foreground">
                    {s.count} <span className="text-muted-foreground">({s.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card card-glow rounded p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Источники по выручке</h3>
          <p className="text-xs text-muted-foreground mb-6">Сумма сделок по каналам</p>
          <div className="space-y-4">
            {[
              { source: "Сайт", amount: "18.4 млн", pct: 43, color: "bg-blue-500" },
              { source: "Звонок", amount: "11.2 млн", pct: 26, color: "bg-amber-500" },
              { source: "Email", amount: "7.9 млн", pct: 19, color: "bg-violet-500" },
              { source: "Реклама", amount: "3.5 млн", pct: 8, color: "bg-emerald-500" },
              { source: "Партнёр", amount: "1.7 млн", pct: 4, color: "bg-rose-500" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-20 text-xs text-muted-foreground text-right">{s.source}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
                <div className="w-16 text-xs font-mono text-foreground text-right">{s.amount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card card-glow rounded p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Активность по дням недели</h3>
        <p className="text-xs text-muted-foreground mb-6">Среднее количество новых лидов</p>
        <div className="flex items-end gap-3 h-28">
          {[
            { day: "Пн", v: 82 }, { day: "Вт", v: 91 }, { day: "Ср", v: 100 },
            { day: "Чт", v: 95 }, { day: "Пт", v: 88 }, { day: "Сб", v: 45 }, { day: "Вс", v: 32 },
          ].map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-sm bg-primary/60 hover:bg-primary transition-all" style={{ height: `${d.v}%` }} />
              <span className="text-[10px] text-muted-foreground font-mono">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Integrations() {
  const [connected, setConnected] = useState<string[]>(["Bitrix24", "AmoCRM", "Google Analytics"]);

  const toggle = (name: string) => {
    setConnected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-card card-glow rounded p-5 border-l-2 border-primary">
        <div className="flex items-start gap-3">
          <Icon name="Zap" size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-foreground">Автоматический захват лидов</div>
            <div className="text-xs text-muted-foreground mt-1">
              Подключите интеграции, чтобы лиды из всех источников автоматически попадали в систему и распределялись по менеджерам.
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map((intg, i) => {
          const isActive = connected.includes(intg.name);
          return (
            <div key={i} className="bg-card card-glow rounded p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded flex items-center justify-center ${intg.color}`}>
                    <Icon name={intg.icon} size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{intg.name}</div>
                    <div className="text-xs text-muted-foreground">{intg.desc}</div>
                  </div>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? "status-done" : "text-muted-foreground bg-muted"}`}>
                  {isActive ? "Активно" : "Откл."}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {isActive ? "Синхронизация активна" : "Нажмите для подключения"}
                </span>
                <button
                  onClick={() => toggle(intg.name)}
                  className={`text-xs px-3 py-1.5 rounded font-medium transition-all ${
                    isActive
                      ? "bg-muted text-muted-foreground hover:text-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isActive ? "Отключить" : "Подключить"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card card-glow rounded p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Webhook для приёма лидов</h3>
        <div className="flex items-center gap-2 bg-muted rounded p-3">
          <Icon name="Terminal" size={14} className="text-muted-foreground flex-shrink-0" />
          <code className="text-xs font-mono text-primary flex-1 truncate">
            https://api.leadtrack.ru/webhook/capture/a1b2c3d4e5f6
          </code>
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0">
            <Icon name="Copy" size={13} />
            Копировать
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Используйте этот URL для приёма лидов из любой внешней формы через POST-запрос.
        </p>
      </div>
    </div>
  );
}

export default function Index() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const pages: Record<string, JSX.Element> = {
    dashboard: <Dashboard />,
    leads: <Leads />,
    analytics: <Analytics />,
    integrations: <Integrations />,
  };

  const pageTitles: Record<string, string> = {
    dashboard: "Главная",
    leads: "Лиды",
    analytics: "Аналитика",
    integrations: "Интеграции",
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden grid-bg">
      <aside
        className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0 ${
          sidebarOpen ? "w-56" : "w-14"
        }`}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border flex-shrink-0">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <Icon name="Crosshair" size={14} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-sm font-semibold text-foreground tracking-tight whitespace-nowrap">
              LeadTrack
            </span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all ${
                activePage === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon name={item.icon} size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && activePage === item.id && (
                <div className="ml-auto w-1 h-4 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all">
            <Icon name="Settings" size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Настройки</span>}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all"
          >
            <Icon name={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Свернуть</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">LeadTrack</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <span className="text-foreground font-medium">{pageTitles[activePage]}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Bell" size={18} />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
            </button>
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
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-foreground">{pageTitles[activePage]}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              {activePage === "leads" && (
                <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded hover:bg-primary/90 transition-colors font-medium">
                  <Icon name="Plus" size={15} />
                  Добавить лид
                </button>
              )}
            </div>
            {pages[activePage]}
          </div>
        </main>
      </div>
    </div>
  );
}
