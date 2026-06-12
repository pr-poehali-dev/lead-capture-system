CREATE TABLE t_p56466268_lead_capture_system.parse_tasks (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

CREATE TABLE t_p56466268_lead_capture_system.contacts (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES t_p56466268_lead_capture_system.parse_tasks(id),
  source_url TEXT NOT NULL,
  phone VARCHAR(100),
  email VARCHAR(255),
  name VARCHAR(255),
  social_vk VARCHAR(500),
  social_tg VARCHAR(500),
  social_other TEXT,
  raw_page_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON t_p56466268_lead_capture_system.contacts(task_id);
CREATE INDEX ON t_p56466268_lead_capture_system.contacts(phone);
CREATE INDEX ON t_p56466268_lead_capture_system.contacts(email);
