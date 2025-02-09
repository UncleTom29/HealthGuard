"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthGuardAgent = exports.AtomaClient = exports.EncryptionManager = exports.Config = void 0;
// backend/src/aiEngine.ts
const axios_1 = __importDefault(require("axios"));
const Fernet = __importStar(require("fernet"));
const atoma_sdk_1 = require("atoma-sdk");
const utils_1 = require("./utils");
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config();
// Configuration class with key validation and generation
class Config {
    // Generate a valid Fernet key if none is provided
    static get ENCRYPTION_KEY() {
        if (!process.env.ENCRYPTION_KEY) {
            const key = crypto_1.default.randomBytes(32).toString('base64url');
            console.warn('No encryption key provided. Generated new key:', key);
            return key;
        }
        try {
            const decoded = Buffer.from(process.env.ENCRYPTION_KEY, 'base64url');
            if (decoded.length !== 32) {
                throw new Error('Invalid key length');
            }
            return process.env.ENCRYPTION_KEY;
        }
        catch (error) {
            const key = crypto_1.default.randomBytes(32).toString('base64url');
            console.warn('Invalid encryption key provided. Generated new key:', key);
            return key;
        }
    }
}
exports.Config = Config;
Config.ATOMA_API_URL = process.env.ATOMA_API_URL || 'https://api.atomacloud.com';
Config.SUI_API_URL = process.env.SUI_API_URL || 'https://fullnode.testnet.sui.io:443';
Config.AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'https://api.ai-backend.example.com/query';
Config.ATOMASDK_BEARER_AUTH = process.env.ATOMASDK_BEARER_AUTH || '7uabXiOonc28sJAussfv90cIeiJkPi';
Config.RETRY_ATTEMPTS = parseInt(process.env.RETRY_ATTEMPTS || '3');
Config.RETRY_BACKOFF = parseFloat(process.env.RETRY_BACKOFF || '2.0');
// Updated Encryption Manager with validation
class EncryptionManager {
    constructor(key) {
        try {
            this.secret = new Fernet.Secret(key);
        }
        catch (error) {
            console.error('Failed to initialize encryption manager:', error);
            throw new Error('Invalid encryption key provided to EncryptionManager');
        }
    }
    encrypt(data) {
        try {
            const token = new Fernet.Token({
                secret: this.secret,
                time: Math.floor(Date.now() / 1000)
            });
            const message = token.encode(data.toString());
            console.debug("Data encrypted successfully.");
            return message;
        }
        catch (error) {
            console.error("Encryption error:", error.message);
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    decrypt(tokenStr) {
        try {
            const token = new Fernet.Token({
                secret: this.secret,
                token: tokenStr,
                ttl: 0
            });
            const message = token.decode();
            return message;
        }
        catch (error) {
            console.error("Decryption error:", error.message);
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
}
exports.EncryptionManager = EncryptionManager;
// Atoma Client Implementation
class AtomaClient {
    constructor(bearerAuth) {
        this.sdk = new atoma_sdk_1.AtomaSDK({ bearerAuth });
    }
    async processHealthData(healthData) {
        return await (0, utils_1.retry)(async () => {
            try {
                const result = await this.sdk.chat.create({
                    messages: [
                        {
                            role: "user",
                            content: `Analyze these health metrics and provide alerts if needed:
                Heart Rate: ${healthData.heart_rate} bpm
                Blood Pressure: ${healthData.blood_pressure.systolic}/${healthData.blood_pressure.diastolic}
                Blood Glucose: ${healthData.blood_glucose} mg/dL`
                        }
                    ],
                    model: "meta-llama/Llama-3.3-70B-Instruct"
                });
                console.debug("Atoma API response:", result.choices[0].message);
                return this.parseAIResponse(result, healthData);
            }
            catch (error) {
                console.error("Atoma API error:", error.message);
                return this.localAnalysis(healthData);
            }
        }, Config.RETRY_ATTEMPTS, Config.RETRY_BACKOFF);
    }
    parseAIResponse(aiResponse, healthData) {
        try {
            const alerts = this.extractAlertsFromAIResponse(aiResponse);
            return {
                alerts,
                analysis: {
                    heart_rate: {
                        value: healthData.heart_rate,
                        status: this.getStatus(healthData.heart_rate, 60, 100)
                    },
                    blood_pressure: {
                        value: `${healthData.blood_pressure.systolic}/${healthData.blood_pressure.diastolic}`,
                        status: this.getBPStatus(healthData.blood_pressure)
                    },
                    blood_glucose: {
                        value: healthData.blood_glucose,
                        status: this.getStatus(healthData.blood_glucose, 70, 140)
                    }
                }
            };
        }
        catch (error) {
            console.warn("Failed to parse AI response, using local analysis");
            return this.localAnalysis(healthData);
        }
    }
    extractAlertsFromAIResponse(aiResponse) {
        const alerts = [];
        // Check if the API returned a valid response structure
        if (aiResponse.choices &&
            Array.isArray(aiResponse.choices) &&
            aiResponse.choices.length > 0 &&
            aiResponse.choices[0].message &&
            typeof aiResponse.choices[0].message.content === 'string') {
            const content = aiResponse.choices[0].message.content.toLowerCase();
            if (content.includes('high blood pressure'))
                alerts.push('High blood pressure detected');
            if (content.includes('low blood pressure'))
                alerts.push('Low blood pressure detected');
            if (content.includes('high heart rate'))
                alerts.push('Elevated heart rate detected');
            if (content.includes('low heart rate'))
                alerts.push('Low heart rate detected');
            if (content.includes('high glucose'))
                alerts.push('High blood glucose detected');
            if (content.includes('low glucose'))
                alerts.push('Low blood glucose detected');
        }
        return alerts;
    }
    localAnalysis(data) {
        const alerts = [];
        if (data.blood_pressure.systolic > 140 || data.blood_pressure.diastolic > 90) {
            alerts.push("High blood pressure detected");
        }
        else if (data.blood_pressure.systolic < 90 || data.blood_pressure.diastolic < 60) {
            alerts.push("Low blood pressure detected");
        }
        if (data.heart_rate > 100) {
            alerts.push("Elevated heart rate detected");
        }
        else if (data.heart_rate < 60) {
            alerts.push("Low heart rate detected");
        }
        if (data.blood_glucose > 140) {
            alerts.push("High blood glucose detected");
        }
        else if (data.blood_glucose < 70) {
            alerts.push("Low blood glucose detected");
        }
        return {
            alerts,
            analysis: {
                heart_rate: {
                    value: data.heart_rate,
                    status: this.getStatus(data.heart_rate, 60, 100)
                },
                blood_pressure: {
                    value: `${data.blood_pressure.systolic}/${data.blood_pressure.diastolic}`,
                    status: this.getBPStatus(data.blood_pressure)
                },
                blood_glucose: {
                    value: data.blood_glucose,
                    status: this.getStatus(data.blood_glucose, 70, 140)
                }
            }
        };
    }
    getStatus(value, min, max) {
        return value >= min && value <= max ? 'normal' : 'attention';
    }
    getBPStatus(bp) {
        return (bp.systolic >= 90 && bp.systolic <= 140 &&
            bp.diastolic >= 60 && bp.diastolic <= 90) ? 'normal' : 'attention';
    }
}
exports.AtomaClient = AtomaClient;
// HealthGuard Agent Implementation
class HealthGuardAgent {
    constructor(atomaClient, suiClient, encryptionManager) {
        this.alertCount = 0;
        this.atomaClient = atomaClient;
        this.suiClient = suiClient;
        this.encryptionManager = encryptionManager;
    }
    ingestHealthData(rawData) {
        try {
            const dataBuffer = Buffer.from(JSON.stringify(rawData), 'utf-8');
            const encrypted = this.encryptionManager.encrypt(dataBuffer);
            console.debug("Health data ingested and encrypted.");
            return encrypted;
        }
        catch (error) {
            console.error("Error in ingestHealthData:", error.message);
            throw error;
        }
    }
    async analyzeHealthData(rawData) {
        const encryptedData = this.ingestHealthData(rawData);
        try {
            return await this.atomaClient.processHealthData(JSON.parse(this.encryptionManager.decrypt(encryptedData)));
        }
        catch (error) {
            console.error("Error analyzing health data, using local analysis");
            return this.atomaClient.processHealthData(rawData);
        }
    }
    async processAndLogAlerts(rawData) {
        try {
            const analysisResult = await this.analyzeHealthData(rawData);
            const alerts = analysisResult.alerts || [];
            if (alerts.length > 0) {
                try {
                    const anonymizedAlert = {
                        alerts: alerts,
                        timestamp: new Date().toISOString(),
                        health_metric_summary: {
                            heart_rate: rawData.heart_rate,
                            blood_pressure: rawData.blood_pressure,
                            blood_glucose: rawData.blood_glucose
                        }
                    };
                    await this.suiClient.submitAlert(anonymizedAlert);
                    this.alertCount += alerts.length;
                    console.info(`${alerts.length} alert(s) logged on Sui blockchain.`);
                }
                catch (error) {
                    console.error("Failed to log alerts to blockchain, continuing with analysis");
                }
            }
            else {
                console.info("No alerts generated from health data.");
            }
            return analysisResult;
        }
        catch (error) {
            console.error("Error in processAndLogAlerts:", error.message);
            return this.atomaClient.localAnalysis(rawData);
        }
    }
    async chatResponse(userMessage) {
        const lowerMsg = userMessage.toLowerCase();
        const healthKeywords = ['heart', 'blood', 'glucose', 'bp', 'pressure', 'health'];
        if (healthKeywords.some(keyword => lowerMsg.includes(keyword))) {
            if (lowerMsg.includes("hint") || lowerMsg.includes("suggestion")) {
                return "Tip: Monitor your heart rate, blood pressure, and blood glucose regularly. " +
                    "A balanced diet, exercise, and routine checkups help maintain healthy levels.";
            }
            else {
                const sampleData = {
                    heart_rate: 82,
                    blood_pressure: { systolic: 128, diastolic: 84 },
                    blood_glucose: 102,
                    timestamp: new Date().toISOString()
                };
                try {
                    const analysis = await this.processAndLogAlerts(sampleData);
                    if (analysis.alerts && analysis.alerts.length > 0) {
                        return `Based on your last readings: ${analysis.alerts.join(", ")}. Please consult a healthcare provider if needed.`;
                    }
                    else {
                        return "Your recent health metrics are within normal ranges.";
                    }
                }
                catch (error) {
                    return "I can analyze your health data. Please submit your latest measurements for a detailed assessment.";
                }
            }
        }
        try {
            const response = await axios_1.default.post(Config.AI_BACKEND_URL, { query: userMessage }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000
            });
            console.info("Query forwarded to AI backend successfully.");
            return response.data.answer || "I'm your health monitoring assistant. How can I help you today?";
        }
        catch (error) {
            return "I'm your health monitoring assistant. I can help you track and analyze your vital signs. " +
                "Try asking about your heart rate, blood pressure, or blood glucose levels.";
        }
    }
}
exports.HealthGuardAgent = HealthGuardAgent;
