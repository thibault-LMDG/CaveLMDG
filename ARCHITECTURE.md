# Architecture Cave LMDG — 26/05/2026

## Vue d'ensemble

Application web Next.js pour la gestion de cave du restaurant La Marine des Goudes (Marseille). Mobile-first, orientée équipe de salle + interface client. Supabase backend, Vercel deployment.

## Infrastructure

| Composant | Détails |
|-----------|---------|
| Repo | `thibault-LMDG/CaveLMDG` (GitHub) |
| Stack | Next.js 16.x, Tailwind + inline styles, Supabase |
| Supabase | Projet `unlfsgolerufpbrqwvld` (partagé avec dashboard LMDG) |
| Vercel | Projet `cave-lmdg` (ID: `prj_LbBpTsGkSjKwK8NVu3SNsNCgH6tN`) |
| Prod | `cave-lmdg.vercel.app` (branche `main`) |
| Dev | `cave-lmdg-git-dev-thibault-s-projects1.vercel.app` (branche `dev`) |
| API IA | Claude Sonnet `claude-sonnet-4-6` |
| Env vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` |

## Pages & routes

### App cave (thème sombre, bottom nav)

```
src/app/
├── cave/page.tsx              Liste vins + KPIs + recherche + filtres
├── cave/[id]/page.tsx         Fiche vin complète
├── cave/[id]/edit/page.tsx    Modification vin
├── cave/new/page.tsx          Ajout vin + pricing auto + IA commentaires
├── stock/page.tsx             Mouvements stock + entrée rapide
├── search/page.tsx            Recherche globale
├── more/page.tsx              Menu Plus
├── more/agents/               Agents fournisseurs (CRUD)
├── more/pricing/              Grille coefficients
├── more/tiller/               Mapping Tiller ↔ vins
├── more/domaines/             Liste domaines + fiches
├── more/formation/            Hub formation (quiz, brief, collectif)
├── more/sommelier/            Sommelier serveur (scoring client-side)
├── more/knowledge/            Fiches augmentées (enrichissement IA + validation)
├── more/carte/                Carte des vins preview + PDF
```

### App client (thème clair Marine, standalone)

```
├── sommelier-client/          Sommelier conversationnel client (QR code)
│   ├── layout.tsx             Layout standalone (z-index 9999, pas de nav)
│   └── page.tsx               Interface conversationnelle IA
```

### API routes

```
├── api/generate-comments/     Génération commentaires vin (Sonnet)
├── api/generate-vibes/        Batch tagging profil_vibes (Sonnet)
├── api/generate-quiz/         Pioche questions quiz (SELECT Supabase)
├── api/generate-quiz-batch/   Génération questions quiz (Sonnet → Supabase)
├── api/brief/                 Brief pré-service
├── api/sommelier-ai/          Chat IA sommelier serveur
├── api/sommelier-client/      Chat IA sommelier client (catalogue + knowledge)
├── api/enrich-wine/           Enrichissement fiche vin (Sonnet + web search)
├── api/sync-tiller-cave/      Sync ventes Tiller → stock
```

## Schéma Supabase

### Tables principales

| Table | Rôle |
|-------|------|
| `cave_wines` | Vins actifs. profil_vibes text[], commentaires, accords, certifications, stock |
| `cave_domains` | 49 domaines avec commentaire_domaine |
| `cave_agents` | 11 agents fournisseurs |
| `cave_stock_movements` | Source de vérité stock (trigger auto) |
| `cave_pricing_grid` | 20 paliers coefficients dégressifs |
| `cave_tiller_mapping` | Mapping Tiller ↔ vins (btl + verre) |
| `cave_quiz_questions` | ~300 questions quiz (2 parcours × 10 niveaux) |
| `cave_brief_push` | Forçage vins à pousser |
| `cave_wine_knowledge` | Fiches enrichies IA (dégustation, terroir, pitch_serveur, anecdote, sources) |
| `cave_tiller_catalog` | 499 produits Tiller/SumUp |

## Modules fonctionnels

### Sommelier serveur (/more/sommelier)
Flow Couleur → Style adaptatif → Budget → Occasion. Scoring client-side + bonus région LMDG. 3 picks labellés. Filtres multi-région/cépage/plat/bio. profil_vibes sur cave_wines.

### Sommelier client (/sommelier-client)
Standalone, design charte Marine (vert #1C5733, Luminari, Copperplate). Conversationnel IA via /api/sommelier-client. Catalogue complet + knowledge validées en contexte Sonnet. Fiche complète bottom sheet. URL QR code: cave-lmdg.vercel.app/sommelier-client

### Fiches augmentées (/more/knowledge)
Enrichissement Sonnet + web search. Table cave_wine_knowledge. Workflow pending→enriching→ready→validated/rejected. Multi-sélection + file d'attente. Validation humaine.

### Formation (/more/formation)
Quiz individuel 2×10 niveaux, brief pré-service, quiz collectif projeté.

### Carte des vins (/more/carte)
Preview HTML + PDF. Design verrouillé charte WEAREMB.

## Design system

### App cave: thème sombre nautique
sea #0a1628, gold #e8c87a, teal #5bc4b0, typo système

### App client: charte Marine
Blanc, vert #1C5733, or #B8963E, Luminari + Copperplate, illustrations /public/sommelier/

## Conventions

1. Tables préfixées `cave_`, RLS anon (MVP)
2. stock_movements = source de vérité (trigger)
3. Modèle Claude: `claude-sonnet-4-6`
4. Branches: dev → main. Push dev d'abord.
5. Soft delete, jamais DELETE physique
