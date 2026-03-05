# Brave The Waves - Backend API

REST API backend for **Brave The Waves**, a charity dragon boat event raising awareness and funds for breast cancer research and support.

This event is proudly hosted by:
- **WHAM (Women's Health Awareness Movement)** at McGill University
- **University of Montreal Dragon Boat Club**

All proceeds are donated to **More Than A Cure (MTAC)**.

## Technologies

- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Database:** MongoDB with Mongoose
- **Authentication:** Firebase Admin SDK (JWT verification; emulator mode supported for local dev)
- **Payments:** Stripe (Checkout Sessions + Webhooks)
- **Infrastructure:** Docker, Terraform (GCP)
- **Utilities:** `nanoid`, `express-async-handler`, `express-rate-limit`, `dotenv`

## Features

### User & Participant Management
- **Firebase Auth sync:** Creates or updates a user record on every login.
- **Role system:** Users start with `role: 'user'` and are upgraded to `role: 'paddler'` after paying the registration fee. Paddlers receive a unique `donationId` used for public donation links.
- **Profile:** Users can update their display name, bio, and profile picture (stored in Firebase Storage).
- **Participant directory:** Browse all paddlers, view individual profiles, and search by name.
- **Fundraising leaderboard:** Ranks paddlers by total amount raised.
- **Account deletion:** Users can delete their own account.
- **Email validation:** Validate a list of emails before submitting a bundle registration.

### Team Management
- **Team creation:** Paid paddlers can create a team and become its captain.
- **Join via invite code:** Teams are joined using a unique 6-character code generated with `nanoid`.
- **Captain controls:** Edit team name/division/description, remove members, disband the team, and transfer captaincy to another member.
- **Member actions:** Paddlers can leave their current team.
- **Public team pages:** View team details, roster, and fundraising totals.
- **Team leaderboard:** Rankings by aggregate amount raised across all team members.
- **Team search:** Find teams by name.

### Registration & Payments (Stripe)
- **Individual registration:** Creates a Stripe Checkout Session for the $25 CAD registration fee. On successful payment, the user is upgraded to `paddler`.
- **Bundle registration:** A single user pays the registration fee for multiple participants at once (validated email list). Each covered participant is upgraded to `paddler`.
- **Donations:** Public Stripe Checkout Sessions for one-time donations, targeted to a specific paddler via their `donationId` or made as a general event donation.
- **Stripe Webhook:** Processes `checkout.session.completed` events to confirm payments, create `Donation` records, and update `Registration` and `User` documents.
- **Donation history:** Query donations received by a paddler, donations attributed to a team, or donations made by a specific user.
- **Tax receipt fields:** Donors can provide full name, address, and phone number at checkout for tax receipt purposes.

### Waivers
- **Submit waiver:** Paddlers fill out and digitally sign a liability waiver (signature image uploaded to Firebase Storage).
- **Minor support:** Guardian name, phone, email, and a separate guardian signature URL are collected when `isMinor` is `true`.
- **Waiver status check:** Quickly query whether a user has completed their waiver.

### Registration Codes
- Pre-seeded invite codes (`RegistrationCode`) that grant registration access via `POST /api/registrations/confirm-selection`.
- Seeding script: `npm run seed:registration-codes`.

### Infrastructure
- **Docker:** `Dockerfile` and `docker-compose.yml` for containerised local development and production builds.
- **Terraform:** GCP infrastructure definitions under `terraform/` (Cloud Run, secrets, networking).
- **Deploy script:** `deploy_backend.sh` for CI/CD deployments.

## API Endpoints

### Participants (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/participants` | List all paddlers |
| `GET` | `/api/participants/leaderboard` | Top paddlers by amount raised |
| `GET` | `/api/participants/search?q=...` | Search paddlers by name |
| `GET` | `/api/participants/:id` | Get a paddler's public profile |

### Teams (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/public/teams` | List all teams |
| `GET` | `/api/public/teams/leaderboard` | Top teams by fundraising |
| `GET` | `/api/public/teams/search?q=...` | Search teams by name |
| `GET` | `/api/public/teams/:name` | Get team details |
| `GET` | `/api/public/teams/:name/members` | Get team roster |

### Donations (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/donations/user/:userId` | Donations received by a paddler |
| `GET` | `/api/donations/teams/:teamId` | Donations received by a team's members |

### Users (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/users/sync` | Sync Firebase user to the database |
| `GET` | `/api/users/me` | Get current user's status and profile |
| `PUT` | `/api/users/me` | Update profile (name, bio, picture) |
| `DELETE` | `/api/users/me` | Delete current user's account |
| `POST` | `/api/users/validate-emails` | Validate emails for bundle registration |

### Registration (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/registrations/team` | Create a new team (captain path) |
| `POST` | `/api/registrations/join` | Join a team with an invite code |
| `GET` | `/api/registrations/:id/status` | Check a registration's payment status |
| `POST` | `/api/registrations/confirm-selection` | Confirm selection via a registration code |

### Team Management (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `PUT` | `/api/teams/:id` | Update team details (captain only) |
| `DELETE` | `/api/teams/:id` | Disband a team (captain only) |
| `DELETE` | `/api/teams/:id/members/:userId` | Remove a member (captain only) |
| `POST` | `/api/teams/:id/transfer-captain` | Transfer captaincy (captain only) |
| `POST` | `/api/teams/leave` | Leave current team |

### Payments (Public / Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/create-checkout-session` | Create a Stripe donation checkout session |
| `POST` | `/api/create-registration-checkout` | Individual registration checkout (auth required) |
| `POST` | `/api/create-bundle-registration-checkout` | Bundle registration checkout (auth required) |
| `POST` | `/api/stripe-webhook` | Stripe webhook handler (raw body, no auth) |

### Donations (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/donations/made/:userId` | Donations made by the authenticated user |

### Waivers (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/waivers/:userId/status` | Check if a user's waiver is complete |
| `GET` | `/api/waivers/:userId` | Fetch full waiver data |
| `PUT` | `/api/waivers/:userId` | Submit / sign the waiver |

## Getting Started

### Prerequisites

- Node.js v18+
- npm
- A running MongoDB instance (local or Atlas)
- A Firebase project (for Auth)
- A Stripe account (for payments)

### Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/Brave-the-Waves/btw-backend.git
    cd btw-backend
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Configure environment variables:**

    Create a `.env` file in the root directory:
    ```env
    PORT=8080
    CONNECTION_STRING=your_mongodb_connection_string

    # Firebase Admin SDK
    FIREBASE_PROJECT_ID=your_project_id
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com

    # Set to 'emulator' to skip Firebase credential verification during local development
    FIREBASE_AUTH_MODE=production

    # Stripe
    STRIPE_TEST_SECRET_KEY=sk_test_...
    STRIPE_PROD_SECRET_KEY=sk_live_...
    STRIPE_WEBHOOK_SECRET=whsec_...

    # Frontend URL (used for Stripe redirect URLs)
    CLIENT_URL=https://your-frontend-url.com

    NODE_ENV=development
    ```

4. **Run the server:**
    - **Development** (with hot-reload via nodemon):
        ```bash
        npm run dev
        ```
    - **Production:**
        ```bash
        npm start
        ```

    The server runs on `http://localhost:8080` by default.

5. **(Optional) Seed registration codes:**
    ```bash
    npm run seed:registration-codes
    ```

### Running with Docker

```bash
docker-compose up --build
```

## Project Structure

```
btw-backend/
├── config/             # Database connection
├── constants.js        # Shared constants (HTTP codes, registration fee)
├── controllers/        # Request handlers (users, teams, payments, waivers, donations)
├── helpers/            # One-off scripts (migrations, seeding, tax receipts)
├── middleware/         # Auth (Firebase JWT) and error handler
├── models/             # Mongoose schemas (User, Team, Registration, Donation, Waiver, RegistrationCode)
├── routes/             # Express routers
├── scripts/            # Seeding scripts
├── terraform/          # GCP infrastructure (Cloud Run, networking)
├── docker-compose.yml
├── Dockerfile
├── deploy_backend.sh
└── server.js           # Entry point
```

---

*Built with ❤️ for the fight against breast cancer.*
