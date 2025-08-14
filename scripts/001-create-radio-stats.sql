-- Criar tabela para estatísticas da rádio
CREATE TABLE IF NOT EXISTS radio_stats (
  key TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Inserir linha inicial para contagem de amores
INSERT INTO radio_stats (key, total) 
VALUES ('love_total', 0) 
ON CONFLICT (key) DO NOTHING;

-- Opcional: tabela de logs para análises futuras (comentada no código)
CREATE TABLE IF NOT EXISTS love_clicks (
  id SERIAL PRIMARY KEY,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
