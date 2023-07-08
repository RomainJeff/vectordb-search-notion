# Notion Sync Vector DB

CLI qui permet de récupérer le contenu d'une base de données Notion (collection de page, items...), de récupérer leur contenu, les "split" en chunk, les transformer en embeds (vecteurs) et de les stocker dans une base de données de vecteur (Pinecone). 
Cela permet de les rendre cherchable par similarité par rapport à une "query" (texte) par la suite.

## Comment ça marche ?
### Ingest
![ingest_schema](./doc/asset/ingest_schema.png)

### Search (demo)

## Dependances
- **@notionhq/client**: Notion SDK
- **dotenv/config**: Permet de charger des variables d'env à partir d'un `.env`
- **langchain**: Langchain offre un niveau d'abstraction très agréable pour gérer l'embedding, le stockage et la recherche par la suite dans une Vector DB
- **@pinecone-database/pinecone**: Pinecone (vector DB) Client

## Inputs
### Ingest.ts
Arguments de la CLI:
1. `notionDatabaseID`: L'identifiant de la base Notion depuis laquelle récupérer les données
2. `pineconeNamespace`: Le namespace dans lequel on souhaite stocker les vecteurs

### Search (demo)
Arguments de la CLI:
1. `pineconeNamespace`: Le namespace depuis lequel on souhaite chercher les documents similaires
2. `searchQuery`: Le texte pour lequel on souhaite trouver des documents similaires

### Variables d'environnement
- `NOTION_API_KEY`: L'API key de l'app ayant accès à la DB notion
- `OPENAI_API_KEY`: L'API Key OpenAI (pour générer les embeds)
- `PINECONE_API_KEY`: L'API Key de l'index Pinecone
- `PINECONE_ENVIRONMENT`: L'environnement (localisation) de l'index Pinecone
- `PINECONE_INDEX_NAME`: Le nom de l'index Pinecone

## Comment l'utiliser
- Créer un `.env` à partir du `.env.dist`
- Installer les dépendances `npm install`

**Ingest**
 ```bash
 npx ts-node ingest.ts NOTION_DB_ID PINECONE_NAMESPACE
 ```

**Search (demo)**
 ```bash
 npx ts-node search.ts PINECONE_NAMESPACE "SEARCH_QUERY"
 ```
