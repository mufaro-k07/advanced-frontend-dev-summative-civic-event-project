# Sunshine 263: frontend

This is the frontend of Sunshine 263, a CivicEvents portal for Harare. What the project is, the demo video, test accounts and the changes I made to the provided backend are all in the [main README](../README.md).

- **Stack:** HTML, Tailwind CSS v4 and jQuery. No frameworks, no bundler, no ES modules.
- **Talks to:** the API in `../backend`, at `http://localhost:4000/api` by default.

---

## Contents

1. [Getting it running](#getting-it-running)
2. [Scripts](#scripts)
3. [Pages](#pages)
4. [Folder structure](#folder-structure)
5. [Role guards](#role-guards)
6. [Token storage](#token-storage)
7. [Accessibility](#accessibility)
8. [Design decisions](#design-decisions)
9. [Backend gaps and how the frontend works around them](#backend-gaps-and-how-the-frontend-works-around-them)
10. [Known limitations](#known-limitations)
11. [Photo credits](#photo-credits)

---

## Getting it running

You need **Node.js 18+** and **PostgreSQL 15+**. To create an admin account you also need **Postman** (see [Accounts for testing](../README.md#accounts-for-testing)).

### 1. Database

Create the database once (in psql or pgAdmin):

```sql
CREATE DATABASE "civic-events-db";
```

Then run the migrations from the repo root. The first is the provided schema, the second adds the service requests table, and the third adds announcement transcripts:

```powershell
psql -U postgres -h localhost -d civic-events-db -f backend/migrations/001_create_tables.sql
psql -U postgres -h localhost -d civic-events-db -f backend/migrations/003_service_requests.sql
psql -U postgres -h localhost -d civic-events-db -f backend/migrations/004_announcement_transcripts.sql
```

### 2. Backend

Fill in `backend/.env` with your own database details. The backend reads `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `JWT_SECRET` and `PORT`. Then:

```powershell
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:4000`. If it runs somewhere else, change `API_BASE_URL` and `FILES_BASE_URL` in `js/config.js`.

### 3. Frontend

The compiled CSS (`dist/output.css`) is committed, so **the site runs without npm**. Serve the `frontend` folder with any static server, for example the **Live Server** extension in VS Code (right-click `index.html` → *Open with Live Server*).

---

## Scripts

You only need these if you change the styles:

```powershell
npm install
npm run watch   # rebuilds dist/output.css while you work
npm run build   # one minified build, run this before committing
```

Tailwind v4 is set up "CSS-first": the colours, fonts and corner sizes live in `src/input.css` under `@theme`, and there is no `tailwind.config.js`. Tailwind only adds the classes it finds in the HTML and JS files, so rebuild after adding new ones.

---

## Pages

| Who | Page | File |
| --- | --- | --- |
| Everyone | Landing page | `index.html` (logged-in users go straight to their dashboard) |
| Everyone | Log in, Sign up | `login.html`, `signup.html` |
| Resident | Home | `pages/dashboard.html` |
| Resident | City services (report a problem, follow it to resolved) | `pages/services.html` |
| Resident | Events list and event detail | `pages/events.html`, `pages/event.html` |
| Resident | My registrations | `pages/my-registrations.html` |
| Resident | Announcements list and detail (custom audio player) | `pages/announcements.html`, `pages/announcement.html` |
| Resident | Promos list and detail (captioned video) | `pages/promos.html`, `pages/promo.html` |
| Resident | Notifications inbox and detail | `pages/notifications.html`, `pages/notification.html` |
| Resident | Profile | `pages/profile.html` |
| Resident | 403 Forbidden | `pages/forbidden.html` |
| Admin | Admin dashboard (stats, sign-ups chart, latest service requests) | `admin/dashboard.html` |
| Admin | Service requests (status filter and status dropdown) | `admin/service-requests.html` |
| Admin | Add or edit an event, announcement or promo | `admin/event-form.html`, `admin/announcement-form.html`, `admin/promo-form.html` |
| Admin | Users list and user detail (enable or disable) | `admin/users.html`, `admin/user.html` |
| Admin | Manage notifications | `admin/notifications.html` |

Admins also get Edit, Delete and Publish controls on the normal list and detail pages, inside dashed "Admin only" panels.

---

## Folder structure

```
frontend/
├── index.html, login.html, signup.html
├── pages/            resident pages and the 403 page
├── admin/            admin-only pages
├── src/input.css     Tailwind theme and a few component classes (.btn, .field-input …)
├── dist/output.css   compiled CSS, committed
├── assets/images/    photos, assets/icons/ logo
└── js/
    ├── config.js     API address
    ├── auth.js       token and user storage, expiry check, logout
    ├── guards.js     requireAuth(), requireAdmin(), redirectIfLoggedIn()
    ├── api.js        $.ajax wrapper: Bearer token, 401/403 and network errors
    ├── ui.js         toasts, confirm modal, skeletons, empty and error states, focus trap
    ├── layout.js     header, notification bell and drawer, profile menu, footer, admin sidebar
    ├── a11y.js       the accessibility settings panel
    ├── player.js     the custom audio player
    ├── cards.js      shared event, announcement and promo cards
    ├── validate.js   password rules and file checks
    ├── event-links.js, service-requests.js, media-admin.js   small shared helpers
    └── pages/*.js    one script per page
```

Every page loads plain `<script>` tags in order, and each shared file exposes one object (`Auth`, `Api`, `UI`, `Layout` …). Pages leave empty slots (`#site-header`, `#site-footer`, `#admin-sidebar`) and call `Layout.init()`, so the header isn't copied into every page.

Every list has four states: loading (skeleton), empty (with a next step), error (with a Retry button) and loaded. Forms are checked in the browser before anything is sent, uploads are checked for type and size first, and anything a user typed is escaped before it goes into the page.

---

## Role guards

There are two roles: `user` (resident) and `admin`. Every role check has a `// ROLE GUARD:` comment, so **search the `js/` folder for "ROLE GUARD"** to see them all (46 comments across 28 files).

- `Guards.requireAuth()` runs first on every logged-in page. No token, or an expired one, sends you to the login page with a message.
- `Guards.requireAdmin()` runs first on every page in `admin/`. A resident who types an admin URL gets the 403 page.
- `Guards.redirectIfLoggedIn()` on login and signup, and the check in `js/pages/index.js`, send logged-in people to their own dashboard.
- Admin-only controls (the Admin button in the header, Edit, Delete, Publish, the service request status dropdown) are only drawn for admins.
- `api.js` logs you out on a 401 and shows the forbidden page on a 403, in case the backend refuses something.

Hiding things in the frontend is only for tidiness. The backend checks the token and the role on every request anyway.

---

## Token storage

Login returns a JWT that holds `{ id, role, exp }` and lasts one hour. `js/auth.js` takes care of it:

- **"Keep me logged in" ticked:** the token and user are saved in `localStorage`, so you stay logged in after closing the browser.
- **Not ticked:** they go in `sessionStorage`, which is cleared when the tab closes.
- Before every page loads, the guards read `exp` from the token. If it has run out, you're logged out and the login page says why.
- Every API call sends the token as `Authorization: Bearer <token>`.
- Straight after login the profile is fetched. If an admin has disabled the account, you're signed out with a message, because the backend still lets disabled users log in.
- Logging out clears both storages and goes back to the login page.

---

## Accessibility

Accessibility is in the assignment title, so it's the main feature, not a checklist at the end.

**Accessibility settings.** An accessibility button sits in the header of every page, including the landing, login and signup pages. It opens a panel with three settings that really change the page:

| Setting | What it does |
| --- | --- |
| Text size (Default, Large, Larger) | Sets the root font size to 100%, 112.5% or 125%. Every size is in `rem`, so the whole layout grows, not just the words |
| Enhanced contrast | Swaps the colour variables: grey text turns dark, borders get darker, text links are always underlined and focus rings get thicker |
| Reduced motion | Turns off transitions and the drawer slide. "Follow my device" respects `prefers-reduced-motion` |

The settings are saved in `localStorage`. A tiny script in each page's `<head>` applies them before the page draws, so the old look never flashes. The panel opens and closes with the keyboard, Esc closes it, and focus goes back to the button.

**Audio-first announcements.** Announcements use a custom player built on a hidden `<audio>` element:
- a large play/pause button whose label changes
- a seek bar that works with the arrow keys and reads out "1 minute 4 seconds of 3 minutes"
- 10-second skip buttons, Share, and Read transcript, which opens the transcript the admin typed in, with its line breaks kept
- a fallback download link
- only one announcement plays at a time

**Everywhere else:**
- **Page structure:** a "Skip to content" link, proper landmarks, and one `h1` per page with headings in order.
- **Forms:** every input has a visible label. Errors use `aria-invalid`, `aria-describedby` and an icon, and focus moves to the first problem.
- **Announced messages:** toasts use `role="status"`, and errors use `role="alert"`.
- **Dialogs:** the drawer and the confirm modal trap focus, close on Esc and give focus back to what opened them. The phone menu keeps focus inside while it's open.
- **Video:** promos have captions on by default (built as WebVTT from the caption text) and a transcript underneath.
- **Not colour alone:** status badges and errors always have words or icons as well as colour, and the admin chart has a "Show these numbers as a table" option.
- **Focus and touch:** focus rings are never removed (yellow on dark panels, teal on light ones), and buttons and links are at least 44×44px.

---

## Design decisions

- **Harare personality, clean functionality.** The warmth goes into the landing page, the login and signup photo frames, the home page hero, empty states and the footer. Forms, tables and admin screens stay plain.
- **Home page hero: "Harare is calling."** A telephone hangs from the top edge of the teal hero next to a community noticeboard, because the city is calling its residents to see what's on. The artwork is one transparent WebP (with a PNG fallback) marked as decorative, so all the real information stays as text. It fades in once when the page opens and never moves after that, and with reduced motion on it simply appears.
- **Colours from the flame lily**, Zimbabwe's national flower: Lily Teal (`#0B4F4C`) as the main colour, Flame (`#C2362B`) for the one main action on a screen, and Sunshine yellow for solid blocks and badges with dark text. White is the background. Every text colour pairing was checked for at least 4.5:1 contrast.
- **Fonts:** Bricolage Grotesque for headings, Atkinson Hyperlegible Next for body text (it was made by the Braille Institute for low-vision readers), and Instrument Serif italic for a few accent words: "bloom." on the landing page, and "calling." and the little note in the home page hero.
- **Sharp corners:** inputs 4px, buttons 6px, cards and photos 8px. Full pills are only used for small status badges. These are Tailwind tokens (`rounded-input`, `rounded-control`, `rounded-card`), so changing them in one place changes the whole site.
- **A local touch:** in October and November a jacaranda banner on the home page wishes students luck, because in Harare, when the jacarandas fall, exams begin. You can close it, and it stays closed for the rest of that year.
- **The admin chart is plain HTML.** It shows new sign-ups per month using the data the backend already sends, with no chart library. The backend has no registrations-by-month data, so I chose sign-ups instead.
- **Simple over clever:** small named functions, plain loops, and comments that explain why something is done.

---

## Backend gaps and how the frontend works around them

These are gaps in the provided backend that the frontend handles on its own. The three features I did add to the backend (service requests, event links and announcement transcripts) are explained in the [main README](../README.md#changes-to-the-provided-backend).

| Gap in the provided backend | What the frontend does |
| --- | --- |
| No endpoint to write your own notification | The admin notifications page explains that notifications are sent automatically when content is added or published |
| Events can't be published or unpublished | The Published switch on the event form is shown locked, with an explanation |
| Feedback lists are admin-only | Residents only see their own feedback, and admins see everyone's on the event page |
| Lists include unpublished items | Drafts are filtered out for residents in the browser |
| No search, filter or paging for events | Search, a "When" filter, sorting and paging (6 per page) all happen in the browser |
| No audio duration | The duration is read from the audio file once it loads. (Transcripts were a gap too, until I added them to the backend.) |
| Captions arrive as plain text | They're turned into a WebVTT file in the browser so `<track default>` can show them |
| No "mark as read" for notifications | Read notification IDs are saved in `localStorage`, per user |
| You can't register again after cancelling | The button says "Registration cancelled" and is disabled |
| Disabled users can still log in | Straight after login the profile is checked, and disabled accounts are signed out with a message |
| Deleting an event with registrations returns a 500 | A friendly message explains why the event can't be deleted |

---

## Known limitations

- Logins last one hour (the backend's token lifetime). After that you're sent to the login page with a message.
- "Mark as read" only lives in the browser, so read notifications show as unread again on another device.
- Search and filters run in the browser on the full events list, which is fine at this size but wouldn't scale to thousands of events.

---

## Photo credits

### Photos in `assets/images/`

These are part of the site and stored in the repo. None are hotlinked.

| File | Where it's used | Photo by | Source and licence |
| --- | --- | --- | --- |
| `flame-lily.jpg` | Logo, login and signup background |
| `hero-harare.jpg` | Landing page hero |
| `market.jpg` | Landing page photo collage | 
| `mukuvisi.jpg` | Landing page photo collage | 
| `jacaranda.jpg` | Landing page jacaranda band | 
| `hero-noticeboard.webp` and `.png` | Home page hero (telephone and noticeboard) |
### Demo event photos

These were uploaded through the admin event form, so the backend stores them in `backend/uploads/` and they aren't part of the repo.

| Photo | Photo by | Source and licence |
| --- | --- | --- |
| Tree planting | Hammilton Ojijo | [Unsplash](https://unsplash.com/@ojijohammilton), Unsplash License |
| Market day / grilling | Xiomara Espinola Baca | [Pexels](https://www.pexels.com/@xiomara-espinola-baca-185551529/), Pexels License |
| Students studying | Polina Tankilevitch | [Pexels](https://www.pexels.com/photo/young-women-working-from-home-5234753/), Pexels License |
| Flea market | Daniel Olivier | [Pexels](https://www.pexels.com/photo/crowd-shopping-at-bazaar-18008719/), Pexels License |

### Fonts

Bricolage Grotesque, Atkinson Hyperlegible Next and Instrument Serif, all from Google Fonts under the SIL Open Font License.
