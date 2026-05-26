-- Table de connaissances enrichies par vin
-- Générées par Claude Opus + web search, validées par Thibault

CREATE TABLE IF NOT EXISTS cave_wine_knowledge (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wine_id uuid NOT NULL REFERENCES cave_wines(id) ON DELETE CASCADE,
  
  -- Statut du workflow
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'enriching', 'ready', 'validated', 'rejected')),
  -- pending = pas encore traité
  -- enriching = Opus est en train de bosser
  -- ready = proposition prête, en attente de validation Thibault
  -- validated = validé et visible dans l'app
  -- rejected = refusé, à régénérer
  
  -- Fiche enrichie (proposition Claude)
  degustation_nez text,          -- Notes olfactives
  degustation_bouche text,       -- Notes gustatives
  degustation_finale text,       -- Longueur, persistance
  temperature_service text,      -- Ex: "10-12°C"
  potentiel_garde text,          -- Ex: "2-5 ans" ou "à boire maintenant"
  accords_detailles text,        -- Accords mets-vins détaillés (plus riche que accords_carte)
  histoire_domaine text,         -- Contexte du domaine enrichi
  histoire_cuvee text,           -- Spécificités de la cuvée
  terroir text,                  -- Sol, exposition, altitude, climat
  vinification text,             -- Process de vinification
  pitch_serveur text,            -- 2-3 phrases prêtes à dire au client
  anecdote text,                 -- Un fait marquant / une anecdote
  notes_critiques text,          -- Notes de guides/critiques si trouvées
  
  -- Sources utilisées par Claude
  sources jsonb DEFAULT '[]',    -- [{url, title, snippet}]
  
  -- Métadonnées
  generated_at timestamptz DEFAULT now(),
  validated_at timestamptz,
  validated_by text,             -- 'thibault' pour l'instant
  generation_model text DEFAULT 'claude-opus-4-6',
  
  -- Contrainte unicité
  UNIQUE(wine_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_wine_knowledge_status ON cave_wine_knowledge(status);
CREATE INDEX IF NOT EXISTS idx_wine_knowledge_wine_id ON cave_wine_knowledge(wine_id);

-- RLS anon (MVP)
ALTER TABLE cave_wine_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_wine_knowledge" ON cave_wine_knowledge FOR SELECT USING (true);
CREATE POLICY "anon_insert_wine_knowledge" ON cave_wine_knowledge FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_wine_knowledge" ON cave_wine_knowledge FOR UPDATE USING (true);
