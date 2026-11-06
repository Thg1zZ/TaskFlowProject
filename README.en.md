# ⬡ TaskFlow

[![CI](https://github.com/Thg1zZ/TaskManegerProject/actions/workflows/ci.yml/badge.svg)](https://github.com/Thg1zZ/TaskManegerProject/actions/workflows/ci.yml)
![Java](https://img.shields.io/badge/Java-17-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Português](README.md) | **English**

Full-stack task manager with a Kanban board, real-time collaboration and a strong focus on security: JWT authentication in an httpOnly cookie, Google sign-in, rate limiting behind proxies, session invalidation and integration tests against a real PostgreSQL database.

🔗 **Live demo:** [task-manager-with-login.vercel.app](https://task-manager-with-login.vercel.app) (the UI is in Portuguese)
> The backend runs on Render's free tier and sleeps when idle: the first request may take up to a minute.

![Dashboard](docs/screenshots/dashboard-light.png)

## Features

- **Kanban board** with drag and drop across *To do*, *In progress* and *Done*
- **Calendar** and **statistics** with productivity charts
- Custom **categories** with color and icon
- **Real-time collaboration** (SSE): invite links with viewer, editor and admin roles
- **Notifications**, built-in **Pomodoro** timer and first-access **onboarding tour**
- **Profile** with avatar cropping, password change and account deletion
- **Admin panel** with an audit log of every action
- **Light and dark themes** with customizable colors
- **Google sign-in** and password recovery by email

| Dark theme | Kanban | Statistics |
|---|---|---|
| ![Dark theme](docs/screenshots/dashboard-dark.png) | ![Kanban](docs/screenshots/kanban.png) | ![Statistics](docs/screenshots/statistics.png) |

## Architecture

```mermaid
flowchart LR
    U[Browser] --> V["Vercel<br/>Next.js 16 (App Router)"]
    V -- "/api/* (rewrite)" --> R["Render<br/>Spring Boot 3.5 (Docker)"]
    R --> N[("Neon<br/>PostgreSQL")]
    R --> G[Google OAuth]
    R --> S[SMTP]
    R -. real-time SSE .-> V
```

The frontend calls the API on its own domain (`/api/*`), which Vercel rewrites to the backend. This keeps the session cookie *first-party*, `httpOnly` and `SameSite=Strict`, so the token is never exposed to JavaScript.

## Security

| Area | Implementation |
|---|---|
| Session | JWT (HS256) in an `httpOnly`, `Secure`, `SameSite=Strict` cookie; revocation by `jti` on logout |
| Passwords | BCrypt (cost 12) and a complexity policy |
| Invalidation | Changing or resetting the password revokes **every** open session |
| Account takeover | The first Google sign-in on an unverified account discards the previous password and sessions |
| Authorization | Per-resource rules (`@PreAuthorize`) for owner, editor and viewer; 404 without revealing whether a resource exists |
| Rate limiting | By real client IP behind Cloudflare and Vercel, on login, sign-up, password recovery and admin routes |
| Password recovery | 256-bit token stored only as a SHA-256 hash, 30-minute validity, single use and one request per email every 15 minutes |
| Admin | `USER < ADMIN < SUPER_ADMIN` hierarchy and an immutable audit log |
| Data | Versioned migrations (Flyway), `ddl-auto=validate`, DTOs without sensitive data and IPs stored only as hashes |

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, SWR, Recharts, @hello-pangea/dnd |
| Backend | Java 17, Spring Boot 3.5, Spring Security 6.5, Spring Data JPA (Hibernate 6.6), Flyway 11, JJWT |
| Database | PostgreSQL (Neon) |
| Tests | JUnit 5, Mockito, Testcontainers, MockMvc |
| Infrastructure | Docker, Render, Vercel, GitHub Actions |

## Running locally

**Requirements:** Java 17, Maven, Node.js 20 and Docker.

**1. Database**
```bash
docker run -d --name taskflow-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=taskmanager -p 5432:5432 postgres:15-alpine
```

**2. Backend** (port 8080; migrations run automatically)
```bash
cd backend
export DB_URL=jdbc:postgresql://localhost:5432/taskmanager DB_USER=postgres DB_PASSWORD=postgres
export JWT_SECRET=$(openssl rand -base64 48) COOKIE_SECURE=false
export FRONTEND_URL=http://localhost:3000 CORS_ORIGINS=http://localhost:3000
mvn spring-boot:run
```

**3. Frontend** (port 3000)
```bash
cd frontend
npm ci
API_URL=http://localhost:8080/api npm run dev
```

Open `http://localhost:3000` and create an account. Every variable is documented in [`.env.example`](.env.example). Google sign-in and email delivery are optional for local development.

## Tests

```bash
cd backend
mvn verify
```

- **Unit:** client IP resolution behind proxies and secure Google account linking
- **Integration:** boot the whole application against a containerized PostgreSQL (Testcontainers) and cover 401/403, IDOR, session invalidation, password recovery and data exposure. They are skipped automatically when Docker is not available.

[CI](.github/workflows/ci.yml) runs the backend tests plus the frontend lint and build on every push.

## Project structure

```
backend/   Spring Boot API (controller → service → repository) and Flyway migrations
frontend/  Next.js App Router: pages, components, hooks and API clients
```

## License

Released under the [MIT](LICENSE) license.

---

Built by **Thiago Gomes** · [LinkedIn](https://www.linkedin.com/in/thiago-gomes-fc)
