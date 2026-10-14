# ReserveSpace — Resource Reservation Management System

A full-stack web application designed to simplify resource reservations, manage shared facilities, and prevent overlapping bookings.

## Overview

ReserveSpace helps users view available resources, create reservations, and manage existing bookings through a centralized web application. The system uses PostgreSQL for persistent data storage and server-side validation to prevent conflicting reservations.

This project was developed as part of the Software Engineering Internship Technical Assessment for PrimeWave Lab (Pvt) Ltd.

## Features

- **Resource Listing:** View available resources and their details.
- **Create Reservations:** Submit reservations with resource, date, time, and user details.
- **Conflict Prevention:** Reject overlapping confirmed reservations for the same resource.
- **Reservation Management:** View reservations and cancel confirmed bookings.
- **Persistent Storage:** Store resources and reservations in PostgreSQL.
- **REST API:** Use API routes to retrieve resources and manage reservations.
- **Responsive Interface:** Access the application through a modern web interface.
- **Health Check:** Verify application and database connectivity through the health endpoint.

## Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Frontend:** React and CSS
- **Database:** PostgreSQL
- **Database Provider:** Neon
- **Database Client:** `@neondatabase/serverless`
- **Version Control:** Git and GitHub
- **Runtime:** Node.js

## Prerequisites

Install the following before running the application:

- Node.js (version 20.9 or later)
- npm
- A PostgreSQL database, such as Neon

## Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd resource-reservation-system
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
DATABASE_URL=YOUR_POSTGRESQL_CONNECTION_STRING
```

Replace the placeholder with your own PostgreSQL connection string. Never commit `.env.local` or expose database credentials.

### 4. Configure the database

Ensure your PostgreSQL database contains the required tables and resource records used by the application. Configure the schema and sample data using your database SQL setup.

Do not run destructive database commands against an existing database.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create a production build

```bash
npm run build
```

Start the production server with:

```bash
npm run start
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check application and database connectivity |
| GET | `/api/resources` | Retrieve active resources |
| GET | `/api/reservations` | Retrieve reservations |
| POST | `/api/reservations` | Create a reservation |
| DELETE | `/api/reservations/:id` | Cancel a reservation |

### Reservation Validation

The backend validates reservation details and checks for overlapping confirmed reservations for the same resource. Conflicting bookings are rejected to help maintain reliable scheduling.



**ER Diagram:** 
docs/erd.png

## Project Structure

```text
resource-reservation/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   ├── resources/
│   │   │   └── reservations/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       └── db.ts
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

