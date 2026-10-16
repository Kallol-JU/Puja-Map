# Puja-Map

A custom, festival-first navigation and discovery platform for **Durga Puja pandals**. Puja-Map is built to solve a simple problem: temporary community pandals are often missing from generic mapping apps, making them difficult for festival-goers to discover and navigate to.

**Live Demo:** [puja-map.vercel.app](https://puja-map.vercel.app/)

## Why Puja-Map?

Durga Puja transforms neighbourhoods across Kolkata and beyond, but many temporary pandals are not consistently represented on conventional maps. Puja-Map provides a dedicated map experience where pandals are the focus—not just another category among permanent places and businesses.

The map is powered by **Mapbox**, with custom pandal data and navigation features built around the festival.

## Features

- **Festival-focused map:** Explore pandal locations on a custom Mapbox GL JS map.
- **Pandal search:** Find pandals by name, neighbourhood, or alternate name.
- **Custom map markers:** Identify pandals through purpose-built map markers and interactive selection.
- **Live location:** Use device geolocation to show your current position on the map.
- **Route planning:** Choose a starting point and destination, view a route, and navigate using walking directions.
- **Live navigation assistance:** Follow upcoming turn instructions, compass-aware map orientation, off-route detection, and automatic rerouting.
- **Proximity alerts:** Get notified when you are near a listed pandal.
- **Pandal submissions and review:** Submit a pandal location for inclusion and support a verification workflow.
- **Installable experience:** The frontend includes Progressive Web App support.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS |
| State management | Zustand |
| Maps and directions | Mapbox GL JS, React Map GL, Mapbox Directions API |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Geospatial utilities | MongoDB geospatial queries, Turf.js |
| Deployment | Vercel (frontend), Render (backend) |

## Project Structure

```text
Puja-Map/
├── backend/
│   ├── config/          # Database connection
│   ├── models/          # MongoDB models
│   ├── routes/          # Pandal API routes
│   ├── scripts/         # Data import scripts
│   ├── server.js        # Express server entry point
│   └── package.json
└── frontend/
    ├── public/          # Static assets and PWA files
    ├── src/
    │   ├── components/  # Map, search, navigation and UI components
    │   ├── hooks/       # Geolocation, proximity and navigation hooks
    │   ├── pages/       # Application pages
    │   ├── services/    # Map-related services
    │   └── store/       # Zustand state store
    ├── package.json
    └── vite.config.js
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- A [Mapbox access token](https://account.mapbox.com/)
- A MongoDB database (local MongoDB or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone the repository

```bash
git clone https://github.com/Kallol-JU/Puja-Map.git
cd Puja-Map
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `backend/.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

`MONGO_URI` is required. `PORT` and `CLIENT_URL` configure the local server and allowed frontend origin. `GOOGLE_MAPS_API_KEY` is optional and is used by the pandal-submission flow for place lookup and address enrichment.

Start the backend:

```bash
npm run dev
```

The API will run at `http://localhost:5000` by default.

### 3. Configure the frontend

Open a second terminal and navigate to the frontend directory:

```bash
cd Puja-Map/frontend
npm install
```

Create a `frontend/.env` file:

```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token
VITE_API_URL=http://localhost:5000/api
```

The Mapbox token is required for the map and directions features. `VITE_API_URL` points the frontend to your local backend; without it, the app uses the configured deployed API URL.

Start the frontend development server:

```bash
npm run dev
```

Vite will print the local development URL in the terminal (typically `http://localhost:5173`).

## Environment Variables

| Variable | Location | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_MAPBOX_TOKEN` | `frontend/.env` | Yes | Loads the Mapbox map and directions |
| `VITE_API_URL` | `frontend/.env` | For local development | Sets the backend API base URL |
| `MONGO_URI` | `backend/.env` | Yes | Connects the backend to MongoDB |
| `PORT` | `backend/.env` | No | Sets the backend port (defaults to `5000`) |
| `CLIENT_URL` | `backend/.env` | No | Adds the frontend origin to the CORS allowlist |
| `GOOGLE_MAPS_API_KEY` | `backend/.env` | No | Supports place lookup and address enrichment when a pandal is submitted |

> **Keep credentials private.** Do not commit `.env` files or expose private API keys. Only use public, browser-restricted tokens in frontend code, with suitable restrictions configured in the provider dashboard.

## Contributing

Contributions, corrections to pandal information, and suggestions are welcome. For substantial changes, open an issue first to discuss what you would like to improve.

## Author

**Kallol Mukherjee**

- GitHub: [@Kallol-JU](https://github.com/Kallol-JU)

---

Built to make discovering and exploring Durga Puja pandals easier.
