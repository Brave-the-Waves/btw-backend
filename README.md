# Brave The Waves - Backend API

Welcome to the backend repository for **Brave The Waves**, a charity dragon boat event dedicated to raising awareness and funds for breast cancer research and support.

This event is proudly hosted by:
*   **WHAM (Women’s Health Awareness Movement)** at McGill University
*   **University of Montreal Dragon Boat Club**

All proceeds raised through this event and platform are donated to **More Than A Cure (MTAC)** to support their vital work.

## 🚧 Project Status

**Current Status:** 🟡 In Development

This project is currently a Work In Progress (WIP). The core registration and team management logic is implemented, but we are actively working on:
*   💳 **Payment Integration:** Secure processing for registration fees and donations.
*   📊 **Admin Dashboard:** A complete interface for organizers to manage teams, users, and event logistics.

## 🛠️ Technologies Used

This API is built using a robust Node.js stack:

*   **Runtime:** [Node.js](https://nodejs.org/)
*   **Framework:** [Express.js](https://expressjs.com/) - Fast, unopinionated, minimalist web framework.
*   **Database:** [MongoDB](https://www.mongodb.com/) (with [Mongoose](https://mongoosejs.com/)) - For flexible and scalable data modeling.
*   **Authentication:** [Auth0](https://auth0.com/) - Secure identity management (using `express-oauth2-jwt-bearer`).
*   **Utilities:**
    *   `nanoid` for generating unique invite codes.
    *   `express-async-handler` for cleaner async error handling.
    *   `dotenv` for environment variable management.

## ✨ Features

### 👤 User Management
*   **Profile Sync:** Automatically syncs user data from Auth0 upon login.
*   **Dashboard:** Users can view their personal status, payment status, and team membership.
*   **Profile Customization:** Users can update their bio and display name.
*   **Public Profiles:** View detailed profiles of other participants, including their "Why I Paddle" story and fundraising progress.
*   **User Search:** Find participants by name.
*   **Leaderboard:** Real-time ranking of top fundraisers.

### 🏆 Team Management
*   **Team Creation:** Eligible users (who have paid registration) can create new teams.
*   **Join via Code:** Secure team joining using unique 6-character invite codes.
*   **Captain Controls:**
    *   Edit team details (Name, Division, Description).
    *   Remove members from the roster.
    *   Disband the team.
*   **Member Actions:** Users can leave a team if they joined by mistake.
*   **Team Rosters:** Publicly viewable lists of all members in a team.
*   **Team Leaderboard:** Rankings based on the total amount raised by all team members.
*   **Team Search:** Find teams by name.

## 🔌 API Endpoints

### Public Routes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/public/teams` | List all teams |
| `GET` | `/api/public/teams/leaderboard` | Get top teams by fundraising |
| `GET` | `/api/public/teams/search?q=...` | Search teams by name |
| `GET` | `/api/public/teams/:name` | Get team details |
| `GET` | `/api/public/teams/:name/members` | Get team roster |
| `GET` | `/api/users/leaderboard` | Get top individual fundraisers |
| `GET` | `/api/users/search?q=...` | Search users by name |
| `GET` | `/api/users/:id` | Get specific user profile |

### Protected Routes (Requires Auth Token)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/users/sync` | Sync Auth0 user to database |
| `GET` | `/api/users/me` | Get my dashboard info |
| `PUT` | `/api/users/me` | Update my profile (Bio, Name) |
| `POST` | `/api/registrations/team` | Create a new team |
| `POST` | `/api/registrations/join` | Join a team with invite code |
| `POST` | `/api/public/teams/leave` | Leave current team |
| `PUT` | `/api/public/teams/:id` | Update team details (Captain only) |
| `DELETE` | `/api/public/teams/:id` | Disband team (Captain only) |
| `DELETE` | `/api/public/teams/:id/members/:userId` | Remove member (Captain only) |

## 🚀 Getting Started

Follow these steps to set up the backend locally.

### Prerequisites

*   Node.js (v14+ recommended)
*   npm or yarn
*   A MongoDB instance (local or Atlas)
*   An Auth0 account (for authentication setup)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Brave-the-Waves/btw-backend.git
    cd btw-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add the following variables:
    ```env
    PORT=5000
    CONNECTION_STRING=your_mongodb_connection_string
    AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com/
    AUTH0_AUDIENCE=https://your-api-identifier
    ```

4.  **Run the server:**
    *   **Development Mode** (with hot-reload via nodemon):
        ```bash
        npm run dev
        ```
    *   **Production Mode:**
        ```bash
        npm start
        ```

The server should now be running on `http://localhost:5000` (or your specified PORT).

## 📂 Project Structure

```
btw-backend/
├── config/             # Database configuration
├── controllers/        # Route logic and request handling
├── middleware/         # Custom middleware (Auth, etc.)
├── models/             # Mongoose data models (Users, Teams)
├── routes/             # API route definitions
└── server.js           # Entry point
```

## 🤝 Contributing

This project is built for a charitable cause. If you are a developer from the hosting organizations and want to contribute, please reach out to the project lead or create a Pull Request.

---
*Built with ❤️ for the fight against breast cancer.*