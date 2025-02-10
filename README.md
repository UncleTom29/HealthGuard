# 🏥 HealthGuard AI
HealthGuard AI is a decentralized AI-powered health assistant that empowers users to own, control, and monetize their health data while receiving personalized medical insights.


It integrates a **frontend**, a **Node.js backend**, and a **Move smart contract** on the **Sui blockchain** to provide secure and intelligent health monitoring.

Sui Testnet Deployment: https://suiscan.xyz/testnet/object/0xa49b4434dd2aba1d6fe4e368216e56d7986d5df7844d6601e7e8e7d7be4ce71f/tx-blocks 

---

## 📜 Table of Contents
- [🚀 Features](#-features)
- [📂 Project Structure](#-project-structure)
- [🛠️ Installation](#️-installation)
  - [Backend Setup](#-backend-setup)
  - [Frontend Setup](#-frontend-setup)
  - [Smart Contract Deployment](#-smart-contract-deployment)
- [🌐 API Endpoints](#-api-endpoints)
- [🛡️ Security & Authentication](#️-security--authentication)
- [📄 License](#-license)

---

## 🚀 Features
✅ AI-powered health alert system  
✅ Decentralized identity with ZK login  
✅ Blockchain-based alert tracking (Sui)  
✅ Secure HTTPS backend communication  

---

## 📂 Project Structure

```
HealthGuard-AI/
│── backend/               # Node.js/Express backend API
│   ├── src/               # Source code
│   │   ├── aiEngine.ts    # Atoma SDK AI processing
│   │   ├── suiClient.ts   # Sui blockchain interactions
│   │   ├── suiAuth.ts     # ZK authentication module
│   │   ├── app.ts         # Express API
│   ├── package.json       # Backend dependencies
│
│── frontend/             
│   ├── index.html               # Frontend code
│  
│
│── contract/        # Move contract (Sui)
│   ├── sources/           # Move contract files
│   ├── scripts/           # Deployment scripts
│   ├── Move.toml          # Sui package metadata
│
└── README.md              # Project documentation
```

---

## 🛠️ Installation

### ⚡ Backend Setup
1. **Clone the repository**  
   ```sh
   git clone https://github.com/uncletom29/HealthGuard-AI.git
   cd HealthGuard-AI/backend
   ```

2. **Install dependencies**  
   ```sh
   npm install
   ```

3. **Set up environment variables**  
   Create a `.env` file:
   ```
   PORT=5200
   ENCRYPTION_KEY=your_secret_key
   ATOMASDK_BEARER_AUTH=your_atoma_auth
   SUI_API_URL=https://fullnode.devnet.sui.io
   ```

4. **Run the server**  
   ```sh
   npm run build && npm run start
   ```

---

### 🎨 Frontend Setup
1. **Navigate to the frontend folder**  
   ```sh
   cd ../frontend
   ```

2. **set API_URL to backend URL and run html file**  
   


---

### 🔗 Smart Contract Deployment (Move on Sui)
1. **Install Sui CLI**  
   ```sh
   curl -fsSL https://install.sui.io | bash
   ```

2. **Login to Sui and fund account**  
   ```sh
   sui client switch --network testnet
   sui client faucet
   ```

3. **Deploy the Move contract**  
   ```sh
   cd ../smart-contract
   sui move build
   sui client publish --gas-budget 100000000
   ```

---



## 🌐 API Endpoints

| Method | Endpoint          | Description                  |
|--------|------------------|------------------------------|
| `POST` | `/auth/nonce`    | Generate nonce for ZK login |
| `POST` | `/auth/verify`   | Verify ZK login             |
| `GET`  | `/auth/session`  | Validate session token      |
| `GET`  | `/health`        | Get system health status    |
| `POST` | `/submitAlert`   | Submit AI health alert      |
| `GET`  | `/alerts`        | Fetch alerts from Sui       |

---

## 🛡️ Security & Authentication

- Uses **Zero-Knowledge Proofs (ZK Login)** for authentication.
- **HTTPS enforced** via AWS Caddy/NGINX proxy.
- **Move smart contracts** ensure transparent health alert tracking.

---

## 📄 License
This project is licensed under the **MIT License**.

---

🚀 **HealthGuard AI** – Empowering Decentralized Health Monitoring with AI & Blockchain!
```

---

Let me know if you want any modifications! 🚀