const mongoose = require('mongoose');
const config = require('../config');

let isConnected = false;
let useFallback = false;

// File Schema
const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  googleDriveId: { type: String, required: true },
  downloadUrl: { type: String, required: true },
  userId: { type: String, default: 'guest' },
  userType: { type: String, enum: ['guest', 'registered'], default: 'guest' },
  plan: { type: String, enum: ['free', 'paid'], default: 'free' },
  expiresAt: { type: Date, required: true },
  isPermanent: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: { type: String, enum: ['free', 'paid'], default: 'free' },
  storageUsed: { type: Number, default: 0 },
  filesCount: { type: Number, default: 0 },
  apiKey: { type: String, unique: true },
  apiRequests: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// API Database Schema (VyDB)
const vydbSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  dbName: { type: String, required: true },
  apiKey: { type: String, required: true, unique: true },
  sheetId: { type: String, required: true },
  requestCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// VyDB Data Schema (MongoDB fallback for actual data storage)
const vydbDataSchema = new mongoose.Schema({
  dbName: { type: String, required: true, index: true },
  apiKey: { type: String, index: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Chat Message Schema
const chatSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  senderType: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String, required: true },
  userId: { type: String, default: 'guest' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// API Log Schema
const apiLogSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  userId: { type: String },
  apiKey: { type: String },
  ip: { type: String },
  status: { type: Number },
  responseTime: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);
const User = mongoose.model('User', userSchema);
const VyDB = mongoose.model('VyDB', vydbSchema);
const VyDBData = mongoose.model('VyDBData', vydbDataSchema);
const Chat = mongoose.model('Chat', chatSchema);
const ApiLog = mongoose.model('ApiLog', apiLogSchema);

async function initMongoDB() {
  try {
    const uri = useFallback ? config.MONGODB_URI_FALLBACK : config.MONGODB_URI;
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ MongoDB connected to:', useFallback ? 'fallback' : 'primary');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (!useFallback) {
      console.log('🔄 Trying fallback database...');
      useFallback = true;
      return initMongoDB();
    }
    throw error;
  }
}

async function checkConnection() {
  if (!isConnected) {
    await initMongoDB();
  }
  return mongoose.connection.readyState === 1;
}

module.exports = {
  initMongoDB,
  checkConnection,
  File,
  User,
  VyDB,
  VyDBData,
  Chat,
  ApiLog,
  mongoose
};
