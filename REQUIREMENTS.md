# Project Requirements

This project uses Node.js and npm. All required libraries are declared in the `package.json` files inside the frontend and backend directories.

## System Requirements

- Node.js 18 or later
- npm 9 or later
- PostgreSQL 14 or later
- Git

## External Services

The application requires API credentials for:

- WeatherAPI
- YouTube Data API v3

## Backend Dependencies

Install the backend dependencies with:

```bash
cd backend
npm install
```

Main backend libraries include:

- Express
- TypeScript
- Prisma ORM
- PostgreSQL database client
- CORS
- dotenv
- Axios or the configured HTTP client

Prisma setup:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the backend:

```bash
npm run dev
```

## Frontend Dependencies

Install the frontend dependencies with:

```bash
cd frontend
npm install
```

Main frontend libraries include:

- React
- React DOM
- TypeScript
- Vite

Start the frontend:

```bash
npm run dev
```

## Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=
WEATHER_API_KEY=
YOUTUBE_API_KEY=
PORT=5000
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Install All Dependencies

From the project root, run:

```bash
cd backend
npm install
npx prisma generate

cd ../frontend
npm install
```

Exact package versions are recorded in:

```text
backend/package-lock.json
frontend/package-lock.json
```

For reproducible installation, use:

```bash
npm ci
```