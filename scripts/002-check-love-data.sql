-- Verificar dados atuais na tabela radio_stats
SELECT * FROM radio_stats;

-- Verificar se existe a linha love_total
SELECT * FROM radio_stats WHERE key = 'love_total';

-- Se não existir, inserir com valor 0
INSERT INTO radio_stats (key, total, updated_at) 
VALUES ('love_total', 0, NOW()) 
ON CONFLICT (key) DO NOTHING;

-- Verificar dados após inserção
SELECT * FROM radio_stats WHERE key = 'love_total';

-- Verificar logs de cliques
SELECT COUNT(*) as total_clicks FROM love_clicks;
SELECT * FROM love_clicks ORDER BY created_at DESC LIMIT 5;
