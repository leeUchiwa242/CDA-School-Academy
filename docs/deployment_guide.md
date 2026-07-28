# Guide de Déploiement - Projet CDA

Ce guide explique comment compiler, configurer et déployer l'application de gestion scolaire en production.

## 1. Variables d'Environnement Requises

Les variables d'environnement suivantes doivent être configurées sur les serveurs d'hébergement :

### Backend (API Flask)
- `FLASK_APP`: `run.py`
- `FLASK_DEBUG`: `false` (à désactiver impérativement en production)
- `PORT`: Le port d'écoute (par défaut `5000` ou attribué dynamiquement par l'hébergeur)
- `SECRET_KEY`: Une clé secrète complexe pour Flask.
- `JWT_SECRET_KEY`: Une clé secrète pour signer les jetons JWT.
- `DATABASE_URL`: URI de connexion à la base de données PostgreSQL de production (ex : `postgresql://user:pass@host:5432/dbname`).
- `MONGO_URI`: URI de connexion à la base de données MongoDB Atlas de production (ex : `mongodb+srv://...`). Si omise, l'application utilisera le stockage NoSQL fichier local de secours.
- `UPLOAD_FOLDER`: Répertoire persistant de stockage des photos d'étudiants (ex : `/var/data/uploads`).
- `GEMINI_API_KEY`: Clé d'API Google Gemini (optionnel, active le moteur d'IA réel pour les recommandations d'orientation).

### Frontend (React Single Page Application)
- Le point d'entrée de l'API REST est configuré par défaut sur `http://127.0.0.1:5000/api`. Pour la production, vous devez compiler le frontend avec l'URL correcte du backend de production.

---

## 2. Déploiement du Backend (Serveur Render / Railway)

1. Connectez votre dépôt Git à **Render** ou **Railway**.
2. Créez un nouveau **Web Service**.
3. Choisissez le runtime **Python**.
4. Configurez la commande de démarrage (Start Command) :
   ```bash
   gunicorn --bind 0.0.0.0:$PORT run:app
   ```
   *(Note: Ajoutez `gunicorn` dans le fichier `requirements.txt` si nécessaire pour la production)*.
5. Ajoutez les variables d'environnement listées ci-dessus.

---

## 3. Déploiement du Frontend (Vercel / Netlify)

1. Connectez votre dépôt Git à **Vercel** ou **Netlify**.
2. Créez un nouveau projet et ciblez le sous-dossier `frontend/` (Root Directory).
3. Configurez les commandes de build et de sortie :
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. Déployez. Les fichiers statiques optimisés seront servis automatiquement via CDN mondial.
