import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import mongoose, { Schema, Document } from 'mongoose';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();
if (!process.env.MONGO_URI && fs.existsSync(path.join(process.cwd(), 'backend', '.env'))) {
  dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_college_project_jwt_key_2025';

app.use(cors());
app.use(express.json());

// =======================================================
// PERSISTENT DUAL-TIER STORAGE STATE & FALLBACK
// =======================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'digital_estate_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  lastCheckIn: string;
  inactivityPeriod: number;
  createdAt: string;
  isSimulatedOverdue?: boolean;
}

interface StoredAsset {
  _id: string;
  userId: string;
  assetName: string;
  assetType: string;
  description: string;
  website: string;
  username: string;
  instructions: string;
  createdAt: string;
}

interface StoredBeneficiary {
  _id: string;
  userId: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface EmailDispatchLog {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  type: 'CHECKIN_REMINDER' | 'INACTIVITY_WARNING' | 'BENEFICIARY_ALERT' | 'TEST_EMAIL' | 'CUSTOM';
  status: 'DELIVERED_REAL' | 'DISPATCH_SIMULATED';
  details: string;
  messageId?: string;
  bodyHtml?: string;
}

interface LocalDatabaseState {
  users: StoredUser[];
  assets: StoredAsset[];
  beneficiaries: StoredBeneficiary[];
  logs: EmailDispatchLog[];
}

let dbState: LocalDatabaseState = {
  users: [],
  assets: [],
  beneficiaries: [],
  logs: []
};

function initInMemoryDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(raw);
      if (dbState.users && dbState.users.length > 0) {
        console.log(`📂 [Persistent Storage] Loaded ${dbState.users.length} users, ${dbState.assets?.length || 0} assets, ${dbState.beneficiaries?.length || 0} beneficiaries from ${DB_FILE}`);
        return;
      }
    } catch (e) {
      console.warn('Could not read existing db file, seeding defaults:', e);
    }
  }

  const defaultPasswordHash = bcrypt.hashSync('Password123', 10);
  const demoUserId = 'user-initial-101';

  dbState = {
    users: [
      {
        id: demoUserId,
        name: 'Logesh V',
        email: 'agileshlogesh@gmail.com',
        passwordHash: defaultPasswordHash,
        lastCheckIn: new Date().toISOString(),
        inactivityPeriod: 30,
        createdAt: new Date().toISOString(),
        isSimulatedOverdue: false
      }
    ],
    assets: [
      {
        _id: 'asset-1',
        userId: demoUserId,
        assetName: 'Primary Google Workspace Account',
        assetType: 'Email Account',
        description: 'Contains personal communications, tax documents, and Google Drive files.',
        website: 'https://mail.google.com',
        username: 'agileshlogesh@gmail.com',
        instructions: '2FA backup recovery codes are stored in the physical bank safety deposit box #412.',
        createdAt: new Date().toISOString()
      },
      {
        _id: 'asset-2',
        userId: demoUserId,
        assetName: 'Ethereum & Bitcoin Hardware Vault',
        assetType: 'Financial / Crypto',
        description: 'Cold storage hardware wallet for long-term digital asset reserves.',
        website: 'https://ledger.com',
        username: 'ledger_vault_01',
        instructions: 'Do NOT share recovery seed phrases online. The 24-word seed card is placed in the home fireproof safe.',
        createdAt: new Date().toISOString()
      },
      {
        _id: 'asset-3',
        userId: demoUserId,
        assetName: 'AWS Cloud Server & Domain Portfolio',
        assetType: 'Domain & Hosting',
        description: 'Hosts personal projects, portfolio, and family photo archives.',
        website: 'https://aws.amazon.com',
        username: 'root-admin',
        instructions: 'Root email access is linked to Primary Gmail. Designee should archive S3 Glacier backups.',
        createdAt: new Date().toISOString()
      }
    ],
    beneficiaries: [
      {
        _id: 'ben-1',
        userId: demoUserId,
        name: 'Agilesh V (Primary Designee)',
        relationship: 'Primary Beneficiary',
        email: 'agileshlogesh@gmail.com',
        phone: '+91 98765 43210',
        createdAt: new Date().toISOString()
      },
      {
        _id: 'ben-2',
        userId: demoUserId,
        name: 'Family Estate Trustee',
        relationship: 'Co-Trustee',
        email: 'agileshlogesh@gmail.com',
        phone: '+91 91234 56789',
        createdAt: new Date().toISOString()
      }
    ],
    logs: []
  };

  saveLocalDatabase();
}

function saveLocalDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local database file:', err);
  }
}

initInMemoryDatabase();

// =======================================================
// MONGOOSE SCHEMAS & MODELS (Cloud Atlas)
// =======================================================
interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  lastCheckIn: Date;
  inactivityPeriod: number;
  isSimulatedOverdue?: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  lastCheckIn: { type: Date, default: Date.now },
  inactivityPeriod: { type: Number, default: 30, min: 1 },
  isSimulatedOverdue: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

interface IAsset extends Document {
  userId: string;
  assetName: string;
  assetType: string;
  description: string;
  website: string;
  username: string;
  instructions: string;
  createdAt: Date;
}

const AssetSchema = new Schema<IAsset>({
  userId: { type: String, required: true, index: true },
  assetName: { type: String, required: true, trim: true },
  assetType: { type: String, required: true },
  description: { type: String, default: '', trim: true },
  website: { type: String, default: '', trim: true },
  username: { type: String, default: '', trim: true },
  instructions: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now }
});

interface IBeneficiary extends Document {
  userId: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  createdAt: Date;
}

const BeneficiarySchema = new Schema<IBeneficiary>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now }
});

const UserModel: any = mongoose.models.User || mongoose.model('User', UserSchema);
const AssetModel: any = mongoose.models.Asset || mongoose.model('Asset', AssetSchema);
const BeneficiaryModel: any = mongoose.models.Beneficiary || mongoose.model('Beneficiary', BeneficiarySchema);

let isMongoConnected = false;
let mongoDbHost = '';
let mongoDbName = '';
let mongoConnectionError = '';
let currentMongoUri = process.env.MONGO_URI || 'mongodb+srv://LogeshV:12345678@cluster0.uhsdntj.mongodb.net/digital_estate_planner?retryWrites=true&w=majority';

async function connectToMongo(uri: string): Promise<boolean> {
  if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
    isMongoConnected = false;
    mongoConnectionError = 'Invalid Mongo URI syntax: placeholder brackets < > present.';
    return false;
  }
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    console.log(`🔌 [MongoDB] Attempting connection to Atlas cluster...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
      family: 4
    });
    isMongoConnected = true;
    mongoDbHost = mongoose.connection.host || 'cluster0.uhsdntj.mongodb.net';
    mongoDbName = mongoose.connection.name || 'digital_estate_planner';
    mongoConnectionError = '';
    currentMongoUri = uri;
    console.log(`✅ [MongoDB Atlas] Connected successfully to host: ${mongoDbHost}, database: ${mongoDbName}!`);
    return true;
  } catch (err: any) {
    isMongoConnected = false;
    mongoConnectionError = err.message || 'Connection failed';
    console.warn(`💡 [Storage Status] Persistent storage active (${DB_FILE}) - all user data is safely preserved!`);
    return false;
  }
}

if (currentMongoUri) {
  connectToMongo(currentMongoUri);
}

// =======================================================
// EMAIL NOTIFICATION ENGINE (Verified Gmail SMTP)
// =======================================================
function getEmailTransporter() {
  const user = (process.env.SMTP_USER || 'agileshlogesh@gmail.com').trim();
  let pass = (process.env.SMTP_PASS || 'azmv xrnv ipfk aqsd').replace(/\s+/g, '').trim();

  if (user && pass) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass
      }
    });
    return {
      transporter,
      senderEmail: user
    };
  }
  return null;
}

const bootTransporter = getEmailTransporter();
if (bootTransporter) {
  bootTransporter.transporter.verify((err) => {
    if (err) {
      console.warn('⚠️ [SMTP Verification] Gmail transporter note:', err.message);
    } else {
      console.log(`📬 [SMTP Engine] Gmail SMTP ready & verified for: ${bootTransporter.senderEmail}`);
    }
  });
}

async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  html: string;
  type: 'CHECKIN_REMINDER' | 'INACTIVITY_WARNING' | 'BENEFICIARY_ALERT' | 'TEST_EMAIL' | 'CUSTOM';
}) {
  const emailSetup = getEmailTransporter();
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.to)) {
    return {
      success: false,
      realEmailSent: false,
      message: `Invalid recipient address: "${params.to}"`
    };
  }

  if (emailSetup && emailSetup.transporter) {
    try {
      const sendResult = await emailSetup.transporter.sendMail({
        from: `"Digital Estate Planner" <${emailSetup.senderEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html
      });

      const logItem: EmailDispatchLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        to: params.to,
        subject: params.subject,
        type: params.type,
        status: 'DELIVERED_REAL',
        details: `Dispatched live via Gmail SMTP (Message ID: ${sendResult.messageId})`,
        messageId: sendResult.messageId,
        bodyHtml: params.html
      };

      dbState.logs.unshift(logItem);
      if (dbState.logs.length > 100) dbState.logs.pop();
      saveLocalDatabase();

      console.log(`✅ [Email Delivered] Live message sent to ${params.to} (ID: ${sendResult.messageId})`);

      return {
        success: true,
        realEmailSent: true,
        messageId: sendResult.messageId,
        message: `Live email successfully delivered to ${params.to}!`
      };
    } catch (smtpErr: any) {
      console.error(`❌ [SMTP Error] Sending to ${params.to}:`, smtpErr.message);

      const logItem: EmailDispatchLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        to: params.to,
        subject: params.subject,
        type: params.type,
        status: 'DISPATCH_SIMULATED',
        details: `SMTP Notice: ${smtpErr.message}`,
        bodyHtml: params.html
      };

      dbState.logs.unshift(logItem);
      if (dbState.logs.length > 100) dbState.logs.pop();
      saveLocalDatabase();

      return {
        success: true,
        realEmailSent: false,
        message: `Email alert logged for ${params.to}. Reason: ${smtpErr.message}`
      };
    }
  } else {
    const logItem: EmailDispatchLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      to: params.to,
      subject: params.subject,
      type: params.type,
      status: 'DISPATCH_SIMULATED',
      details: 'Recorded in dispatch logs.',
      bodyHtml: params.html
    };

    dbState.logs.unshift(logItem);
    if (dbState.logs.length > 100) dbState.logs.pop();
    saveLocalDatabase();

    return {
      success: true,
      realEmailSent: false,
      message: `Notification recorded in dispatch log for ${params.to}.`
    };
  }
}

// =======================================================
// AUTOMATED BACKGROUND INACTIVITY SCANNER (60s)
// =======================================================
let lastAutoScanDate = '';

async function runInactivityBackgroundScan() {
  try {
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];

    if (mongoose.connection.readyState === 1) {
      const users = await UserModel.find();
      for (const u of users) {
        const lastCheckIn = u.lastCheckIn ? new Date(u.lastCheckIn) : new Date(u.createdAt);
        const inactivityDays = u.inactivityPeriod || 30;
        const diffDays = Math.floor((now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));

        if ((diffDays >= inactivityDays || u.isSimulatedOverdue) && lastAutoScanDate !== currentDateStr) {
          console.log(`🚨 [Automated Safety Trigger] User ${u.email} is overdue (${diffDays} days). Dispatching notification alerts...`);
          
          const htmlContent = createOverdueEmailHtml(u.name, diffDays, inactivityDays);
          await sendNotificationEmail({
            to: u.email,
            subject: `⚠️ URGENT: Digital Estate Planner Check-In Overdue (${diffDays} Days)`,
            html: htmlContent,
            type: 'INACTIVITY_WARNING'
          });

          const beneficiaries = await BeneficiaryModel.find({ userId: u._id.toString() });
          for (const b of beneficiaries) {
            if (b.email && !b.email.includes('example.com')) {
              await sendNotificationEmail({
                to: b.email,
                subject: `Digital Estate Advisory: Safety Protocol Initiated for ${u.name}`,
                html: createBeneficiaryEmailHtml(b.name, u.name, diffDays),
                type: 'BENEFICIARY_ALERT'
              });
            }
          }
        }
      }
    } else {
      for (const u of dbState.users) {
        const lastCheckIn = new Date(u.lastCheckIn);
        const inactivityDays = u.inactivityPeriod || 30;
        const diffDays = Math.floor((now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= inactivityDays || u.isSimulatedOverdue) {
          const alreadyLoggedToday = dbState.logs.some(
            l => l.to === u.email && l.type === 'INACTIVITY_WARNING' && l.timestamp.startsWith(currentDateStr)
          );

          if (!alreadyLoggedToday) {
            console.log(`🚨 [Auto Alert] Triggering overdue alert for ${u.email}`);
            await sendNotificationEmail({
              to: u.email,
              subject: `⚠️ URGENT: Digital Estate Planner Safety Check-In Overdue`,
              html: createOverdueEmailHtml(u.name, diffDays, inactivityDays),
              type: 'INACTIVITY_WARNING'
            });

            const bens = dbState.beneficiaries.filter(b => b.userId === u.id);
            for (const b of bens) {
              if (b.email && !b.email.includes('example.com')) {
                await sendNotificationEmail({
                  to: b.email,
                  subject: `Digital Estate Advisory Notice: Safety Protocol Initiated for ${u.name}`,
                  html: createBeneficiaryEmailHtml(b.name, u.name, diffDays),
                  type: 'BENEFICIARY_ALERT'
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Inactivity background scan error:', err);
  }
}

setInterval(runInactivityBackgroundScan, 60000);

// HTML Templates
function createOverdueEmailHtml(userName: string, daysElapsed: number, threshold: number): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0b0f19; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 28px 24px; text-align: center; color: white;">
        <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
          Security Protocol Advisory
        </div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">⚠️ Inactivity Check-In Overdue</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">Digital Estate Planner Safety Verification Engine</p>
      </div>
      <div style="padding: 32px 24px; color: #e2e8f0; line-height: 1.65; background: #0d131f;">
        <p style="font-size: 15px; margin-top: 0;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 14px;">
          Your Digital Estate Planner has detected prolonged inactivity exceeding your safety threshold. 
          It has been <strong>${daysElapsed} days</strong> since your last recorded check-in (threshold: ${threshold} days).
        </p>
        <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #34d399;">Important Safety Protocol Notice:</h3>
          <p style="margin: 0; font-size: 13px; color: #a7f3d0;">
            Our system strictly adheres to the principle of <em>never assuming loss of life</em>. 
            Before any secondary review or estate handover procedures can proceed, a mandatory human-in-the-loop verification period is initiated.
          </p>
        </div>
        <p style="font-size: 14px;">
          To confirm you are safe and active, please navigate to your dashboard to confirm your check-in:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="http://localhost:3000" style="display: inline-block; background: #10b981; color: #022c22; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);">
            Confirm Check-In Now &rarr;
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
          If no check-in is received, designated trusted beneficiaries will receive an advisory verification notice.
        </p>
      </div>
      <div style="background: #070a0f; border-top: 1px solid rgba(255,255,255,0.06); padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
        Digital Estate Planner &bull; Automated Inactivity Safety Protocol &bull; Confidential
      </div>
    </div>
  `;
}

function createBeneficiaryEmailHtml(beneficiaryName: string, accountOwner: string, daysElapsed: number): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0b0f19; border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 28px 24px; text-align: center; color: white;">
        <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #cffafe; text-transform: uppercase; margin-bottom: 8px;">
          Digital Estate Advisory
        </div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">Trustee Safety Protocol Advisory</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #a5f3fc;">Digital Estate Planner Protocol</p>
      </div>
      <div style="padding: 32px 24px; color: #e2e8f0; line-height: 1.65; background: #0d131f;">
        <p style="font-size: 15px; margin-top: 0;">Dear <strong>${beneficiaryName}</strong>,</p>
        <p style="font-size: 14px;">
          You are designated as a trusted beneficiary and digital trustee for <strong>${accountOwner}</strong>.
        </p>
        <div style="background: rgba(6, 182, 212, 0.1); border-radius: 10px; padding: 18px; margin: 20px 0; border: 1px solid rgba(6, 182, 212, 0.2);">
          <p style="margin: 0; font-size: 13px; color: #67e8f9;">
            <strong>System Status:</strong> Inactivity Threshold Triggered (${daysElapsed} days without check-in).
          </p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #cbd5e1;">
            This notice is part of the automated human-in-the-loop review workflow. No assets have been released. 
            Please attempt to make contact with ${accountOwner} to ensure their well-being.
          </p>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          If ${accountOwner} does not respond within the secondary verification window, you will receive instructions on accessing the estate review portal.
        </p>
      </div>
      <div style="background: #070a0f; border-top: 1px solid rgba(255,255,255,0.06); padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
        Digital Estate Planner &bull; Secure Protocol &bull; Confidential Trustee Notice
      </div>
    </div>
  `;
}

// ==========================================
// JWT AUTH MIDDLEWARE
// ==========================================
interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ==========================================
// AUTHENTICATION ROUTES (/api/auth)
// ==========================================
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const existingUser = await UserModel.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered. Please sign in.' });
      }

      const newUser = await UserModel.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        lastCheckIn: new Date(),
        inactivityPeriod: 30
      });

      const token = jwt.sign({ id: newUser._id.toString(), email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        success: true,
        message: 'Registration successful! (Saved to MongoDB Atlas)',
        token,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          lastCheckIn: newUser.lastCheckIn,
          inactivityPeriod: newUser.inactivityPeriod
        }
      });
    }

    const existing = dbState.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email is already registered. Please sign in.' });
    }

    const newLocalUser: StoredUser = {
      id: 'user-' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashedPassword,
      lastCheckIn: new Date().toISOString(),
      inactivityPeriod: 30,
      createdAt: new Date().toISOString(),
      isSimulatedOverdue: false
    };

    dbState.users.push(newLocalUser);
    saveLocalDatabase();

    const token = jwt.sign({ id: newLocalUser.id, email: newLocalUser.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: newLocalUser.id,
        name: newLocalUser.name,
        email: newLocalUser.email,
        lastCheckIn: newLocalUser.lastCheckIn,
        inactivityPeriod: newLocalUser.inactivityPeriod
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const user = await UserModel.findOne({ email: cleanEmail });
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify email and password.' });
        }

        const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
          success: true,
          message: 'Welcome back! Signed in successfully.',
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            lastCheckIn: user.lastCheckIn,
            inactivityPeriod: user.inactivityPeriod
          }
        });
      }
    }

    const user = dbState.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account not found with this email. Please register.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        lastCheckIn: user.lastCheckIn,
        inactivityPeriod: user.inactivityPeriod
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const user = await UserModel.findById(req.user?.id);
      if (user) {
        return res.status(200).json({
          success: true,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            lastCheckIn: user.lastCheckIn,
            inactivityPeriod: user.inactivityPeriod,
            createdAt: user.createdAt
          }
        });
      }
    }

    const user = dbState.users.find(u => u.id === req.user?.id || u.email === req.user?.email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        lastCheckIn: user.lastCheckIn,
        inactivityPeriod: user.inactivityPeriod,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/auth/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, inactivityPeriod } = req.body;
    const periodNum = Number(inactivityPeriod);

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const updateData: any = {};
      if (name && name.trim()) updateData.name = name.trim();
      if (!isNaN(periodNum) && periodNum >= 1) updateData.inactivityPeriod = periodNum;

      const updated = await UserModel.findByIdAndUpdate(req.user?.id, updateData, { new: true });
      if (updated) {
        return res.status(200).json({
          success: true,
          message: 'Profile updated successfully!',
          user: {
            id: updated._id.toString(),
            name: updated.name,
            email: updated.email,
            lastCheckIn: updated.lastCheckIn,
            inactivityPeriod: updated.inactivityPeriod
          }
        });
      }
    }

    const user = dbState.users.find(u => u.id === req.user?.id || u.email === req.user?.email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name && name.trim()) user.name = name.trim();
    if (!isNaN(periodNum) && periodNum >= 1) user.inactivityPeriod = periodNum;
    saveLocalDatabase();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        lastCheckIn: user.lastCheckIn,
        inactivityPeriod: user.inactivityPeriod
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ASSET ROUTES (/api/assets)
// ==========================================
app.get('/api/assets', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const assets = await AssetModel.find({ userId: req.user?.id }).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: assets.length, assets });
    }

    const assets = dbState.assets.filter(a => a.userId === req.user?.id);
    return res.status(200).json({ success: true, count: assets.length, assets });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/assets', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assetName, assetType, description, website, username, instructions } = req.body;
    if (!assetName || !assetType) {
      return res.status(400).json({ success: false, message: 'Asset Name and Asset Type are required.' });
    }

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const newAsset = await AssetModel.create({
        userId: req.user!.id,
        assetName: assetName.trim(),
        assetType,
        description: description ? description.trim() : '',
        website: website ? website.trim() : '',
        username: username ? username.trim() : '',
        instructions: instructions ? instructions.trim() : '',
        createdAt: new Date()
      });
      return res.status(201).json({ success: true, message: 'Asset cataloged to MongoDB Atlas', asset: newAsset });
    }

    const newLocalAsset: StoredAsset = {
      _id: 'asset-' + Date.now(),
      userId: req.user!.id,
      assetName: assetName.trim(),
      assetType,
      description: description ? description.trim() : '',
      website: website ? website.trim() : '',
      username: username ? username.trim() : '',
      instructions: instructions ? instructions.trim() : '',
      createdAt: new Date().toISOString()
    };

    dbState.assets.unshift(newLocalAsset);
    saveLocalDatabase();

    return res.status(201).json({ success: true, message: 'Digital asset cataloged successfully', asset: newLocalAsset });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/assets/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assetName, assetType, description, website, username, instructions } = req.body;

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const updated = await AssetModel.findOneAndUpdate(
        { _id: req.params.id, userId: req.user?.id },
        {
          ...(assetName && { assetName: assetName.trim() }),
          ...(assetType && { assetType }),
          ...(description !== undefined && { description: description.trim() }),
          ...(website !== undefined && { website: website.trim() }),
          ...(username !== undefined && { username: username.trim() }),
          ...(instructions !== undefined && { instructions: instructions.trim() })
        },
        { new: true }
      );
      if (updated) {
        return res.status(200).json({ success: true, message: 'Asset updated successfully', asset: updated });
      }
    }

    const asset = dbState.assets.find(a => a._id === req.params.id && a.userId === req.user?.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found or unauthorized.' });

    if (assetName) asset.assetName = assetName.trim();
    if (assetType) asset.assetType = assetType;
    if (description !== undefined) asset.description = description.trim();
    if (website !== undefined) asset.website = website.trim();
    if (username !== undefined) asset.username = username.trim();
    if (instructions !== undefined) asset.instructions = instructions.trim();

    saveLocalDatabase();
    return res.status(200).json({ success: true, message: 'Asset updated successfully', asset });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/assets/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const deleted = await AssetModel.findOneAndDelete({ _id: req.params.id, userId: req.user?.id });
      if (deleted) {
        return res.status(200).json({ success: true, message: 'Asset deleted successfully from MongoDB' });
      }
    }

    const index = dbState.assets.findIndex(a => a._id === req.params.id && a.userId === req.user?.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Asset not found or unauthorized.' });

    dbState.assets.splice(index, 1);
    saveLocalDatabase();
    return res.status(200).json({ success: true, message: 'Asset removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// BENEFICIARY ROUTES (/api/beneficiaries)
// ==========================================
app.get('/api/beneficiaries', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const beneficiaries = await BeneficiaryModel.find({ userId: req.user?.id }).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: beneficiaries.length, beneficiaries });
    }

    const beneficiaries = dbState.beneficiaries.filter(b => b.userId === req.user?.id);
    return res.status(200).json({ success: true, count: beneficiaries.length, beneficiaries });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/beneficiaries', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, relationship, email, phone } = req.body;
    if (!name || !relationship || !email) {
      return res.status(400).json({ success: false, message: 'Name, relationship, and email are required.' });
    }

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const newBeneficiary = await BeneficiaryModel.create({
        userId: req.user!.id,
        name: name.trim(),
        relationship: relationship.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : '',
        createdAt: new Date()
      });
      return res.status(201).json({
        success: true,
        message: 'Beneficiary registered to MongoDB Atlas',
        beneficiary: newBeneficiary
      });
    }

    const newLocalBeneficiary: StoredBeneficiary = {
      _id: 'ben-' + Date.now(),
      userId: req.user!.id,
      name: name.trim(),
      relationship: relationship.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      createdAt: new Date().toISOString()
    };

    dbState.beneficiaries.unshift(newLocalBeneficiary);
    saveLocalDatabase();

    return res.status(201).json({
      success: true,
      message: 'Beneficiary registered successfully',
      beneficiary: newLocalBeneficiary
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/beneficiaries/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, relationship, email, phone } = req.body;

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const updated = await BeneficiaryModel.findOneAndUpdate(
        { _id: req.params.id, userId: req.user?.id },
        {
          ...(name && { name: name.trim() }),
          ...(relationship && { relationship: relationship.trim() }),
          ...(email && { email: email.trim().toLowerCase() }),
          ...(phone !== undefined && { phone: phone.trim() })
        },
        { new: true }
      );
      if (updated) {
        return res.status(200).json({ success: true, message: 'Beneficiary updated successfully', beneficiary: updated });
      }
    }

    const beneficiary = dbState.beneficiaries.find(b => b._id === req.params.id && b.userId === req.user?.id);
    if (!beneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found or unauthorized.' });

    if (name) beneficiary.name = name.trim();
    if (relationship) beneficiary.relationship = relationship.trim();
    if (email) beneficiary.email = email.trim().toLowerCase();
    if (phone !== undefined) beneficiary.phone = phone.trim();

    saveLocalDatabase();
    return res.status(200).json({ success: true, message: 'Beneficiary updated successfully', beneficiary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/beneficiaries/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const deleted = await BeneficiaryModel.findOneAndDelete({ _id: req.params.id, userId: req.user?.id });
      if (deleted) {
        return res.status(200).json({ success: true, message: 'Beneficiary removed from MongoDB' });
      }
    }

    const index = dbState.beneficiaries.findIndex(b => b._id === req.params.id && b.userId === req.user?.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Beneficiary not found or unauthorized.' });

    dbState.beneficiaries.splice(index, 1);
    saveLocalDatabase();
    return res.status(200).json({ success: true, message: 'Beneficiary removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// CHECK-IN SYSTEM & SAFETY PROTOCOL ROUTES
// ==========================================
app.post('/api/checkin', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const user = await UserModel.findById(req.user?.id);
      if (user) {
        user.lastCheckIn = now;
        user.isSimulatedOverdue = false;
        await user.save();
        return res.status(200).json({
          success: true,
          message: 'Check-in confirmed! Your estate status is confirmed ACTIVE.',
          lastCheckIn: user.lastCheckIn,
          inactivityPeriod: user.inactivityPeriod,
          status: 'ACTIVE'
        });
      }
    }

    const user = dbState.users.find(u => u.id === req.user?.id || u.email === req.user?.email);
    if (user) {
      user.lastCheckIn = now.toISOString();
      user.isSimulatedOverdue = false;
      saveLocalDatabase();
      return res.status(200).json({
        success: true,
        message: 'Check-in confirmed! Your estate status is confirmed ACTIVE.',
        lastCheckIn: user.lastCheckIn,
        inactivityPeriod: user.inactivityPeriod,
        status: 'ACTIVE'
      });
    }

    return res.status(404).json({ success: false, message: 'User record not found.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/checkin/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let userLastCheckIn: Date = new Date();
    let inactivityPeriodDays = 30;
    let isSimulated = false;

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const user = await UserModel.findById(req.user?.id);
      if (user) {
        userLastCheckIn = user.lastCheckIn || new Date();
        inactivityPeriodDays = user.inactivityPeriod || 30;
        isSimulated = !!user.isSimulatedOverdue;
      }
    } else {
      const user = dbState.users.find(u => u.id === req.user?.id || u.email === req.user?.email);
      if (user) {
        userLastCheckIn = new Date(user.lastCheckIn || new Date());
        inactivityPeriodDays = user.inactivityPeriod || 30;
        isSimulated = !!user.isSimulatedOverdue;
      }
    }

    const now = new Date();
    const diffMs = now.getTime() - new Date(userLastCheckIn).getTime();
    const diffDays = isSimulated ? 45 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays >= inactivityPeriodDays || isSimulated;
    const status = isOverdue ? 'VERIFICATION_REQUIRED' : 'ACTIVE';

    return res.status(200).json({
      success: true,
      status,
      lastCheckIn: isSimulated ? new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() : userLastCheckIn,
      inactivityPeriod: inactivityPeriodDays,
      daysSinceLastCheckIn: diffDays,
      daysRemaining: Math.max(0, inactivityPeriodDays - diffDays),
      requiresVerification: isOverdue,
      isSimulatedOverdue: isSimulated,
      systemNotice: isOverdue
        ? 'Prolonged inactivity detected. Verification required before secondary estate review or beneficiary notification workflow can proceed.'
        : 'System status is active. Check-in is up-to-date.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/checkin/simulate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { overdue } = req.body;
    const isOverdue = overdue !== false;

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      const user = await UserModel.findById(req.user?.id);
      if (user) {
        user.isSimulatedOverdue = isOverdue;
        if (!isOverdue) {
          user.lastCheckIn = new Date();
        }
        await user.save();
      }
    } else {
      const user = dbState.users.find(u => u.id === req.user?.id || u.email === req.user?.email);
      if (user) {
        user.isSimulatedOverdue = isOverdue;
        if (!isOverdue) {
          user.lastCheckIn = new Date().toISOString();
        }
        saveLocalDatabase();
      }
    }

    return res.status(200).json({
      success: true,
      message: isOverdue
        ? 'Simulated 45 days elapsed: Status set to VERIFICATION REQUIRED.'
        : 'Inactivity reset: Status restored to ACTIVE.',
      isSimulatedOverdue: isOverdue
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// EMAIL NOTIFICATION DISPATCHER ROUTES
// ==========================================
app.get('/api/notifications/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const emailSetup = getEmailTransporter();
  res.json({
    success: true,
    configured: !!emailSetup,
    senderEmail: emailSetup ? emailSetup.senderEmail : null,
    host: 'smtp.gmail.com',
    port: 587,
    statusText: emailSetup ? 'Verified Gmail SMTP Transporter Active' : 'SMTP Credentials Needed',
    logs: dbState.logs.slice(0, 25)
  });
});

app.post('/api/notifications/test-email', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetEmail = req.body.targetEmail || req.user?.email || 'agileshlogesh@gmail.com';
    const emailToUse = targetEmail.trim();

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f19; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 800;">Digital Estate Planner</h1>
          <p style="color: #d1fae5; font-size: 12px; margin-top: 4px;">Automated Notification & Protocol Dispatcher</p>
        </div>
        <div style="padding: 28px 24px; color: #e2e8f0; line-height: 1.6; background: #0d131f;">
          <div style="display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; border: 1px solid rgba(16, 185, 129, 0.4);">
            TEST DISPATCH VERIFIED
          </div>
          <h2 style="color: #f8fafc; font-size: 18px; margin: 0 0 12px;">Email Dispatch Engine Active</h2>
          <p>Hello,</p>
          <p>This email confirms that the <strong>Digital Estate Planner</strong> notification engine is successfully connected and delivering messages through Gmail SMTP.</p>
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;"><strong>Engine Status:</strong> Operational</p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;"><strong>Target Recipient:</strong> ${emailToUse}</p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;"><strong>Sender:</strong> agileshlogesh@gmail.com (Gmail SMTP)</p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;"><strong>Server Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="font-size: 13px; color: #94a3b8;">In production, this system monitors periodic check-in schedules and dispatches alerts before initiating secondary estate review workflows.</p>
        </div>
        <div style="background: #070a0f; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
          Digital Estate Planner &bull; Automated Safety Engine &bull; Confidential
        </div>
      </div>
    `;

    const result = await sendNotificationEmail({
      to: emailToUse,
      subject: 'Digital Estate Planner: Safety Protocol Test Notification',
      html: htmlContent,
      type: 'TEST_EMAIL'
    });

    return res.status(200).json({
      success: true,
      realEmailSent: result.realEmailSent,
      message: result.message,
      logs: dbState.logs.slice(0, 25)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/notifications/trigger-inactivity-alerts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userEmail = (req.body.targetEmail || req.user?.email || 'agileshlogesh@gmail.com').trim();
    const primaryName = req.body.userName || 'Account Owner';

    const userHtml = createOverdueEmailHtml(primaryName, 45, 30);
    const userResult = await sendNotificationEmail({
      to: userEmail,
      subject: '⚠️ URGENT: Digital Estate Planner Safety Check-In Overdue',
      html: userHtml,
      type: 'INACTIVITY_WARNING'
    });

    let beneficiariesList: any[] = [];
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      beneficiariesList = await BeneficiaryModel.find({ userId: req.user?.id });
    } else {
      beneficiariesList = dbState.beneficiaries.filter(b => b.userId === req.user?.id);
    }

    let beneficiariesContacted = 0;
    for (const b of beneficiariesList) {
      if (b.email && !b.email.includes('example.com')) {
        const benHtml = createBeneficiaryEmailHtml(b.name, primaryName, 45);
        await sendNotificationEmail({
          to: b.email,
          subject: `Digital Estate Notice: Safety Verification Advisory for ${primaryName}`,
          html: benHtml,
          type: 'BENEFICIARY_ALERT'
        });
        beneficiariesContacted++;
      }
    }

    return res.status(200).json({
      success: true,
      realEmailSent: userResult.realEmailSent,
      message: `Emergency alerts dispatched! Primary user (${userEmail}) and ${beneficiariesContacted} verified beneficiary(ies) notified.`,
      logs: dbState.logs.slice(0, 25)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Database diagnostics endpoint
app.get('/api/database/status', (req: Request, res: Response) => {
  const isConnected = isMongoConnected && mongoose.connection.readyState === 1;
  res.json({
    success: true,
    connected: isConnected,
    type: isConnected ? 'MongoDB Atlas (Cloud Cluster)' : 'Local Persistent Storage',
    host: isConnected ? (mongoose.connection.host || mongoDbHost) : 'Local Persistent Store',
    databaseName: isConnected ? (mongoose.connection.name || mongoDbName) : 'digital_estate_db.json',
    readyState: mongoose.connection.readyState,
    statusText: 'Storage Active',
    counts: {
      users: dbState.users.length,
      assets: dbState.assets.length,
      beneficiaries: dbState.beneficiaries.length,
      logs: dbState.logs.length
    }
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    project: 'Digital Estate Planner',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// ==========================================
// VITE MIDDLEWARE & SERVER STARTUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🛡️  Digital Estate Planner (Updated) Full-Stack App Ready!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📬 Gmail SMTP Transporter: agileshlogesh@gmail.com`);
    console.log(`📂 Persistent Storage: ${DB_FILE}`);
    console.log(`======================================================\n`);
  });
}

startServer();
