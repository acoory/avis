# Photos commerciales RISK

Le parcours est : DRAFT → SUBMITTED → COMMERCIAL_PHOTOS → CLOSED.
Le responsable principal ou un administrateur termine le traitement et clôture. Le créateur et les personnes assignées peuvent compléter les photos commerciales pendant cette étape.

Les photos commerciales sont stockées séparément des photos de traitement. La clôture contrôle les 12 vues obligatoires, le kilométrage et les 4 éléments conditionnels. Les documents ou accessoires présents nécessitent une photo ; les éléments absents ne doivent pas en avoir.

La clôture crée un jeton aléatoire de 256 bits. La galerie `/commercial/[token]` et son ZIP sont accessibles sans compte ; leur API ne sélectionne que la marque, la plaque, le kilométrage et les photos commerciales. Le lien reste permanent. Aucun mécanisme de désactivation n’est prévu. Les anciens dossiers déjà clos restent inchangés, sans lien commercial.

## Déploiement

Avant de démarrer la nouvelle version du serveur, appliquer les migrations avec `prisma migrate deploy` depuis le dossier backend, puis générer le client Prisma et déployer le serveur et le dashboard. La migration ajoutée est `20260908120000_risk_commercial_photos` ; elle ne transforme pas les dossiers existants. La migration n’a pas été appliquée à une base dans cette intervention.

Vérifier que `NEXT_PUBLIC_API_URL` désigne l’API publique accessible aux acheteurs et que `FRONTEND_URL` autorise l’origine du dashboard. Cloudinary utilise un dossier `commercial-photos` distinct, avec les mêmes identifiants déjà configurés.

## Vérification

- Backend : `npm test -- --runInBand --watchman=false risk-vehicles.service.spec.ts` et `npm run build`.
- Dashboard : `npm run build -- --webpack` (alternative locale lorsque le sandbox empêche Turbopack d’ouvrir son port).
- Vérification manuelle avec un dossier de test : terminer le traitement, enregistrer le kilométrage et les équipements, déposer les photos, clôturer, ouvrir le lien dans une fenêtre privée et télécharger le ZIP. Le transfert Cloudinary réel n’a pas été exécuté pendant cette intervention.

## Réconciliation de l’historique de développement

La migration `20260816150000_risk_showroom` a été restaurée à la version exacte appliquée à la base de développement (SHA-256 `5777fff9349ec0a139eb9c0b12f66be63cd271dd0d993be11dee7014287f1b30`). Cette version inclut `mileage`, `vin` et la relation `vehicleModelId`, réintégrés dans le schéma Prisma. `TIRE_DAMAGE` reste ajouté par la migration suivante. Aucun checksum en base n’a été réécrit. Une comparaison en lecture seule confirme que les seules différences restantes sont les additions de la fonctionnalité commerciale.

## Correction des bases de production sans les champs historiques

La migration `20260909090000_reconcile_risk_vehicle_fields` ajoute `vehicleModelId`, `mileage`, `vin`, l’index et la clé étrangère seulement s’ils sont absents. Elle préserve les données des bases où ils existent déjà. Elle est nécessaire car la version historique appliquée en production diffère de celle appliquée en développement.

Le conteneur exécute maintenant `pnpm exec prisma migrate deploy` au démarrage avant de lancer l’API. Un échec de migration empêche le démarrage. Pour un déploiement qui remplace la commande Docker, exécuter cette commande dans l’environnement de production avant de redémarrer l’API. Ne pas utiliser `migrate dev` ou `migrate reset` en production.
