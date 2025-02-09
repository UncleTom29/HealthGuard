"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuiAuthManager = void 0;
// backend/src/suiAuth.ts
const client_1 = require("@mysten/sui/client");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const zklogin_1 = require("@mysten/sui/zklogin");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = require("jwks-rsa");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class SuiAuthManager {
    constructor() {
        this.JWT_SECRET = this.getRequiredEnv('JWT_SECRET');
        this.JWKS_URI = this.getRequiredEnv('JWKS_URI');
        this.CLIENT_ID = this.getRequiredEnv('CLIENT_ID');
        // Use the SUI_API_URL from the environment or fallback to getFullnodeUrl('testnet')
        const fullnodeUrl = process.env.SUI_API_URL || (0, client_1.getFullnodeUrl)('testnet');
        this.suiClient = new client_1.SuiClient({ url: fullnodeUrl });
    }
    getRequiredEnv(key) {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
        return value;
    }
    // Update the SuiAuthManager class in suiAuth.ts
    async generateLoginNonce() {
        try {
            // First try to connect with increased timeout
            const { epoch } = await this.suiClient.getLatestSuiSystemState();
            const maxEpoch = Number(epoch) + 2;
            const randomness = (0, zklogin_1.generateRandomness)();
            return (0, zklogin_1.generateNonce)(ed25519_1.Ed25519Keypair.generate().getPublicKey(), maxEpoch, randomness);
        }
        catch (error) {
            console.warn('Failed to connect to Sui network, using fallback nonce generation:', error);
            // Fallback: Generate a nonce without network dependency
            const fallbackEpoch = Math.floor(Date.now() / 1000); // Current timestamp as epoch
            const randomness = (0, zklogin_1.generateRandomness)();
            const keypair = ed25519_1.Ed25519Keypair.generate();
            return (0, zklogin_1.generateNonce)(keypair.getPublicKey(), fallbackEpoch + 7200, // 2 hours from now
            randomness);
        }
    }
    async verifyZkLogin(jwtToken, zkProof, ephemeralKey, maxEpoch) {
        try {
            const jwksClient = new jwks_rsa_1.JwksClient({ jwksUri: this.JWKS_URI });
            const signingKey = await jwksClient.getSigningKey();
            const payload = jsonwebtoken_1.default.verify(jwtToken, signingKey.getPublicKey(), {
                audience: this.CLIENT_ID,
                issuer: 'https://accounts.google.com',
            });
            const userAddress = (0, zklogin_1.jwtToAddress)(jwtToken, BigInt(maxEpoch));
            const signature = (0, zklogin_1.getZkLoginSignature)({
                inputs: {
                    ...JSON.parse(zkProof),
                    addressSeed: payload.sub,
                },
                maxEpoch,
                userSignature: ephemeralKey,
            });
            const sessionToken = jsonwebtoken_1.default.sign({
                sub: userAddress,
                iss: 'healthguard',
                aud: 'healthguard-api',
            }, this.JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });
            return { address: userAddress, token: sessionToken };
        }
        catch (error) {
            console.error('Authentication failed:', error);
            throw new Error('Authentication verification failed');
        }
    }
    verifySessionToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET, {
                audience: 'healthguard-api',
                issuer: 'healthguard',
            });
            return { address: decoded.sub };
        }
        catch (error) {
            return null;
        }
    }
}
exports.SuiAuthManager = SuiAuthManager;
