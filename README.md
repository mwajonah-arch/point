# Medipoint Point of Sale System

A React-based Point of Sale system for pharmacies and medical stores, integrated with Supabase and M-Pesa payment processing.

## Features
- Inventory management
- Sales processing
- M-Pesa payment integration
- Staff management
- Sales reporting
- Real-time data synchronization across devices

## Setup Instructions

### 1. Configure Supabase
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your Project URL and anon public key from Settings > API
3. Update `config.js` with your Supabase credentials:
   ```javascript
   window.SUPABASE_URL = "your-project-url.supabase.co";
   window.SUPABASE_ANON_KEY = "your-anon-public-key";
   ```

### 2. Setup M-Pesa (Optional)
To enable M-Pesa payments, you need to:
1. Create a Safaricom Daraja developer account
2. Get your consumer key and secret
3. Set these as secrets in your Supabase project:
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_SHORTCODE` (your Till Number or Paybill)
   - `MPESA_PASSKEY`
   - `MPESA_CALLBACK_URL` (your Supabase function URL)

### 3. Database Setup
Run the SQL in `supabase/migrations/20240101_create_mpesa_table.sql` to create the M-Pesa transactions table.

### 4. Deploy Supabase Functions
Deploy the M-Pesa functions to your Supabase project:
- `supabase-functions/mpesa-stk-push`
- `supabase-functions/mpesa-callback`
- `supabase-functions/mpesa-check-status`

You can deploy them using:
```bash
supabase functions deploy mpesa-stk-push
supabase functions deploy mpesa-callback
supabase functions deploy mpesa-check-status
```

### 5. Run the Application
The application is designed to run in a web browser without a build step. To avoid CORS issues when making requests to Supabase, you need to serve the files through a web server.

#### Option 1: Using Python (if available)
```bash
python -m http.server 3000
```
Then visit http://localhost:3000

#### Option 2: Using Node.js http-server
```bash
npx http-server -p 3000
```
Then visit http://localhost:3000

#### Option 3: Using Live Server (VS Code extension)
If you use VS Code, install the "Live Server" extension and click "Go Live"

## Project Structure
- `index.html` - Main HTML file
- `config.js` - Supabase configuration (update with your credentials)
- `app.js` - Main React application
- `/supabase-functions` - M-Pesa payment processing functions
- `/supabase/migrations` - Database schema

## How It Works
1. The app connects to your Supabase database for data storage
2. Real-time subscriptions keep data in sync across all connected devices
3. M-Pesa payments are processed through Safaricom's Daraja API via Supabase Edge Functions
4. All data is stored securely in your Supabase project

## Default Login Credentials
After setting up your Supabase database with the default data:
- Admin: PIN `1234`
- Cashier Grace: PIN `1111`
- Cashier Kevin: PIN `2222`

## Customization
- Modify `DEFAULT_INVENTORY` in `app.js` to change initial products
- Modify `DEFAULT_STAFF` in `app.js` to add/remove staff
- Modify `DEFAULT_SETTINGS` in `app.js` to change pharmacy name, currency, or tax rate

## Browser Support
Works in all modern browsers (Chrome, Firefox, Safari, Edge)
Requires JavaScript and ES6 module support.

## Notes
- The first time you run the app, it will create default data in your Supabase database
- Data persists in your Supabase project, so closing the browser won't lose your data
- Multiple devices can connect to the same instance for real-time collaboration