# FastALPR avec Dokploy

Ce service detecte et lit les plaques avec FastALPR 0.4.0 sur CPU.

## Deploiement recommande

Creer un nouveau service **Docker Compose** dans Dokploy depuis le meme depot Git.

- Compose path : `docker-compose.fastalpr.yml`
- Service : `fastalpr`
- Port interne : `8000`
- Domaine conseille : `https://alpr.votre-domaine.fr`

Variables a ajouter dans l'onglet Environment :

```env
FASTALPR_INTERNAL_TOKEN=une-longue-valeur-aleatoire
FASTALPR_DETECTOR_CONFIDENCE=0.45
FASTALPR_DETECTOR_MODEL=yolo-v9-t-384-license-plate-end2end
FASTALPR_OCR_MODEL=cct-xs-v2-global-model
```

Le compose reference explicitement ces variables avec `${VARIABLE}`. Dokploy ne les
injecte pas automatiquement dans les conteneurs si elles ne sont pas referencees
dans le fichier Compose.

Associer ensuite le domaine au service `fastalpr` sur le port `8000`.

Dans les variables du backend NestJS :

```env
FASTALPR_URL=https://alpr.votre-domaine.fr
FASTALPR_INTERNAL_TOKEN=la-meme-longue-valeur-aleatoire
```

Redployer FastALPR, puis le backend et enfin le dashboard.

## Premier demarrage

Le premier demarrage telecharge environ 11 Mo de modeles ONNX. Le volume nomme
`fastalpr-models` conserve ces fichiers entre les deploiements.

Le healthcheck peut rester en demarrage pendant environ deux minutes. Les
demarrages suivants sont plus rapides.

## Ressources

Configuration de depart conseillee :

- 1 CPU minimum, 2 CPU recommandes
- 1 Go de RAM minimum
- une seule replica
- un seul worker Uvicorn

Avec plusieurs replicas, chaque replica charge sa propre copie des modeles en RAM.

## Securite

Le navigateur ne contacte jamais FastALPR directement. Le flux est :

```text
telephone -> backend NestJS authentifie -> FastALPR
```

Le domaine FastALPR peut etre public pour simplifier le reseau entre deux services
Dokploy, mais toutes les requetes `/recognize` exigent `X-Internal-Token`.

Ne pas reutiliser un secret JWT comme token FastALPR.

## Test

```bash
curl https://alpr.votre-domaine.fr/health
```

Reponse attendue :

```json
{"status":"ready"}
```
