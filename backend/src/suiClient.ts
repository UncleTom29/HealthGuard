import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { retry } from './utils';
import dotenv from 'dotenv';
dotenv.config();

export class SuiBlockchainClient {
  client: SuiClient;
  signer: Ed25519Keypair;

  constructor(apiUrl: string) {
    this.client = new SuiClient({ url: apiUrl });
    // In production, load your keypair securely.
    this.signer = new Ed25519Keypair();
  }

  async submitAlert(alertData: any): Promise<string> {
    return await retry(async () => {
      try {
        const tx = new Transaction();

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
      } catch (error: any) {
        console.error("Error submitting alert to Sui blockchain:", error.message);
        throw error; // Allow retry mechanism to handle it
      }
    }, parseInt(process.env.RETRY_ATTEMPTS || "3"), parseFloat(process.env.RETRY_BACKOFF || "2.0"));
  }

  async queryAlerts(): Promise<any> {
    try {
      return await this.client.getTotalTransactionBlocks();
    } catch (error: any) {
      console.error("Error querying alerts:", error.message);
      return { count: 0 }; // Return safe default
    }
  }
}