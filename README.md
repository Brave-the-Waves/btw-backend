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