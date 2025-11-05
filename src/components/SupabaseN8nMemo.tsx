import React from 'react';

type SupabaseN8nMemoProps = {
  onClose: () => void;
};

const SupabaseN8nMemo: React.FC<SupabaseN8nMemoProps> = ({ onClose }) => {
  const memoText = `Synthèse — Workflow Caisse ↔ Supabase (n8n)

Objectif : recevoir une facture depuis la Caisse via Webhook POST, l’insérer/mettre à jour dans Supabase, lire la liste triée, puis répondre au caller avec { inserted, list }.

0) Pré-requis

Project URL Supabase
https://doxvtfojavrjrmwpafnf.supabase.co (attention : tfo, pas to)

Clé :

Recommandé côté n8n : service_role (bypass RLS).

Si anon, laisser les policies RLS actives (voir § SQL).

Table public.factures (exemple de colonnes)
id int8 (PK), created_at timestamptz default now(),
numero_facture text, date_facture date, nom_client text,
email_client text, telephone_client text,
montant_ht numeric, montant_ttc numeric,
total_tva numeric (optionnel, peut être généré),
payment_method text, status text,
produits jsonb.

Vue triée (optionnelle mais pratique) :

CREATE OR REPLACE VIEW public.factures_ordre AS
SELECT * FROM public.factures ORDER BY created_at DESC;
ALTER VIEW public.factures_ordre SET (security_invoker = on);

1) Workflow n8n — nœuds et réglages
1) Webhook Facture (POST)

Path : caisse/facture

Reçoit un JSON de ce type :

{
  "numero_facture": "TEST-012",
  "date_facture": "2025-09-19",
  "nom_client": "Client Demo",
  "email_client": "demo@example.com",
  "telephone_client": "0600000000",
  "montant_ht": 100,
  "montant_ttc": 120,
  "payment_method": "CB",
  "status": "draft",
  "produits": [{ "nom": "Service A", "quantite": 1, "prix_ht": 100 }]
}

Test : en mode Test workflow, utiliser la Test URL (avec /webhook-test/…).
En prod (Active), utiliser la Production URL (avec /webhook/…).

2) Set Config (URL + KEY)

Keep Only Set : OFF (pour laisser passer body du webhook).

Ajoute deux strings :

supabase_url = https://doxvtfojavrjrmwpafnf.supabase.co

supabase_key = <ta_clé_supabase> (service_role conseillé)

3) Build Payload (Set) — nœud Code JS

Mode : Each item (ou “Run once per item”)

Code :

const input = $json;
const body = input.body ?? input;

const supabase_url = input.supabase_url;
const supabase_key = input.supabase_key;

const ht  = Number(body.montant_ht ?? 0);
const ttc = Number(body.montant_ttc ?? 0);

const payload = [{
  numero_facture: body.numero_facture ?? 'AUTO-' + Date.now(),
  date_facture: body.date_facture ?? new Date().toISOString().slice(0,10),
  nom_client: body.nom_client ?? '',
  email_client: body.email_client ?? '',
  telephone_client: body.telephone_client ?? '',
  montant_ht: ht || null,
  montant_ttc: ttc || null,
  total_tva: (ttc && ht) ? (ttc - ht) : null,
  payment_method: body.payment_method ?? 'CB',
  status: body.status ?? 'draft',
  produits: Array.isArray(body.produits) ? body.produits : []
}];

return [{ json: { supabase_url, supabase_key, payload } }];

Sortie attendue : { supabase_url, supabase_key, payload }.

4) Supabase Insert — HTTP Request (POST)

URL (mode expression { }) :

{{$json.supabase_url}}/rest/v1/factures?on_conflict=numero_facture


Send Headers : ON

Content-Type = application/json

Prefer = resolution=merge-duplicates,return=representation
(si rouge, désactiver { } et coller en texte simple)

apikey = {{$json.supabase_key}}

Authorization = {{'Bearer ' + $json.supabase_key}}

Send Body : ON

Body Content Type : JSON

Body JSON : {{$json.payload}}

Effet : upsert sur numero_facture + retour de la ligne insérée/mise à jour.

5) Supabase List — HTTP Request (GET)

URL (simple et sûr) :

https://doxvtfojavrjrmwpafnf.supabase.co/rest/v1/factures_ordre?select=*&order=created_at.desc&limit=100


(ou version dynamique avec fallback si tu préfères)

Send Headers : ON

Accept = application/json

apikey = {{ $node["Set Config (URL + KEY)"].json.supabase_key }}

Authorization = {{ 'Bearer ' + $node["Set Config (URL + KEY)"].json.supabase_key }}

Send Body : OFF

Sortie : tableau des factures triées (plus récentes en premier).

6) Respond — Respond to Webhook

Response Code : 200

Response Body (expression) :

{{ { inserted: $items('Supabase Insert', 0, 0)?.json, list: $json } }}

2) Branche “GET Sync” (optionnelle)

Pour alimenter l’onglet “Factures” sans POST :

Webhook Sync GET → Supabase List → (Transform pour Caisse) → Respond Sync.

Appel : curl -X GET '<URL_DU_WEBHOOK_SYNC_GET>'

3) SQL utiles (conseillés)

Contrainte anti-doublon + index :

ALTER TABLE public.factures
  ADD CONSTRAINT factures_numero_unique UNIQUE (numero_facture);

CREATE INDEX IF NOT EXISTS factures_numero_idx ON public.factures (numero_facture);


Colonne générée (TVA, option) :

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS total_tva numeric
  GENERATED ALWAYS AS (coalesce(montant_ttc,0) - coalesce(montant_ht,0)) STORED;


Defaults (option) :

ALTER TABLE public.factures
  ALTER COLUMN payment_method SET DEFAULT 'CB',
  ALTER COLUMN status SET DEFAULT 'draft';


RLS (si clé anon côté n8n) :
(exemple lecture/écriture ouvertes — adapte à ton besoin)

-- activer RLS si pas déjà
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

-- lecture
CREATE POLICY IF NOT EXISTS anon_select_factures
ON public.factures FOR SELECT
TO anon
USING (true);

-- insertion
CREATE POLICY IF NOT EXISTS anon_insert_factures
ON public.factures FOR INSERT
TO anon
WITH CHECK (true);


Si tu utilises la clé service_role dans n8n, ce n’est pas requis (elle bypass RLS).

4) Smoke-tests (terminal)

POST (création/upsert)

curl -X POST '<URL_DU_WEBHOOK_FACTURE>' \
  -H 'Content-Type: application/json' \
  -d '{
    "numero_facture": "TEST-012",
    "date_facture": "2025-09-19",
    "nom_client": "Client Demo",
    "email_client": "demo@example.com",
    "telephone_client": "0600000000",
    "montant_ht": 100,
    "montant_ttc": 120,
    "produits": [{ "nom": "Service A", "quantite": 1, "prix_ht": 100 }]
  }'


Résultat attendu :
Réponse { inserted: {...}, list: [...] } + présence de la ligne dans public.factures.

5) Dépannage rapide

404 “webhook not registered”
➜ clique Test workflow (mode test) ou mets le workflow Active et utilise la Production URL.

422 “Failed to parse request body”
➜ tu as collé la commande cURL en body ; envoie un JSON, ou exécute la commande dans le terminal.

401 “No API key found”
➜ ajoute les headers apikey et Authorization: Bearer ….

401/403 RLS
➜ utilise service_role côté n8n ou crée les policies (voir § SQL).

409 (doublon)
➜ garde ?on_conflict=numero_facture + Prefer: resolution=merge-duplicates.

Invalid URL
➜ l’expression URL ne résout pas (ex : $json.supabase_url absent).
Utilise l’URL en dur ou référence $node["Set Config (URL + KEY)"].json.supabase_url.

Typos de domaine
➜ doxvtfojavrjrmwpafnf.supabase.co (avec tfo), pas doxvto….

6) Schéma minimal du flux

Webhook Facture (POST) → Set Config (URL+KEY) → Build Payload (Code) →
Supabase Insert (HTTP POST) → Supabase List (HTTP GET) → Respond to Webhook

(Branche optionnelle : Webhook Sync GET → Supabase List → Respond Sync)
`;

  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 'min(980px, 96vw)', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
        <div style={{ background: 'linear-gradient(135deg, #477A0C 0%, #14281D 100%)', color: 'white', padding: '1rem 1.25rem', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>Synthèse — Workflow Caisse ↔ Supabase (n8n)</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 8, cursor: 'pointer' }}>Fermer</button>
        </div>
        <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem', lineHeight: 1.5 }}>{memoText}</pre>
        </div>
      </div>
    </div>
  );
};

export default SupabaseN8nMemo;


