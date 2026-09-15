# Workouts

App Expo (iOS / Android / Web) de programmation force & musculation — espace coaché avec tunnel de séance.

## Démarrer en local

```bash
npm install
npm run web          # navigateur
npm start            # Expo (QR / simulateur)
```

## Déployer sur Netlify (test téléphone)

Build web statique :

```bash
npm run web:export
```

Le dossier `dist/` est prêt à être publié.

### Option A — Drag & drop

1. `npm run web:export`
2. Sur [app.netlify.com/drop](https://app.netlify.com/drop), déposer le dossier `dist`

### Option B — CLI / Git

Le fichier `netlify.toml` définit déjà :

- build : `npx expo export -p web`
- publish : `dist`
- redirect SPA vers `index.html`

Une fois l’URL Netlify ouverte sur le téléphone, l’app tourne dans le navigateur. Les validations sont stockées en **AsyncStorage** (local au navigateur).

## Structure

- `data/programming.ts` — ta prog (bloc 4 semaines, 4 séances)
- `app/(athlete)/` — espace coaché
- `app/(athlete)/session/[id]/run.tsx` — tunnel exo par exo
- `store/workoutStore.ts` — Zustand + AsyncStorage
- `app/(coach)/` — placeholder coach

## Élastiques

| Couleur | kg |
|---------|----|
| Bleu    | 5  |
| Vert    | 15 |
| Jaune   | 25 |
