# Sunshine 263: a CivicEvents portal for Harare

Sunshine 263 is my individual summative for **Advanced Frontend Web Development** at ALU, built on the brief *CivicEvents: Accessible City Events & Services Portal*.

Harare is known as the Sunshine City, and 263 is Zimbabwe's dialling code. On Sunshine 263, Harare residents can find and register for events, listen to city announcements, watch short promos with captions, and report problems in their street, like a pothole or a broken streetlight. City staff (admins) publish all of that content, manage users and move service requests from submitted to resolved. Accessibility is the main feature: text size, contrast and motion settings on every page, an audio player built for keyboards and screen readers, and captions switched on by default.

A student project. Not affiliated with the City of Harare.

## Demo video

[MISSING: video link]

## What's in this repo

| Folder | What it is |
| --- | --- |
| `backend/` | The provided Node.js + Express + PostgreSQL API, with three small additions (see [Changes to the provided backend](#changes-to-the-provided-backend)). API docs are in [backend/README.md](backend/README.md) |
| `frontend/` | My app: plain HTML, Tailwind CSS v4 and jQuery. Full setup and frontend details are in [frontend/README.md](frontend/README.md) |
| `video-demo/` | The demo video |

## Quick start

You need Node.js 18+, PostgreSQL 15+ and Postman.

1. **Database.** Create a database called `civic-events-db`, then run the migrations from the repo root:
   ```powershell
   psql -U postgres -h localhost -d civic-events-db -f backend/migrations/001_create_tables.sql
   psql -U postgres -h localhost -d civic-events-db -f backend/migrations/003_service_requests.sql
   psql -U postgres -h localhost -d civic-events-db -f backend/migrations/004_announcement_transcripts.sql
   ```
2. **Backend.** Put your database details in `backend/.env`, then:
   ```powershell
   cd backend
   npm install
   npm run dev
   ```
   The API runs at `http://localhost:4000`.
3. **Frontend.** Serve the `frontend/` folder with any static server, for example VS Code's Live Server extension, and open `index.html`. The compiled CSS is committed, so there's no build step unless you change the styles.

The full steps, including the Tailwind scripts, are in [frontend/README.md](frontend/README.md#getting-it-running).

## Accounts for testing

- **Resident:** sign up on `signup.html`. Every account made through the site is a resident.
- **Admin:** the site never sends a role, so admins are made directly through the API. In Postman (the collection is in `backend/CivicEvents+ API.postman_collection.json`), send:
  ```
  POST http://localhost:4000/api/auth/signup
  Content-Type: application/json

  {
    "full_name": "Your Name",
    "email": "admin@example.com",
    "password": "<choose a strong password>",
    "role": "admin"
  }
  ```
  Passwords need at least 8 characters, an uppercase letter, a lowercase letter, a number and a symbol. Then log in on `login.html` with that email and password, and you land on the admin dashboard.

No real passwords are stored in this repo.

## Changes to the provided backend

The backend came with the assignment, and I left it alone apart from three small additions. Both follow its existing style: model, controller and routes, express-validator, and the `authenticate` / `authorize` middleware.

### 1. Service requests

**Why:** the rubric expects residents to be able to send service requests, but the provided backend had no support for them at all.

**What I added:**
- `backend/migrations/003_service_requests.sql`: a `service_requests` table with the resident, service type, title, location, an optional description, a status (`submitted`, `in_progress` or `resolved`) and timestamps. It's numbered 003 because `backend/package.json` already mentions a `002_seed_data.sql`, even though that file was never included.
- `src/models/serviceRequests.model.js`, `src/controllers/serviceRequests.controller.js` and `src/routes/serviceRequests.routes.js`, registered in `src/routes/index.routes.js`.

| Method and path | Who | What it does |
| --- | --- | --- |
| `GET /api/service-requests/types` | Any logged-in user | The request types, from the existing `src/utils/serviceTypes.js` |
| `POST /api/service-requests` | Any logged-in user | Sends a request: `service_type`, `title`, `location`, optional `description` |
| `GET /api/service-requests/my` | Any logged-in user | Your own requests, newest first |
| `GET /api/service-requests?status=` | Admin | Every request with the resident's name and email, newest first, with an optional status filter |
| `PATCH /api/service-requests/:id/status` | Admin | Changes the status and sends that resident a notification |

### 2. Video and social links on events

**Why:** organisers often have a video or a post about their event, and the provided backend had nowhere to store links.

**What I changed:** event create and update (`src/controllers/events.controller.js`) now also accept an optional `links` field, one URL per line, sent with the normal multipart form. The links are saved in the event's existing `metadata` as `metadata.links`. A small helper (`src/utils/eventLinks.js`) only keeps YouTube, Instagram and TikTok links, with 5 at most. Image uploads (`metadata.image_url`) work exactly as before. On the event page, YouTube links become an embedded video, and Instagram and TikTok links become link cards.

### 3. Announcement transcripts

**Why:** every announcement is audio, so people who are deaf, hard of hearing or would simply rather read need a transcript. The provided backend had nowhere to store one, so the Read transcript panel could only say that no transcript had been added.

**What I changed:**
- `backend/migrations/004_announcement_transcripts.sql` adds an optional `transcript` text column to `announcements`.
- `src/models/announcements.model.js` saves `transcript` on create (null when it's left empty) and on update (the old one is kept when the field isn't sent).
- `src/controllers/announcements.controller.js` reads `transcript` from the form on create. Update already passed the request body to the model, so it needed no change.

The admin announcement form has a Transcript box, the detail page shows the transcript under the player, and the list only labels announcements that have one.

Nothing else in `backend/` was changed.
