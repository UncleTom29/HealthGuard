"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuiBlockchainClient = void 0;
const client_1 = require("@mysten/sui/client");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const transactions_1 = require("@mysten/sui/transactions");
const utils_1 = require("./utils");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class SuiBlockchainClient {
    constructor(apiUrl) {
        this.client = new client_1.SuiClient({ url: apiUrl });
        // In production, load your keypair securely.
        this.signer = new ed25519_1.Ed25519Keypair();
    }
    async submitAlert(alertData) {
        return await (0, utils_1.retry)(async () => {
            try {
                const tx = new transactions_1.Transaction();
                // Prepare arguments for the Move call
                const timestamp = Date.now();
                const alertMessage = JSON.stringify(alertData.alerts);
                // Build the Move call
                tx.moveCall({
                    target: "0xa49b4434dd2aba1d6fe4e368216e56d7986d5df7844d6601e7e8e7d7be4ce71f::HealthGuard::AlertManager::log_alert",
                    typeArguments: [],
                    arguments: [
                        tx.pure(new Uint8Array(new BigUint64Array([BigInt(timestamp)]).buffer)),
                        tx.pure(new TextEncoder().encode(alertMessage))
                    ]
                });
                const result = await this.client.signAndExecuteTransaction({
                    signer: this.signer,
                    transaction: tx,
                    options: { showEffects: true }
                });
                console.info("Alert transaction submitted on Sui blockchain:", result);
                return result.digest;
            }
            catch (error) {
                console.error("Error submitting alert to Sui blockchain:", error.message);
                throw error; // Allow retry mechanism to handle it
            }
        }, parseInt(process.env.RETRY_ATTEMPTS || "3"), parseFloat(process.env.RETRY_BACKOFF || "2.0"));
    }
    async queryAlerts() {
        try {
            return await this.client.getTotalTransactionBlocks();
        }
        catch (error) {
            console.error("Error querying alerts:", error.message);
            return { count: 0 }; // Return safe default
        }
    }
}
exports.SuiBlockchainClient = SuiBlockchainClient;
