// backend/src/suiAuth.ts
import { getFullnodeUrl, SuiClient, SuiHTTPTransport } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { jwtToAddress, getZkLoginSignature, generateNonce, generateRandomness } from '@mysten/sui/zklogin';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import dotenv from 'dotenv';
dotenv.config();

export class SuiAuthManager {
  private readonly JWT_SECRET: string;
  private readonly JWKS_URI: string;
  private readonly CLIENT_ID: string;
  private suiClient: SuiClient;

  constructor() {
    this.JWT_SECRET = this.getRequiredEnv('JWT_SECRET');
    this.JWKS_URI = this.getRequiredEnv('JWKS_URI'); 
    this.CLIENT_ID = this.getRequiredEnv('CLIENT_ID');
    // Use the SUI_API_URL from the environment or fallback to getFullnodeUrl('testnet')
    const fullnodeUrl = process.env.SUI_API_URL || getFullnodeUrl('testnet');
    this.suiClient = new SuiClient({ url: fullnodeUrl });
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
// Update the SuiAuthManager class in suiAuth.ts
async generateLoginNonce(): Promise<string> {
    try {
      // First try to connect with increased timeout
      const { epoch } = await this.suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 2;
      const randomness = generateRandomness();
      return generateNonce(
        Ed25519Keypair.generate().getPublicKey(),
        maxEpoch,
        randomness
      );
    } catch (error) {
      console.warn('Failed to connect to Sui network, using fallback nonce generation:', error);
      // Fallback: Generate a nonce without network dependency
      const fallbackEpoch = Math.floor(Date.now() / 1000); // Current timestamp as epoch
      const randomness = generateRandomness();
      const keypair = Ed25519Keypair.generate();
      return generateNonce(
        keypair.getPublicKey(),
        fallbackEpoch + 7200, // 2 hours from now
        randomness
      );
    }
  }

  async verifyZkLogin(
    jwtToken: string,
    zkProof: string,
    ephemeralKey: string,
    maxEpoch: number
  ): Promise<{ address: string; token: string }> {
    try {
      const jwksClient = new JwksClient({ jwksUri: this.JWKS_URI });
      const signingKey = await jwksClient.getSigningKey();
      const payload = jwt.verify(jwtToken, signingKey.getPublicKey(), {
        audience: this.CLIENT_ID,
        issuer: 'https://accounts.google.com',
      }) as jwt.JwtPayload;
      const userAddress = jwtToAddress(jwtToken, BigInt(maxEpoch));
      const signature = getZkLoginSignature({
        inputs: {
          ...JSON.parse(zkProof),
          addressSeed: payload.sub!,
        },
        maxEpoch,
        userSignature: ephemeralKey,
      });
      const sessionToken = jwt.sign(
        {
          sub: userAddress,
          iss: 'healthguard',
          aud: 'healthguard-api',
        },
        this.JWT_SECRET,
        { expiresIn: '24h', algorithm: 'HS256' }
      );
      return { address: userAddress, token: sessionToken };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication verification failed');
    }
  }

  verifySessionToken(token: string): { address: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        audience: 'healthguard-api',
        issuer: 'healthguard',
      }) as { sub: string };
      return { address: decoded.sub };
    } catch (error) {
      return null;
    }
  }
}
