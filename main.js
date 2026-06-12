const { TelegramClient, Api } = require('telegram');
const { StoreSession } = require('telegram/sessions');
const input = require('input');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// ANSI color codes for beautiful terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

// Load environment variables
dotenv.config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phoneNumber = process.env.PHONE_NUMBER;

if (!apiId || !apiHash || !phoneNumber) {
  console.error('Error: Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Create session directory if it doesn't exist
const sessionDir = 'telegram_session';
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Create session with relative path
const session = new StoreSession(sessionDir);
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

let statusInterval;
let isShuttingDown = false;
let updateCount = 0;
let startTime = null;

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function updateStatusDisplay() {
  const now = new Date();
  const uptime = startTime ? formatUptime(now - startTime) : '0s';
  const time = formatTime(now);
  
  process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear line
  process.stdout.write(
    `${colors.cyan}●${colors.reset} ` +
    `${colors.green}Online${colors.reset} ` +
    `${colors.dim}|${colors.reset} ` +
    `Updates: ${colors.yellow}${updateCount}${colors.reset} ` +
    `${colors.dim}|${colors.reset} ` +
    `Uptime: ${colors.blue}${uptime}${colors.reset} ` +
    `${colors.dim}|${colors.reset} ` +
    `${colors.dim}${time}${colors.reset}`
  );
}

async function keepOnline() {
  try {
    await client.invoke(new Api.account.UpdateStatus({
      offline: false
    }));
    updateCount++;
    updateStatusDisplay();
  } catch (error) {
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
    console.log(`${colors.red}✗${colors.reset} Status update failed: ${error.message}`);
    updateStatusDisplay();
  }
}

async function start() {
  console.log(`${colors.cyan}➜${colors.reset} Starting Telegram client...`);
  
  try {
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => await input.text('Please enter your 2FA password: '),
      phoneCode: async () => await input.text('Please enter the code you received: '),
      onError: (err) => console.error(err),
    });
    
    console.log(`${colors.green}✓${colors.reset} Connected successfully!\n`);
    startTime = new Date();
    
    // Set status to online immediately
    await keepOnline();
    
    // Update status every 1 minute
    statusInterval = setInterval(keepOnline, 60 * 1000);
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Error starting client:`, error.message);
    if (!isShuttingDown) {
      console.log(`${colors.yellow}⏳${colors.reset} Retrying in 5 seconds...`);
      setTimeout(start, 5000);
    }
  }
}

async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  process.stdout.write('\n' + `${colors.yellow}⏳${colors.reset} Shutting down gracefully...\n`);
  
  // Clear the status update interval
  if (statusInterval) {
    clearInterval(statusInterval);
  }
  
  try {
    // Set status to offline before disconnecting
    await client.invoke(new Api.account.UpdateStatus({
      offline: true
    }));
    console.log(`${colors.green}✓${colors.reset} Status set to offline`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Error setting status to offline:`, error.message);
  }
  
  try {
    await client.disconnect();
    console.log(`${colors.green}✓${colors.reset} Disconnected from Telegram`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Error disconnecting:`, error.message);
  }
  
  process.exit(0);
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start the client
start();
