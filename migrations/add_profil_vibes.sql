-- Migration: Ajouter la colonne profil_vibes à cave_wines
-- Utilisée par le module Sommelier pour le scoring de recommandation
-- Vocabulaire contrôlé: festif, frais, fin, fruité, puissant, doux, léger, équilibré, costaud

ALTER TABLE cave_wines 
ADD COLUMN IF NOT EXISTS profil_vibes text[] DEFAULT '{}';

-- Index GIN pour performance des requêtes array contains
CREATE INDEX IF NOT EXISTS idx_cave_wines_profil_vibes ON cave_wines USING GIN (profil_vibes);

COMMENT ON COLUMN cave_wines.profil_vibes IS 'Tags de profil sensoriel pour le sommelier interactif. Vocabulaire: festif, frais, fin, fruité, puissant, doux, léger, équilibré, costaud';
