CREATE TABLE t_p56466268_lead_capture_system.leads (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  source VARCHAR(100) DEFAULT 'Сайт',
  status VARCHAR(50) DEFAULT 'new',
  amount BIGINT DEFAULT 0,
  notes TEXT,
  score INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW()
);
