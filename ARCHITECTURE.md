# Cave LMDG — Architecture & État du projet

> Dernière mise à jour : 24/05/2026

## Vue d'ensemble

Application web Next.js de gestion de cave pour La Marine des Goudes (Marseille).
Mobile-first, orientée équipe de salle. Séparée du dashboard LMDG mais partage la même base Supabase.

## Stack

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 16.x + Tailwind + inline styles |
| Backend | Supabase (projet `unlfsgolerufpbrqwvld`) |
| Déploiement | Vercel (`cave-lmdg`) |
| IA | Claude API Sonnet (`claude-sonnet-4-6`) |
| POS | SumUp/Tiller V3 (OAuth2, sync ventes + catalogue) |
| Repo | `thibault-LMDG/CaveLMDG` |
| Dashboard | `thibault-LMDG/Dashboard2` (Vercel `lmdg-dashboard`) |

## Flux de données

```
SumUp/Tiller (caisse)
    │
    ├── Orders V3 (cron sync-tiller Edge Function, 4h)
    │   ▼
    │   commandes + lignes_produits (Supabase)
    │
    ├── Webhook V2 (PRODUCT_CREATED/UPDATED/DELETED)
    │   ▼
    │   tiller-product-webhook (Edge Function) → log sync_log
    │
    └── Webhook V3 (PRICEBOOK_CREATED/UPDATED/DELETED)
        ▼
        tiller-product-webhook (Edge Function) → cave_tiller_catalog

cave_tiller_catalog (499 produits, import CSV + webhooks)
    │
    ▼
cave_tiller_mapping (wine_id ↔ tiller btl + verre)
    │
    ▼
/api/sync-tiller-cave (cron Vercel 4h, lookup par nom produit)
    │ Bouteilles: -1 par vente
    │ Verres: -1/verres_par_bouteille par verre vendu
    ▼
cave_stock_movements → trigger → cave_wines.quantite_stock
```

## Structure des pages

```
/cave              — Liste 79 vins + KPIs + recherche + filtres
/cave/[id]         — Fiche vin détaillée (4 commentaires, stock, agent)
/cave/[id]/edit    — Modification vin
/cave/new          — Ajout vin + pricing auto + génération IA
/stock             — Mouvements stock + entrée rapide
/search            — Recherche globale
/more              — Menu navigation secondaire
/more/agents       — Liste agents fournisseurs
/more/agents/[id]  — Fiche agent éditable
/more/pricing      — Grille coefficients
/more/tiller       — Mapping Tiller ↔ vins (double mapping btl/verre, auto-suggestion)
/more/domaines     — Liste domaines + fiches détaillées
/more/formation    — Hub Formation
/more/formation/quiz      — Quiz individuel (2 parcours × 10 niveaux)
/more/formation/brief     — Brief pré-service
/more/formation/collectif — Quiz collectif pré-service
/api/generate-comments    — POST → Claude Sonnet (cépages + commentaires)
/api/sync-tiller-cave     — GET → sync ventes Tiller → stock btl + verres (cron)
/api/generate-quiz        — GET → pioche questions aléatoires
/api/generate-quiz-batch  — POST → génère questions via Claude
/api/brief                — GET → brief pré-service
```

## Sync Tiller/SumUp — Détails

### Connexion API V3
- OAuth2 : `https://oauth.api.tiller.systems/oauth2/token`
- Store ID : `51992`
- Tokens dans table `tiller_tokens` (auto-refresh)
- Scopes : `order/read order/write` (catalog/read demandé au support)

### Edge Functions Supabase
- `sync-tiller` : import orders → commandes + lignes_produits
- `tiller-oauth` : gestion OAuth (login/callback/refresh/status)
- `tiller-product-webhook` : webhook unifié V2 PRODUCT + V3 PRICEBOOK + ORDER_CLOSED
- `import-tiller-catalog` : import batch CSV → cave_tiller_catalog

### Webhooks configurés
- **V2** (API V2 section) : PRODUCT_CREATED/UPDATED/DELETED → tiller-product-webhook
- **V3** (API V3 section) : ORDER_CLOSED + PRICEBOOK_CREATED/UPDATED/DELETED → tiller-product-webhook

## Tables Supabase (préfixe cave_)

| Table | Rows | Rôle |
|-------|------|------|
| `cave_wines` | 79 | Référentiel vins (GENERATED: prix_fp_inclus, coefficient, bevcost_pct) |
| `cave_domains` | 49 | Domaines viticoles + commentaire_domaine |
| `cave_agents` | 11 | Agents fournisseurs |
| `cave_stock_movements` | ~100+ | Source de vérité stock (trigger auto) |
| `cave_pricing_grid` | 20 | Grille coefficients dégressifs |
| `cave_tiller_mapping` | 78 | Lien produit Tiller btl + verre ↔ vin cave |
| `cave_tiller_catalog` | 499 | Catalogue complet produits Tiller (import CSV + webhooks) |
| `cave_quiz_questions` | ~300 | Questions quiz (15/niveau, 2 parcours × 10 niveaux) |
| `cave_brief_push` | — | Forçage vins à pousser pour le brief |

## Vues Supabase

| Vue | Rôle |
|-----|------|
| `v_cave_tiller_products` | ⚠️ OBSOLÈTE — remplacé par cave_tiller_catalog |
| `v_cave_tiller_sales` | ⚠️ OBSOLÈTE — sync utilise lookup direct lignes_produits |
| `v_cave_bevcost` | BevCost mensuel |
| `v_cave_valuation` | Valorisation cave totale |
| `v_cave_stock_dormant` | Vins sans vente > 90 jours |

## Commentaires vins (4 champs)

| Champ | Table | Description |
|-------|-------|-------------|
| `commentaire_domaine` | cave_domains | Histoire/terroir (partagé entre vins du domaine) |
| `commentaire_cuvee` | cave_wines | Profil + argument de vente |
| `accords_carte` | cave_wines | Plats actifs Tiller |
| `commentaire_client` | cave_wines | 5-8 mots vendeurs pour carte |

## Nomenclature Tiller

Format bouteille : `Domaine Cuvee - Type` (ASCII, pas d'accents)
Format verre : `V - Domaine - Type` ou `V- Domaine - Type`
Suffixes : Blc / BLC / Rge / Rose / Bulle / Doux / Champ
Catégories bouteille : Blancs New / Rouges New / Rose New / Bulles New
Catégorie verre : Vin Verre

## Env vars requises (Vercel)

| Variable | Usage |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase |
| `ANTHROPIC_API_KEY` | Claude API (génération commentaires) |

## Conventions

1. Tables préfixées `cave_` (pas de conflit avec dashboard)
2. RLS anon pour le MVP
3. stock_movements = source de vérité (trigger auto)
4. Soft delete (statut = 'archive', jamais DELETE)
5. Colonnes GENERATED en base, pas côté client
6. Grille pricing dans pricing_grid, pas hardcodée
7. Thème sombre nautique (theme.ts)
8. Emojis pour icônes, pas lucide-react
9. Push dev d'abord, merge main après validation
10. Modèle Claude API : `claude-sonnet-4-6`
