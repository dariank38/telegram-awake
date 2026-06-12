# Telegram Awake

Keep your Telegram account online 24/7 using GramJS.

## Setup

1. Get API credentials from [my.telegram.org](https://my.telegram.org)
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your credentials:
   ```
   API_ID=your_api_id
   API_HASH=your_api_hash
   PHONE_NUMBER=your_phone_number
   ```

## Usage

```bash
npm start
```

First run: Enter the verification code and 2FA password (if enabled). Session is saved locally, so you only authenticate once.

The app updates your online status every minute. Press Ctrl+C to gracefully disconnect.

## Troubleshooting

- Delete `telegram_session/` folder to re-authenticate
- Requires Node.js 18+
