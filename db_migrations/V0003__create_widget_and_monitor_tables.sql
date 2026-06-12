CREATE TABLE t_p56466268_lead_capture_system.widgets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  site_url VARCHAR(500) NOT NULL,
  competitors TEXT,
  token VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p56466268_lead_capture_system.widget_leads (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER REFERENCES t_p56466268_lead_capture_system.widgets(id),
  phone VARCHAR(100),
  email VARCHAR(255),
  name VARCHAR(255),
  referrer VARCHAR(1000),
  competitor_source VARCHAR(500),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  page_url VARCHAR(1000),
  ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p56466268_lead_capture_system.monitor_tasks (
  id SERIAL PRIMARY KEY,
  competitor_name VARCHAR(255) NOT NULL,
  keywords TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  last_run TIMESTAMP
);

CREATE TABLE t_p56466268_lead_capture_system.monitor_leads (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES t_p56466268_lead_capture_system.monitor_tasks(id),
  source VARCHAR(100),
  author_name VARCHAR(255),
  phone VARCHAR(100),
  email VARCHAR(255),
  text TEXT,
  source_url VARCHAR(1000),
  intent_score INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON t_p56466268_lead_capture_system.widget_leads(widget_id);
CREATE INDEX ON t_p56466268_lead_capture_system.widget_leads(created_at);
CREATE INDEX ON t_p56466268_lead_capture_system.monitor_leads(task_id);
