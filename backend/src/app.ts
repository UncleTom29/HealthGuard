// backend/src/app.ts
import express from 'express';
import path from 'path';
import { Config, EncryptionManager, AtomaClient, HealthGuardAgent } from './aiEngine';
import { SuiBlockchainClient } from './suiClient';
import { SuiAuthManager } from './suiAuth';
import cors from 'cors';


const app = express();

app.use(cors());

const port = parseInt(process.env.PORT || "5200");

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const encryptionManager = new EncryptionManager(Config.ENCRYPTION_KEY);
const atomaClient = new AtomaClient(Config.ATOMASDK_BEARER_AUTH);
const suiClient = new SuiBlockchainClient(Config.SUI_API_URL);
const healthGuard = new HealthGuardAgent(atomaClient, suiClient, encryptionManager);

// backend/src/app.ts - Add these routes

const authManager = new SuiAuthManager();
// Generate nonce for ZK login
app.post('/auth/nonce', async (req, res) => {
  try {
    const nonce = await authManager.generateLoginNonce();
    res.json({ nonce });
  } catch (error: any) {
    console.error('Error generating nonce:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// Verify ZK login
app.post('/auth/verify', async (req, res) => {
  try {
    const { zkProof, jwt, ephemeralKey, maxEpoch } = req.body;
    
    const result = await authManager.verifyZkLogin(jwt, zkProof, ephemeralKey, maxEpoch);
    res.json({
      token: result.token,
      address: result.address
    });
  } catch (error: any) {
    console.error('Error verifying login:', error);
    res.status(401).json({ error: 'Login verification failed' });
  }
});

// Verify session token
app.get('/auth/session', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const session = authManager.verifySessionToken(token);
  
  if (!session) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  res.json({ address: session.address });
});

app.get('/health', (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    alert_count: healthGuard.alertCount
  });
});

app.post('/submitAlert', async (req, res) => {
  try {
    const rawData = req.body; // Health metrics submitted by the user.
    const analysisResult = await healthGuard.processAndLogAlerts(rawData);
    res.json({ result: analysisResult });
  } catch (error: any) {
    console.error("Submit alert error: " + error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.info(`Received chat message: ${message}`);
    const responseText = await healthGuard.chatResponse(message);
    res.json({ response: responseText });
  } catch (error: any) {
    console.error("Chat endpoint error: " + error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/alerts', async (req, res) => {
  try {
    const alerts = await suiClient.queryAlerts();
    res.json({ alerts });
  } catch (error: any) {
    console.error("Alerts query error: " + error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.info(`HealthGuard AI Agent server running on port ${port}`);
});