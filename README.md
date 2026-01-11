# Notice
This app is purely AI generated, I wouldn't really trust it with anything. I just got sick of the shit that is out there.

# Nutrition Tracker

A full-stack nutrition tracker that stores ingredients, builds recipes, and logs intake. Barcode scanning uses the browser camera via the `BarcodeDetector` API with a manual fallback.

## Features
- Ingredient library with barcode support
- Recipe builder with nutrition totals per serving
- Intake log with daily macro totals
- Everything stored in a database (SQLite by default)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
3. Initialize the database:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000`.

## Enable HTTPS for barcode scanning on phones
Mobile browsers require HTTPS for camera access when using an IP address. Generate a local self-signed cert, then enable HTTPS in `.env`.

1. Generate a self-signed certificate (include your LAN IP for phones):
   ```bash
   HOST_IP=192.168.1.8 ./scripts/generate-cert.sh
   ```
2. Update `.env`:
   ```bash
   HTTPS=true
   SSL_KEY_PATH=certs/localhost-key.pem
   SSL_CERT_PATH=certs/localhost-cert.pem
   ```
3. Start the server and visit:
   - `https://localhost:3000`
   - `https://192.168.1.8:3000` (accept the browser warning)

## Switching databases
This app uses Prisma, so you can swap SQLite for PostgreSQL, MySQL, or other supported providers.

1. Update `prisma/schema.prisma` with the new provider.
2. Update `DATABASE_URL` in `.env`.
3. Run `npx prisma migrate dev` again.

## Notes
- Barcode scanning requires a secure context (`https` or `http://localhost`).
- If the browser does not support `BarcodeDetector`, use the barcode input field manually.

## Barcode lookup providers
Barcode lookup defaults to Open Food Facts when no API keys are configured. Add keys to `.env` to enable USDA or Nutritionix.

- `USDA_API_KEY` for FoodData Central (barcode search)
- `NUTRITIONIX_APP_ID` and `NUTRITIONIX_APP_KEY`

## CLI barcode lookup
Use the CLI helper to test lookup results directly against the providers.

```bash
npm run lookup:barcode -- 012345678905
npm run lookup:barcode -- 012345678905 --provider usda
```
