export type WineType = 'BLANC' | 'ROUGE' | 'ROSÉ' | 'BULLE' | 'DEMI-SEC'
export type WineStatus = 'actif' | 'en_attente' | 'epuise' | 'archive'
export type MovementType = 'entree' | 'vente' | 'offert' | 'casse' | 'cuisine' | 'degustation' | 'inventaire'

export interface Agent {
  id: string
  nom: string
  nom_famille: string | null
  prenom: string | null
  entreprise: string | null
  telephone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export interface Domain {
  id: string
  nom: string
  region: string | null
  notes: string | null
  commentaire_domaine: string | null
  created_at: string
}

export interface Wine {
  id: string
  type: WineType
  region: string
  type_appellation: 'AOP' | 'IGP' | 'VDF' | null
  nom_appellation: string | null
  domain_id: string | null
  cuvee: string | null
  cepage: string | null
  millesime: string | null
  prix_achat_ht: number
  frais_port: number
  prix_fp_inclus: number   // GENERATED
  prix_vente: number
  coefficient: number | null // GENERATED
  bevcost_pct: number | null // GENERATED
  quantite_stock: number
  stock_minimum: number
  emplacement: string | null
  statut: WineStatus
  au_verre: boolean
  prix_verre: number | null
  verres_par_bouteille: number
  agent_id: string | null
  conditions_franco: string | null
  commentaire_serveur: string | null
  commentaire_client: string | null
  commentaire_cuvee: string | null
  accords_carte: string | null
  certification: string | null
  sans_sulfites: boolean
  non_filtre: boolean
  levures_indigenes: boolean
  profil_vibes: string[]
  created_at: string
  updated_at: string
  // Joined
  cave_domains?: Domain
  cave_agents?: Agent
}

export interface StockMovement {
  id: string
  wine_id: string
  type: MovementType
  quantite: number
  motif: string | null
  user_id: string | null
  commentaire: string | null
  created_at: string
  // Joined
  cave_wines?: Wine
}

export interface PricingGrid {
  id: string
  prix_achat_seuil: number
  bevcost_target: number
  coefficient: number
  prix_vente_theorique: number
}
