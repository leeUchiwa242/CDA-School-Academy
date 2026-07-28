# CDA - Académie scolaire

Ce projet est un système complet de gestion scolaire conçu pour remplacer un ancien système Excel/VBA. Il implémente une architecture logicielle multicouche sécurisée, une double persistance (Relationnelle pour les notes, NoSQL pour les bulletins), des calculs dynamiques d'indicateurs (moyenne, rang, classements) et des recommandations d'orientation scolaire automatisées par Intelligence Artificielle.

---

## 1. Architecture Technique Imposée

L'application respecte une séparation stricte des responsabilités en couches autonomes :
- **Couche Présentation (Frontend)** : Interface utilisateur en Single Page Application (SPA) bâtie sous **React + Vite** et stylisée pour un rendu moderne blanc et bleu avec des transitions fluides.
- **Couche Présentation (Backend API)** : Points d'entrée REST sécurisés sous **Python / Flask** (CORS activés, protection JWT).
- **Couche Métier (Services)** : Logique métier pure (calculs de moyennes de classe, algorithme de classement en compétition avec gestion des égalités, intégration IA).
- **Couche Accès aux Données (Repositories)** :
  - **SQL Repository** : Communication avec la base de données relationnelle via l'ORM SQLAlchemy (PostgreSQL en production, SQLite pour le développement).
  - **NoSQL Repository** : Persistance des bulletins au format document via PyMongo (MongoDB en production, fichier JSON local autonome en secours).

---

## 2. Installation & Lancement Rapide

### Prérequis
- Python 3.10+
- Node.js 18+

### Lancement du Backend Flask
1. Ouvrez un terminal dans le répertoire `backend/` :
   ```bash
   cd backend
   ```
2. Installez les dépendances :
   ```bash
   python -m pip install -r requirements.txt
   ```
3. Lancez le serveur de développement :
   ```bash
   python run.py
   ```
   L'API démarrera sur `http://127.0.0.1:5000` et initialisera automatiquement la base de données SQLite locale (`app/school.db`) avec des jeux d'essai.

#### Comptes de test générés :
- **Administrateur** : `admin@school.com` / `AdminPassword123!`
- **Utilisateur simple** : `user@school.com` / `UserPassword123!`

### Lancement du Frontend React
1. Ouvrez un second terminal dans le répertoire `frontend/` :
   ```bash
   cd frontend
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement Vite :
   ```bash
   npm run dev
   ```
   L'application sera accessible dans votre navigateur (généralement `http://localhost:5173`).

---

## 3. Exécution des Tests

Le projet intègre une suite de tests unitaires et de sécurité.
1. Ouvrez un terminal dans le répertoire `backend/` :
   ```bash
   cd backend
   ```
2. Lancez les tests via pytest :
   ```bash
   python -m pytest tests
   ```
