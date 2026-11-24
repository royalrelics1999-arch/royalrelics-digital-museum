ROYALRELICS® DIGITAL EYEWEAR MUSEUM — COMPLETE WEBSITE PACKAGE

HOW TO RUN
1. Extract this ZIP.
2. Open the extracted ROYALRELICS_Digital_Museum_Final folder in VS Code.
3. Open index.html with VS Code Live Server (do not open as file://).
4. Internet is required for the Three.js CDN and Google Fonts.

IMPORTANT SETUP BEFORE PUBLISHING
1. Open app.js.
2. Find STORE_CONFIG near the top.
3. WhatsApp Business number is configured as 918308801911 (India country code +91 and the number supplied for this website).
4. Review the suggested product prices, descriptions and specifications in products.js.
5. Review and adapt Terms, Privacy, Cancellation and Shipping copy in app.js to your real operations and applicable law.
6. Check stock, product measurements, lens specifications and brand/logo permissions before taking orders.

WHAT IS INCLUDED
- All 14 uploaded product photos in assets/.
- One combined collection with Optical and Sunglasses mixed together.
- Search and filters.
- Product detail dialog.
- WhatsApp enquiry/order message generation.
- Manual payment coordination through WhatsApp; no payment gateway or card/UPI PIN collection.
- Our Story, Terms & Conditions, Privacy Policy, Order Cancellation, Shipping & Delivery.
- 3D museum with all 14 products displayed together.
- Guided Tour: Start/Pause, Previous, Next, speed selector and progress.
- Free Explore: keyboard/mouse on desktop and touch movement/drag look on mobile.

PAYMENT FLOW
Customer selects product → clicks Enquire on WhatsApp → message opens in WhatsApp → you confirm stock, final price, delivery and send your approved UPI/cash instructions personally.
This package does NOT collect or process payments online.

PRODUCT IMAGE / BRAND NOTE
Some source images visibly contain third-party logos or marks. Do not present those products as ROYALRELICS-owned branded products or sell them under another brand name unless you have the required authorization. Replace those photos with authorized, logo-free product images if needed.

PRICE NOTE
Prices in products.js are suggested display prices, not verified supplier prices. Confirm your purchase cost, margin, stock and delivery charges before publishing.

DELIVERY NOTE
The copy currently says delivery is intended for Kolhapur, based on the business scope discussed. Update it if your delivery area changes.

This is a front-end website package. It does not include an admin database, inventory sync, online payment gateway, customer login or automatic order storage.


CUSTOMER LOGIN / SIGN UP — SUPABASE SETUP REQUIRED
The website now includes email/password Login, Sign Up and Sign Out UI. Authentication becomes active only after you connect your own Supabase project.

A. Create Supabase project
1. Visit https://supabase.com/ and create/sign in to your account.
2. Create a new project named royalrelics-museum (choose a strong database password and save it privately).
3. Wait for the project to finish provisioning.
4. In the Supabase project dashboard, open Project Settings / API (or Connect). Copy the Project URL and the publishable key (or legacy anon public key). Do NOT use the service_role/secret key in browser code.

B. Add keys to the website
1. Open app.js.
2. Find STORE_CONFIG near the top.
3. Replace YOUR_SUPABASE_PROJECT_URL with your Project URL.
4. Replace YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY with the publishable/anon public key.
5. Save app.js and reload the site through Live Server.

C. Enable email sign-up
1. In Supabase Dashboard, open Authentication / Sign In & Providers.
2. Ensure Email provider is enabled.
3. For a public production website, configure the Site URL and allowed Redirect URLs to your final Netlify/custom domain.
4. Email confirmation may be enabled. If enabled, customers must click the confirmation email before signing in. Configure SMTP/custom email delivery for reliable production email delivery; otherwise provider default limits may apply.

D. Test
1. Use a real email address you control and create a test account.
2. Confirm the email if confirmation is enabled.
3. Log in, refresh the page, then test Sign Out.

SECURITY
- Only the Supabase publishable/anon key belongs in front-end code. Never paste the service_role key, database password, email SMTP password or other secrets into app.js or share them in chat.
- This current login feature authenticates customers only. It does not yet store orders, addresses, favourites or customer profiles in a database.
- Do not collect UPI PIN, OTP, card PIN or bank passwords.
- Add database tables and Row Level Security policies before storing customer data or orders.
