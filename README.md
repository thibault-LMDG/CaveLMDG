# Cave LMDG 🍷

Application web de gestion de cave pour **La Marine des Goudes** (Marseille).

Mobile-first, orientée équipe de salle. Thème sombre nautique.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (même base que le dashboard LMDG)
- **Tailwind CSS** + inline styles
- **PWA** installable

## Setup

```bash
npm install
cp .env.local.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Déploiement

Vercel → sous-domaine `cave.lmdg.fr`

## Base Supabase

Tables préfixées `cave_` sur le projet `unlfsgolerufpbrqwvld` :
- `cave_agents` (11 fournisseurs)
- `cave_domains` (49 domaines)  
- `cave_wines` (78 références)
- `cave_pricing_grid` (20 paliers)
- `cave_stock_movements` (source de vérité stock)
