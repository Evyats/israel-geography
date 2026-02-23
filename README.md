# Israel Cities Geography Trainer

Simple Hebrew web game for learning city locations in Israel (React + TypeScript).

## Prerequisites
- Node.js 20+

## Run the app
From the project folder:

```powershell
npm install
npm run dev
```

Then open:

`http://127.0.0.1:5173` (or the port shown by Vite)

Stop with `Ctrl+C`.

## Open on phone (same Wi-Fi)
Run:

```powershell
npm run dev:lan
```

Then open on your phone:

`http://<your-computer-local-ip>:5173`

Example:
`http://192.168.1.42:5173`

If it still fails, allow Node.js/Vite through Windows Firewall for private networks.

## Installation
Optional (data regeneration):

```powershell
node scripts/fetch_real_boundaries.js
```

## Developer Level Configuration
Use this file to edit level pools with readable city data:

- `public/data/levels_catalog.json` (runtime file)
- `data/levels_catalog.json` (source copy)

Each level contains objects with:
- `id`
- `name_he`
- `population`

To move a city between levels:
1. Find the city by `name_he`.
2. Move the full object to another level array (`easy` / `medium` / `hard`).
3. Keep `id` unchanged.

## Screenshots
|  |  |
|---|---|
| ![Screenshot 1](screenshots/1.png) | ![Screenshot 2](screenshots/2.png) |
| ![Screenshot 3](screenshots/3.png) | ![Screenshot 4](screenshots/4.png) |
| ![Screenshot 5](screenshots/5.png) | ![Screenshot 6](screenshots/6.png) |
