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
| POS | Tiller (sync via dashboard existant) |
| Repo | `thibault-LMDG/CaveLMDG` |

## Flux de données

```
Tiller (caisse)
    │ (cron dashboard 4h)
    ▼
lignes_produits (Supabase)
    │ (vue v_cave_tiller_sales)
    ▼
/api/sync-tiller-cave (cron Vercel 4h)
    │
    ▼
cave_stock_movements → trigger → cave_wines.quantite_stock
```

## Structure des pages

```
/cave              — Liste 78 vins + KPIs + recherche + filtres
/cave/[id]         — Fiche vin détaillée (4 commentaires, stock, agent)
/cave/[id]/edit    — Modification vin
/cave/new          — Ajout vin + pricing auto + génération IA
/stock             — Mouvements stock + entrée rapide
/search            — Recherche globale
/more              — Menu navigation secondaire
/more/agents       — Liste agents fournisseurs
/more/agents/[id]  — Fiche agent éditable
/more/pricing      — Grille coefficients
/more/tiller       — Mapping Tiller ↔ vins
/more/domaines     — Liste domaines + fiches détaillées
/more/carte              — Carte des vins PDF (preview HTML + impression)
/more/formation              — Hub Formation (2 parcours, brief, collectif)
/more/formation/quiz         — Quiz individuel (Culture Vin + Notre Cave, 10 niveaux)
/more/formation/brief        — Brief pré-service (vins à pousser, ruptures, anecdote)
/more/formation/collectif    — Quiz collectif pré-service (mode projeté)
/api/generate-comments       — POST → Claude Sonnet (cépages + commentaires)
/api/sync-tiller-cave        — GET → sync ventes Tiller → stock (cron)
/api/generate-quiz           — POST → pioche questions aléatoires dans Supabase
/api/generate-quiz-batch     — POST → génère questions via Claude et stocke dans Supabase
/api/brief                   — GET → calcul vins à pousser + ruptures + anecdote
```

## Tables Supabase (préfixe cave_)

| Table | Rows | Rôle |
|-------|------|------|
| `cave_wines` | 78 | Référentiel vins (GENERATED: prix_fp_inclus, coefficient, bevcost_pct). Champs au_verre + prix_verre + verres_par_bouteille pour service au verre. |
| `cave_domains` | 48 | Domaines viticoles + commentaire_domaine |
| `cave_agents` | 11 | Agents fournisseurs |
| `cave_stock_movements` | ~100+ | Source de vérité stock (trigger auto) |
| `cave_pricing_grid` | 20 | Grille coefficients dégressifs |
| `cave_tiller_mapping` | 78 | Lien produit Tiller ↔ vin cave |
| `cave_quiz_questions` | ~300 | Banque de questions quiz (15/niveau, 2 parcours × 10 niveaux) |
| `cave_brief_push` | variable | Forçage manuel vins à pousser dans le brief |

## Vues Supabase

| Vue | Rôle |
|-----|------|
| `v_cave_tiller_products` | Agrège produits vin Tiller (bypass RLS lignes_produits) |
| `v_cave_tiller_sales` | Joint ventes + mapping pour sync stock |
| `v_cave_bevcost` | BevCost mensuel |
| `v_cave_valuation` | Valorisation cave totale |
| `v_cave_stock_dormant` | Vins sans vente > 90 jours |

## Module Formation

### Quiz individuel — 2 parcours × 10 niveaux
- **Culture Vin** : connaissances générales vin (Les bases → Expert)
- **Notre Cave** : connaissances spécifiques aux 78 vins (Découvrir → Sommelier LMDG)
- Niveaux 1-8 : QCM (4 choix), Niveaux 9-10 : questions ouvertes évaluées par Claude
- 15 questions par niveau en base, pioche aléatoire de 10
- 80% (8/10) pour débloquer le niveau suivant
- Progression stockée en localStorage (MVP sans auth)

### Niveaux Culture Vin
1. Les bases — 2. Les familles — 3. Les régions — 4. Les cépages — 5. La dégustation
6. Accords — 7. Vinification — 8. Appellations — 9. Le service — 10. Expert

### Niveaux Notre Cave
1. Découvrir — 2. Les couleurs — 3. Nos domaines — 4. Les cuvées — 5. Nos cépages
6. En parler — 7. Nos accords — 8. Argumenter — 9. Nos histoires — 10. Sommelier LMDG

### Brief pré-service
- 3 vins à pousser (score = stock × marge × forçage manuel)
- Ruptures du jour
- Anecdote "Le saviez-vous" sur un domaine aléatoire
- Forçage manuel via table `cave_brief_push` (tag "Choix Thibault")

### Quiz collectif pré-service
- Mode projeté : la directrice lance, pose les questions à voix haute
- Configurable : thème (Mix/Culture/Cave), difficulté (Facile/Moyen/Dur), nombre (3/5/10)
- Boutons "L'équipe a trouvé ? Oui/Non"

### Architecture questions
- Questions pré-générées par Claude Sonnet et stockées dans `cave_quiz_questions`
- API `/api/generate-quiz-batch` pour regénérer (POST avec parcours + levels)
- API `/api/generate-quiz` pioche aléatoirement dans la base (instantané)
- Régénération batch : `curl -X POST "https://cave-lmdg.vercel.app/api/generate-quiz-batch" -H "Content-Type: application/json" -d '{"parcours":"culture","levels":[1]}'`

## Commentaires vins (4 champs)

| Champ | Table | Description |
|-------|-------|-------------|
| `commentaire_domaine` | cave_domains | Histoire/terroir (partagé entre vins du domaine) |
| `commentaire_cuvee` | cave_wines | Profil + argument de vente |
| `accords_carte` | cave_wines | Plats actifs Tiller |
| `commentaire_client` | cave_wines | 5-8 mots vendeurs pour carte |

## Nomenclature Tiller

Format : `Domaine Cuvee - Type` (ASCII, pas d'accents)
Suffixes : Blc / Rge / Rose / Bulle / Doux
Catégories : Blancs New / Rouges New / Rose New / Bulles New
Tri : Provence → Rhône → Languedoc → Sud-Ouest → Loire → Bourgogne → Alsace → Bordeaux

## Env vars requises (Vercel)

| Variable | Usage |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase |
| `ANTHROPIC_API_KEY` | Claude API (génération commentaires + quiz batch) |

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
10. Modèle Claude API : `claude-sonnet-4-6` (mis à jour 23/05/2026)

## Carte des vins PDF

### Architecture
- **Page** : `/more/carte` — génère et affiche la carte en preview HTML dans l'app
- **Données** : requête Supabase live (`cave_wines` avec `quantite_stock > 0` et `statut != 'archive'`)
- **Design** : skill Charlotte (`carte-des-vins-marine.skill`) — charte WEAREMB, bichromie vert #1C5733
- **Assets** : fonts (Akzidenz-Grotesk, Copperplate Gothic, Luminari) + illustrations (logo, paysage Maïre, pointu, homard) encodés en base64 dans `src/lib/carte/assets.ts`
- **Pagination** : logique pixel-perfect côté client (mesure hauteur via iframe caché, découpage en pages A4 210×297mm)
- **PDF** : `window.print()` natif sur l'iframe — le HTML est déjà parfaitement paginé dans le DOM

### Structure de la carte
1. **Couverture** — Logo, "CARTE DES VINS", illustration paysage
2. **Mot de la maison** — Citation, texte, illustration pointu
3. **Chapitres** (paginés automatiquement) :
   - CHAPITRE I — BULLES
   - CHAPITRE II — BLANCS
   - CHAPITRE III — ROSÉS
   - CHAPITRE IV — DEMI-SEC
   - CHAPITRE V — ROUGES
4. **Au Verre** — Vins cochés `au_verre=true` avec `prix_verre`, groupés par famille
5. **Clôture** — Illustration homard, mention légale

### Champs utilisés sur la carte
- **Ligne vin** : `cave_domains.nom` · `cuvee` ............. `prix_vente`€
- **Sous-ligne appellation** : `type_appellation` `nom_appellation` · `millesime`
- **Description** : `cepage` — `commentaire_client` (5-8 mots vendeurs, PAS commentaire_cuvee)

### Vins au verre
- Toggle `au_verre` (boolean) dans le formulaire d'édition
- `prix_verre` (NUMERIC, nullable) — prix de vente au verre en €
- `verres_par_bouteille` (integer, défaut 6)
- Le formulaire affiche un calcul de marge : total verres vs bouteille
- Sur la carte PDF : vins groupés par famille avec singulier/pluriel automatique

### Fichiers
- `src/lib/carte/assets.ts` — Fonts + illustrations base64 (~1.3 MB, chargé lazy via dynamic import)
- `src/lib/carte/constants.ts` — Couleurs, textes fixes, ordre chapitres/régions
- `src/app/more/carte/page.tsx` — Page complète (preview + pagination + impression)
