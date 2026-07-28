# Rapport de Veille Sécurité - Projet CDA

Ce document présente une analyse détaillée des risques de sécurité identifiés pour l'application de gestion scolaire et détaille les protections mises en œuvre au sein de l'architecture logicielle.

## 1. Risques de Cybersécurité & Mesures de Protection

| Menace / Vulnérabilité | Risque Associé | Mesures de Protection Appliquées | Localisation dans le Code |
| :--- | :--- | :--- | :--- |
| **Injections SQL** | Fuite globale de la base de données relationnelle, contournement d'authentification. | Utilisation systématique de l'ORM **SQLAlchemy** qui convertit automatiquement les requêtes en requêtes paramétrées (Prepared Statements). Aucune concaténation de chaînes SQL brute. | [models.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/models.py), [sql_repo.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/repositories/sql_repo.py) |
| **Failles XSS (Cross-Site Scripting)** | Vol de session JWT, exécution de scripts arbitraires dans le navigateur des utilisateurs. | 1. Échappement HTML automatique réalisé par **React** au rendu.<br>2. Nettoyage et échappement strict de toutes les entrées utilisateurs côté serveur via `html.escape()`. | [security.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/utils/security.py) |
| **Attaques par Force Brute** | Découverte de mots de passe administratifs par énumération automatique. | 1. Limitation des tentatives à 5 échecs consécutifs maximum.<br>2. Verrouillage temporaire du compte ciblé pendant 15 minutes.<br>3. Journalisation obligatoire de chaque tentative (adresse IP, email, statut). | [auth_service.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/services/auth_service.py) |
| **Attaques CSRF (Cross-Site Request Forgery)** | Exécution d'actions malveillantes (ex : modification de note) à l'insu de l'utilisateur connecté. | Utilisation de jetons **JWT autonomes transmis dans les en-têtes HTTP (`Authorization: Bearer <token>`)** au lieu des cookies de session classiques. Comme les navigateurs n'attachent pas automatiquement les en-têtes HTTP personnalisés lors de requêtes intersites, le risque CSRF est intrinsèquement éliminé. | [decorators.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/utils/decorators.py) |
| **Directory/Path Traversal** | Téléchargement ou modification de fichiers arbitraires du serveur. | Utilisation de la fonction `send_from_directory` de Flask pour servir les images importées. Cette fonction effectue un nettoyage strict (chroot virtuel) et rejette toute tentative de sortie du répertoire désigné (ex : payloads `../`). | [students.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/routes/students.py) |
| **Déni de Service (DoS) par Upload** | Saturation du disque ou plantage mémoire par import de fichiers géants. | 1. Limitation stricte de la taille maximale des payloads d'upload à 2 Mo (`MAX_CONTENT_LENGTH`).<br>2. Validation stricte des extensions de fichiers autorisées (`png`, `jpg`, `jpeg`, `gif`). | [config.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/config.py), [student_service.py](file:///C:/Users/chris/.gemini/antigravity/scratch/school-manager/backend/app/services/student_service.py) |

---

## 2. Rapport de Test de Sécurité (Sécurité Explicite)

Un test de sécurité automatique a été programmé sous `pytest` pour valider la robustesse :
- **Injection SQL (Recherche)** : Simulation d'une injection de type `' OR '1'='1` sur la route de recherche d'étudiants. Le système n'a pas divulgué d'informations et a retourné 0 résultat.
- **Rupture d'Accès (RBAC)** : Test de création d'un étudiant par un compte disposant du rôle simple `Utilisateur`. Le serveur a rejeté la requête avec un code d'état HTTP `403 Forbidden`.

> [!NOTE]
> Tous les tests unitaires et de sécurité s'exécutent avec succès : 7 tests passés en moins de 2 secondes.
