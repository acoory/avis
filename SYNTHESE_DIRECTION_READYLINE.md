# Readyline — Synthèse pour validation par la Direction

## 1. Résumé exécutif

**Readyline** est une application métier conçue pour digitaliser et piloter de bout en bout les contrôles de véhicules Buy Back.

Elle permet de remplacer un suivi dispersé entre saisies manuelles, photos, e-mails, fichiers et relances par un parcours unique et structuré :

1. identification du véhicule ;
2. réalisation du contrôle terrain ;
3. saisie des réparations et ajout des photos ;
4. application des règles de décision ;
5. validation de la synthèse ;
6. organisation des réparations ;
7. suivi des pièces, du prestataire et de la remise en état ;
8. clôture et reporting.

Le projet répond à quatre enjeux prioritaires :

- **réduire le temps administratif par dossier** ;
- **fiabiliser et standardiser les décisions** ;
- **améliorer la visibilité sur l’avancement de chaque véhicule** ;
- **donner au management des indicateurs consolidés et exploitables**.

Le socle fonctionnel est suffisamment avancé pour être évalué dans le cadre d’un pilote encadré. La recommandation est donc de valider un déploiement pilote de quatre à six semaines sur un périmètre limité, afin de mesurer objectivement les gains avant généralisation.

---

## 2. Décision demandée à la Direction

La décision proposée est la suivante :

> **Autoriser un pilote opérationnel de Readyline sur un nombre limité d’agences et d’utilisateurs, avec mesure des gains de temps, de la qualité des dossiers, des délais de traitement et de la valeur économique créée.**

Cette validation doit idéalement inclure :

- un sponsor métier ;
- un référent opérationnel responsable des règles de gestion ;
- une ou deux agences pilotes ;
- cinq à dix utilisateurs représentatifs ;
- l’accompagnement des équipes informatique et sécurité ;
- un point de décision en fin de pilote pour statuer sur la généralisation.

---

## 3. Constat et problématiques actuelles

Le contrôle et le suivi d’un véhicule nécessitent plusieurs actions successives impliquant potentiellement un collaborateur, un manager, un prestataire et des fonctions support.

Sans outil centralisé, les principales difficultés sont généralement les suivantes :

- informations réparties entre plusieurs supports ;
- ressaisies et recherches manuelles ;
- photos difficiles à rattacher au bon dommage ;
- règles de décision connues de manière inégale ;
- synthèses réalisées manuellement ;
- manque de visibilité sur les actions restant à effectuer ;
- relances dépendantes de la vigilance de chaque personne ;
- statut réel d’un véhicule difficile à connaître rapidement ;
- historique des décisions et responsabilités incomplet ;
- consolidation manuelle pour produire des indicateurs ;
- délais de traitement peu ou pas mesurés ;
- difficulté à identifier les dossiers bloqués ;
- risque d’erreurs, d’oublis et de traitements différents selon les sites.

Le problème n’est donc pas uniquement la durée du contrôle. Il concerne l’ensemble du cycle de vie du dossier, depuis l’arrivée du véhicule jusqu’à sa clôture.

---

## 4. Pourquoi l’entreprise a besoin de Readyline

### 4.1 Centraliser l’information

Chaque véhicule dispose d’un dossier unique regroupant :

- son identification ;
- les informations du contrôle ;
- les réparations constatées ;
- les quantités et commentaires ;
- les photos justificatives ;
- les décisions prises ;
- le lieu prévu pour chaque intervention ;
- les pièces à commander ;
- le suivi du prestataire ;
- les dates importantes ;
- les échanges et notifications ;
- les montants et économies estimés ;
- les documents de synthèse.

Cette centralisation crée une **source d’information commune**, accessible aux personnes autorisées.

### 4.2 Standardiser les pratiques

L’application guide l’utilisateur à travers un parcours identique :

- Véhicule ;
- Informations ;
- Réparations ;
- Synthèse.

Des règles paramétrées selon le constructeur et le type de réparation permettent d’orienter la décision : réparation autorisée, interdite, obligatoire, soumise à condition ou nécessitant une vérification.

L’objectif est de limiter les interprétations individuelles et de rendre les décisions plus cohérentes entre les collaborateurs et les agences.

### 4.3 Accélérer le traitement

Les tâches répétitives sont simplifiées :

- scan de la plaque avec l’appareil photo d’un mobile ;
- détection des éventuels doublons ;
- saisie guidée ;
- rattachement direct des photos aux réparations ;
- calcul et consolidation automatiques des montants ;
- génération de la synthèse ;
- création des actions à effectuer ;
- recherche immédiate d’un véhicule ;
- génération d’un PDF ;
- export Excel ;
- envoi d’une demande de décision ou de prise en charge.

### 4.4 Améliorer la maîtrise financière

Le dossier peut consolider notamment :

- l’économie interne estimée ;
- le coût interne ;
- le coût externe ;
- la différence entre scénarios ;
- les montants associés aux réparations retenues.

Ces informations permettent :

- de mieux documenter les arbitrages ;
- d’identifier les opérations les plus fréquentes ou coûteuses ;
- de comparer les pratiques ;
- de suivre la valeur générée par les décisions ;
- de disposer d’une base plus fiable pour les analyses de gestion.

Ces montants restent des **indicateurs opérationnels de pilotage** et doivent être rapprochés des données comptables lorsqu’une analyse financière officielle est nécessaire.

---

## 5. Parcours opérationnel proposé

### Étape 1 — Identifier le véhicule

L’utilisateur saisit la plaque ou la scanne avec la caméra de son téléphone.

L’application :

- formate la plaque ;
- recherche les informations existantes ;
- vérifie la présence d’un éventuel dossier déjà enregistré ;
- réduit les erreurs de saisie.

### Étape 2 — Compléter le contrôle

L’utilisateur renseigne les informations utiles :

- agence ;
- date du contrôle ;
- constructeur ;
- modèle ;
- informations complémentaires du véhicule.

Les référentiels évitent de multiplier les saisies libres et améliorent la qualité des données.

### Étape 3 — Déclarer les réparations

Pour chaque dommage, l’utilisateur peut :

- sélectionner la zone concernée ;
- choisir le type de réparation ;
- indiquer la quantité ;
- ajouter un commentaire ;
- joindre jusqu’à trois photos ;
- enregistrer le dossier en brouillon.

Les photos sont ainsi directement reliées à l’élément concerné, ce qui facilite la compréhension et la justification de la décision.

### Étape 4 — Préparer la synthèse

L’application présente les réparations retenues, les règles applicables et les décisions à prendre.

L’utilisateur peut notamment :

- confirmer ou adapter le traitement ;
- choisir une intervention sur place ou chez un prestataire ;
- préciser qu’une pièce doit être commandée ;
- renseigner une référence ou un prix ;
- soumettre certains éléments au manager.

### Étape 5 — Organiser les actions

Après validation, l’application regroupe les prochaines étapes :

- pièces à commander ;
- réparations à réaliser sur place ;
- dépôt chez un prestataire ;
- suivi de la prise en charge ;
- récupération du véhicule ;
- finalisation du dossier.

Cette liste d’actions donne une lecture immédiate de ce qui est fait, de ce qui reste à faire et de la personne concernée.

### Étape 6 — Suivre et clôturer

Le dossier progresse à travers des statuts explicites :

- brouillon ;
- à analyser ;
- synthèse prête ;
- terminé ;
- clôturé sans dommage ;
- annulé.

Les principales dates sont enregistrées afin de mesurer :

- le délai entre le contrôle terrain et la synthèse ;
- le délai de prise en charge par le prestataire ;
- le délai de récupération du véhicule ;
- le délai total de traitement.

---

## 6. Améliorations apportées

### 6.1 Gain de temps opérationnel

Readyline réduit le temps consacré :

- à la saisie des informations ;
- à la recherche des dossiers ;
- au classement des photos ;
- à l’interprétation des règles ;
- à la préparation de la synthèse ;
- à la rédaction et à l’envoi des demandes ;
- aux relances ;
- à la consolidation des indicateurs.

Le temps gagné peut être réinvesti dans :

- davantage de véhicules traités ;
- un meilleur contrôle qualité ;
- la résolution des dossiers complexes ;
- l’accompagnement des agences ;
- l’analyse des coûts et des causes récurrentes.

### 6.2 Amélioration du suivi

| Avant | Avec Readyline |
|---|---|
| Informations dispersées | Dossier unique par véhicule |
| Statut obtenu par téléphone ou e-mail | Statut visible immédiatement |
| Liste des actions tenue manuellement | Actions restantes générées et regroupées |
| Relances dépendantes de chaque collaborateur | Notifications et suivi structuré |
| Photos séparées du dossier | Photos liées à chaque réparation |
| Responsabilités parfois difficiles à identifier | Collaborateur, manager et prestataire identifiés |
| Historique incomplet | Actions, changements et dates conservés |
| Dossiers bloqués difficiles à repérer | File des dossiers à analyser et alertes |
| Délais non mesurés | Jalons horodatés et délais calculables |
| Reporting préparé manuellement | Tableau de bord et exports disponibles |

### 6.3 Amélioration de la qualité

Le parcours guidé contribue à :

- réduire les champs oubliés ;
- limiter les doublons ;
- homogénéiser la terminologie ;
- améliorer la qualité des preuves photographiques ;
- appliquer les mêmes règles de gestion ;
- rendre les dossiers plus complets avant transmission ;
- réduire les échanges nécessaires pour obtenir une information manquante.

### 6.4 Amélioration de la traçabilité

L’application permet de savoir :

- qui a créé ou pris en charge un dossier ;
- quelle décision a été prise ;
- sur quel élément elle porte ;
- quand le contrôle a été réalisé ;
- quand la synthèse a été finalisée ;
- quand une pièce a été commandée ;
- quand un prestataire a pris en charge le véhicule ;
- quand le véhicule a été récupéré ;
- si un élément est actif, impossible à réaliser ou annulé ;
- quels commentaires et justificatifs ont été ajoutés.

Cette traçabilité sécurise les opérations, facilite les contrôles internes et réduit les zones d’ambiguïté.

### 6.5 Amélioration de la collaboration

Le dossier peut être partagé de façon contrôlée avec les interlocuteurs concernés.

Les principaux usages sont :

- demander une décision au manager ;
- transmettre les éléments et photos utiles ;
- recueillir un commentaire ;
- demander la prise en charge à un prestataire ;
- confirmer la prise en charge ;
- suivre la récupération du véhicule ;
- notifier les personnes concernées.

Les rôles Administrateur, Manager et Collaborateur permettent d’adapter les droits aux responsabilités de chacun.

### 6.6 Mobilité

L’application est adaptée aux smartphones et peut être installée comme une PWA sur iPhone ou Android.

Elle permet notamment :

- de démarrer un contrôle directement près du véhicule ;
- d’utiliser la caméra pour la plaque ;
- de prendre les photos sans transfert intermédiaire ;
- de consulter ou mettre à jour un dossier en mobilité ;
- de retrouver l’application depuis l’écran d’accueil.

Une connexion réseau reste nécessaire pour les fonctions métier principales. Un fonctionnement totalement hors connexion constituerait une évolution ultérieure.

---

## 7. Estimation du gain de temps

### 7.1 Hypothèse de travail

En l’absence de chronométrage de référence validé, les chiffres ci-dessous doivent être présentés comme des **hypothèses à confirmer pendant le pilote**.

| Activité simplifiée | Gain potentiel par dossier |
|---|---:|
| Identification du véhicule et contrôle des doublons | 0,5 à 1,5 min |
| Saisie guidée et utilisation des référentiels | 1 à 2 min |
| Prise, classement et rattachement des photos | 1 à 3 min |
| Application des règles et préparation de la synthèse | 3 à 5 min |
| Génération du document et transmission | 2 à 4 min |
| Recherche, suivi des actions et relances | 2 à 4 min |
| **Gain total indicatif** | **10 à 15 min par dossier** |

Si un dossier mobilise aujourd’hui entre 25 et 35 minutes de travail administratif cumulé, la cible correspondrait à une réduction d’environ **30 à 45 %**.

Cette estimation doit être validée en comparant :

1. le temps réel avant déploiement ;
2. le temps réel pendant le pilote ;
3. le temps passé par rôle et par étape ;
4. le temps de reprise lié aux informations manquantes ou erronées.

### 7.2 Illustration de la capacité libérée

Hypothèses :

- gain de 10 à 15 minutes par dossier ;
- coût horaire chargé utilisé pour l’illustration : 30 € ;
- activité stable sur douze mois.

| Volume mensuel | Heures libérées par mois | Valeur annuelle indicative |
|---:|---:|---:|
| 200 dossiers | 33 à 50 h | 12 000 à 18 000 € |
| 500 dossiers | 83 à 125 h | 30 000 à 45 000 € |
| 1 000 dossiers | 167 à 250 h | 60 000 à 90 000 € |

Formule :

> Valeur annuelle de capacité = nombre de dossiers mensuels × minutes gagnées ÷ 60 × coût horaire chargé × 12

Cette valeur représente principalement de la **capacité opérationnelle libérée**. Elle ne devient une économie financière directe que si elle réduit des heures supplémentaires, évite un renfort, absorbe une hausse d’activité ou permet de réaffecter les ressources à des tâches à plus forte valeur.

### 7.3 Gains complémentaires

Le calcul précédent ne valorise pas encore :

- la réduction des erreurs ;
- la diminution des dossiers incomplets ;
- la baisse des échanges et relances ;
- la réduction du temps de management consacré à rechercher l’information ;
- l’accélération de la remise à disposition des véhicules ;
- l’amélioration des décisions de réparation ;
- la diminution du risque de perte de justificatifs ;
- l’amélioration de la capacité à négocier ou comparer les prestations ;
- la valeur d’un reporting disponible sans consolidation manuelle.

---

## 8. Apport pour le management et la Direction

### 8.1 Une vision en temps réel

Le tableau de bord peut consolider :

- le nombre de véhicules contrôlés ;
- le nombre de contrôles terminés ;
- les dossiers à analyser ;
- les brouillons ;
- les économies internes estimées ;
- les coûts internes et externes ;
- les écarts entre scénarios ;
- les pièces restant à commander ;
- les dossiers récents ;
- les prises en charge et récupérations ;
- les résultats par constructeur ;
- les résultats par collaborateur ;
- les réparations les plus fréquentes ;
- l’évolution de l’activité sur une période.

### 8.2 Une meilleure gestion des priorités

Les responsables peuvent identifier plus rapidement :

- les dossiers en attente de décision ;
- les pièces non commandées ;
- les véhicules en attente de prise en charge ;
- les dossiers dont le délai devient anormal ;
- les agences ayant besoin d’accompagnement ;
- les écarts de pratiques entre équipes ;
- les réparations récurrentes pouvant justifier une action corrective.

### 8.3 Un pilotage fondé sur les données

L’export Excel et les filtres par période ou collaborateur facilitent :

- les revues d’activité ;
- les analyses de performance ;
- le contrôle de la complétude ;
- le suivi des gains ;
- la préparation de points de management ;
- l’identification des axes d’amélioration.

---

## 9. Indicateurs à mesurer pendant le pilote

### Productivité

- temps médian de création d’un contrôle ;
- temps médian de préparation de la synthèse ;
- temps administratif total par dossier ;
- nombre de dossiers traités par utilisateur ;
- part des dossiers nécessitant une ressaisie.

### Délais

- délai entre contrôle terrain et synthèse finalisée ;
- délai de décision du manager ;
- délai de commande des pièces ;
- délai de prise en charge par le prestataire ;
- délai de récupération ;
- délai total de clôture ;
- ancienneté moyenne des dossiers ouverts.

### Qualité

- taux de dossiers complets au premier envoi ;
- taux de dossiers avec photos exploitables ;
- nombre de doublons détectés ;
- taux d’erreurs ou de corrections ;
- respect des règles de gestion ;
- nombre moyen d’échanges nécessaires par dossier.

### Adoption

- part des utilisateurs actifs chaque semaine ;
- part des contrôles réalisés dans l’application ;
- taux de finalisation des dossiers ;
- satisfaction des utilisateurs ;
- nombre et nature des difficultés remontées.

### Performance économique

- économie interne estimée par dossier ;
- coût interne et coût externe ;
- différence moyenne entre scénarios ;
- valeur de capacité libérée ;
- volume de véhicules supplémentaire absorbable ;
- coût de fonctionnement de la solution.

---

## 10. Critères de succès proposés

Les objectifs définitifs doivent être validés avec les équipes métier. Une première base de décision pourrait être :

- réduction d’au moins **20 %** du temps administratif par dossier ;
- gain médian cible de **10 minutes ou plus** ;
- au moins **90 %** des dossiers complets au premier envoi ;
- au moins **90 %** des contrôles du périmètre pilote réalisés dans l’application ;
- visibilité fiable du statut et des actions restantes pour au moins **95 %** des dossiers ;
- réduction mesurable du nombre de relances manuelles ;
- satisfaction moyenne des utilisateurs d’au moins **4 sur 5** ;
- aucun incident critique de sécurité ou de perte de données ;
- bénéfice opérationnel démontré supérieur au coût de fonctionnement projeté.

---

## 11. Proposition de pilote

### Périmètre

- une à deux agences ;
- cinq à dix utilisateurs ;
- un manager référent ;
- un échantillon représentatif de véhicules et de cas ;
- quatre à six semaines d’utilisation réelle.

### Déroulement

#### Phase 1 — Préparation

- valider les règles métier ;
- nettoyer et compléter les référentiels ;
- définir les rôles et accès ;
- vérifier l’hébergement, la sauvegarde et la sécurité ;
- former les utilisateurs pilotes ;
- mesurer le fonctionnement actuel sur un échantillon de dossiers.

#### Phase 2 — Utilisation pilote

- réaliser les contrôles dans l’application ;
- suivre les indicateurs chaque semaine ;
- recueillir les irritants ;
- corriger rapidement les anomalies bloquantes ;
- vérifier la qualité des données ;
- accompagner les utilisateurs.

#### Phase 3 — Bilan

- comparer les temps avant et après ;
- mesurer la complétude et les délais ;
- calculer la capacité libérée ;
- analyser l’adoption ;
- lister les ajustements nécessaires ;
- produire une recommandation de généralisation.

### Gouvernance

Un point hebdomadaire court doit réunir :

- le sponsor ou son représentant ;
- le référent métier ;
- un représentant des utilisateurs ;
- le responsable du produit ;
- l’informatique si nécessaire.

Le but est de décider rapidement, sur des faits, des corrections et priorités.

---

## 12. Risques et mesures de maîtrise

| Risque | Conséquence possible | Mesure proposée |
|---|---|---|
| Adoption insuffisante | Double suivi et données incomplètes | Formation courte, référent local, suivi hebdomadaire |
| Règles métier mal paramétrées | Décisions incohérentes | Validation formelle par le métier et tests de cas réels |
| Référentiels incomplets | Saisies bloquées ou imprécises | Revue avant pilote et responsable de mise à jour désigné |
| Connexion mobile insuffisante | Difficulté d’usage sur le terrain | Vérification de couverture et procédure temporaire de secours |
| Photos ou données sensibles | Risque de confidentialité | Contrôle des accès, politique de conservation et revue sécurité |
| Liens externes mal maîtrisés | Accès non souhaité à un dossier | Liens temporaires, codes sécurisés, limitation des tentatives |
| Indicateurs financiers mal interprétés | Décisions basées sur une estimation | Afficher clairement les hypothèses et rapprocher de la comptabilité |
| Solution non supervisée | Incident détecté trop tard | Monitoring, journalisation, alertes et responsable de support |
| Mise à jour mal accompagnée | Rupture d’usage ou incompréhension | Versionnement, recette et communication des changements |

---

## 13. Conditions nécessaires avant généralisation

Le pilote doit également permettre de sécuriser les éléments suivants :

- validation des règles métier par les responsables ;
- recette fonctionnelle complète sur mobile et ordinateur ;
- hébergement de production en HTTPS ;
- sauvegarde et restauration de la base de données ;
- supervision de l’application ;
- gestion des incidents et du support ;
- revue de la sécurité et des accès ;
- politique de conservation des photos et données ;
- conformité avec les règles internes de protection des données ;
- procédure de mise à jour de l’application ;
- documentation utilisateur ;
- plan de formation ;
- gouvernance des référentiels ;
- définition d’un propriétaire métier du produit.

La PWA peut recevoir les nouvelles versions sans publication dans un magasin d’applications. La stratégie de mise à jour doit néanmoins prévoir une recette, une communication et un mécanisme permettant d’éviter que les utilisateurs conservent trop longtemps une ancienne version.

---

## 14. Périmètre fonctionnel présenté

La demande de validation porte sur le socle suivant :

- contrôles Buy Back ;
- identification et recherche des véhicules ;
- saisie guidée du contrôle ;
- dommages, réparations, commentaires et photos ;
- règles de décision ;
- synthèse du dossier ;
- gestion des interventions sur place ou chez un prestataire ;
- suivi des pièces nécessaires au dossier ;
- actions à effectuer ;
- demande de décision au manager ;
- transmission et prise en charge par un prestataire ;
- suivi de la récupération du véhicule ;
- historique, notifications et échanges ;
- tableau de bord ;
- exports PDF et Excel ;
- administration des utilisateurs, agences, constructeurs et types de réparations ;
- utilisation sur ordinateur, iPhone et Android.

---

## 15. Feuille de route recommandée

### Priorité 1 — Sécuriser le pilote

- finaliser les tests de bout en bout ;
- valider les règles et référentiels ;
- stabiliser l’expérience mobile ;
- mettre en place la supervision et les sauvegardes ;
- préparer la formation et le support.

### Priorité 2 — Mesurer et améliorer

- instrumenter précisément les temps par étape ;
- améliorer les alertes sur les dossiers en retard ;
- affiner les tableaux de bord ;
- intégrer les retours des agences pilotes ;
- automatiser davantage les relances pertinentes.

### Priorité 3 — Généraliser

- déployer progressivement par agence ;
- nommer des référents locaux ;
- suivre les indicateurs d’adoption ;
- organiser une revue mensuelle des règles ;
- faire évoluer le produit selon les données d’usage.

### Évolutions possibles

- saisie totalement hors connexion ;
- notifications mobiles ;
- indicateurs prédictifs sur les retards ;
- comparaison plus fine entre agences ;
- intégrations avec les outils internes ;
- automatisation renforcée des échanges avec les partenaires.

---

## 16. Argumentaire de présentation

### Message principal

> Readyline ne remplace pas seulement un formulaire. Il structure l’ensemble du processus de contrôle, de décision et de suivi d’un véhicule. Il permet de gagner du temps, de réduire les erreurs, d’améliorer la traçabilité et de piloter l’activité avec des données partagées.

### Ce que l’entreprise y gagne

1. **Du temps** : moins de saisie, de recherche, de préparation et de relance.
2. **De la qualité** : dossiers plus complets et pratiques homogènes.
3. **De la visibilité** : statut, actions restantes et responsables accessibles immédiatement.
4. **De la maîtrise** : règles de décision et indicateurs financiers mieux documentés.
5. **De la traçabilité** : historique des décisions, actions, dates et justificatifs.
6. **De la capacité** : davantage de dossiers absorbés sans augmenter proportionnellement la charge.

### Pourquoi commencer par un pilote

Le pilote permet :

- de confirmer les gains plutôt que de les supposer ;
- de valider les règles avec les utilisateurs ;
- de corriger les derniers irritants ;
- de mesurer l’adoption ;
- de construire un dossier de généralisation fondé sur des résultats réels.

---

## 17. Trame de présentation en 10 diapositives

### Diapositive 1 — Vision

**Readyline : digitaliser et piloter le contrôle Buy Back de bout en bout**

### Diapositive 2 — Problèmes actuels

- informations dispersées ;
- temps administratif ;
- relances manuelles ;
- manque de visibilité ;
- décisions hétérogènes ;
- reporting difficile.

### Diapositive 3 — Solution proposée

Présenter le dossier véhicule unique et le parcours en quatre étapes.

### Diapositive 4 — Parcours opérationnel

De l’identification du véhicule à la clôture, avec photos, décisions, actions et suivi.

### Diapositive 5 — Bénéfices terrain

- simplicité mobile ;
- moins de ressaisies ;
- dossier complet ;
- actions immédiatement visibles ;
- collaboration facilitée.

### Diapositive 6 — Bénéfices management

- vision en temps réel ;
- délais mesurables ;
- dossiers bloqués identifiables ;
- analyse par agence, collaborateur et constructeur ;
- exports disponibles.

### Diapositive 7 — Gains estimés

- cible indicative : 10 à 15 minutes par dossier ;
- 30 à 45 % de temps administratif en moins selon le processus initial ;
- scénarios de capacité libérée selon le volume.

Préciser que ces chiffres seront validés pendant le pilote.

### Diapositive 8 — Sécurité et maîtrise

- rôles et droits ;
- historique ;
- accès externe contrôlé ;
- sauvegarde et supervision à valider avant généralisation.

### Diapositive 9 — Pilote proposé

- une à deux agences ;
- cinq à dix utilisateurs ;
- quatre à six semaines ;
- indicateurs avant/après ;
- bilan et décision.

### Diapositive 10 — Décision attendue

**Valider le pilote, son sponsor, son périmètre et les ressources nécessaires.**

---

## 18. Proposition de discours court

> Aujourd’hui, le traitement d’un contrôle Buy Back ne s’arrête pas à la constatation des dommages. Il faut identifier le véhicule, documenter les réparations, appliquer les règles, prendre une décision, commander certaines pièces, organiser les interventions, suivre le prestataire et enfin clôturer le dossier. Lorsque ces informations sont réparties entre plusieurs supports, nous perdons du temps et de la visibilité.
>
> Readyline regroupe ce parcours dans un dossier unique, utilisable sur ordinateur comme sur mobile. L’application guide le collaborateur, rattache les photos aux réparations, prépare la synthèse, affiche les actions restantes et conserve l’historique des décisions et des délais. Le management bénéficie en parallèle d’un tableau de bord consolidé.
>
> Notre hypothèse prudente est un gain de 10 à 15 minutes par dossier, auquel s’ajoutent une meilleure qualité, moins de relances et une traçabilité renforcée. Nous ne demandons pas de généraliser immédiatement sur la base d’une estimation. Nous proposons un pilote de quatre à six semaines pour mesurer les résultats réels et présenter ensuite une décision de déploiement objectivée.

---

## 19. Conclusion

Readyline répond à un besoin opérationnel concret : disposer d’un processus de contrôle Buy Back plus rapide, plus homogène, plus visible et mieux piloté.

Le principal intérêt du projet réside dans la combinaison de plusieurs gains :

- productivité des équipes ;
- amélioration de la qualité des dossiers ;
- diminution des erreurs et oublis ;
- réduction des délais et relances ;
- meilleure coordination avec les managers et prestataires ;
- suivi financier plus structuré ;
- traçabilité complète ;
- capacité de pilotage à l’échelle de plusieurs agences.

La recommandation est de **valider un pilote mesuré**, avec des objectifs chiffrés et une gouvernance claire. Cette approche limite le risque, permet d’objectiver le retour sur investissement et prépare une éventuelle généralisation dans de bonnes conditions.
