# Codebase API Integrator - TypeScript Version

A TypeScript implementation of the Codebase API Integrator that analyzes GitHub repositories and automatically generates API integration code.

## Features

- 🔍 **Automatic Language Detection**: Detects TypeScript, JavaScript, and other languages
- 🎯 **Framework Awareness**: Recognizes Next.js, React, Express, NestJS, and more
- 🌐 **Web App Support**: Special handling for browser-based APIs like Intercom
- 📦 **Extended API Support**: Includes Stripe, Twilio, Segment, and more JavaScript-focused APIs
- 🔧 **TypeScript Native**: Generates proper TypeScript code with types and interfaces

## Installation

```bash
# Navigate to the typescript folder
cd typescript

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

## Usage

### Interactive Mode (Recommended)

```bash
npm run test
```

This will:
1. Prompt for a GitHub repository URL
2. Let you select which APIs to integrate
3. Analyze the codebase
4. Generate integration code tailored to the repository

### Quick Test Mode

```bash
npm run test:quick
```

Provides pre-configured test scenarios for common frameworks.

### Validate API Configurations

```bash
npm run validate
```

Shows which API configurations are verified and which need updating.

### Command Line Usage

```bash
# Build the TypeScript code
npm run build

# Run with Node
node dist/testIntegrator.js

# Or use ts-node directly
npx ts-node testIntegrator.ts
```

## API Configurations

### ✅ Verified APIs (Work out-of-the-box)

| API | Description | Required Credentials |
|-----|-------------|---------------------|
| **OpenAI** | Language models | `OPENAI_API_KEY` |
| **Stripe** | Payment processing | Secret key, publishable key |
| **Twilio** | SMS, Voice, Video | Account SID, auth token, phone |
| **Segment** | Customer data platform | Write key |
| **Intercom** | Customer messaging | App ID, access token |
| **Sentry** | Error tracking | DSN |
| **ElevenLabs** | Text-to-speech | API key, voice ID |

### ⚠️ APIs Needing Configuration

- **Senso**: Update `SENSO_BASE_URL` with actual endpoint
- **Airia**: Update `AIRIA_BASE_URL` with actual endpoint
- **TrueFoundry**: Update `TRUEFOUNDRY_ENDPOINT` with your model URL

## Intercom Integration Example

The TypeScript version includes proper Intercom support for both web and server environments:

### Web/Browser Setup
```javascript
// Added to your HTML/React app
window.intercomSettings = {
  api_base: "https://api-iam.intercom.io",
  app_id: "YOUR_APP_ID",
  user_id: currentUser.id,
  name: currentUser.name,
  email: currentUser.email
};
```

### Server-Side Setup
```typescript
import Intercom from 'intercom-client';
const client = new Intercom.Client({ 
  token: process.env.INTERCOM_ACCESS_TOKEN 
});
```

## Example Integrations

### Next.js with Web APIs
```bash
npx ts-node testIntegrator.ts
# Select: https://github.com/vercel/next-learn
# APIs: intercom, segment, stripe, sentry
```

### Express with Data APIs
```bash
npx ts-node testIntegrator.ts
# Select: https://github.com/expressjs/express
# APIs: openai, snowflake, redpanda
```

## Output Structure

```
test_output_[timestamp]/
├── integrations/
│   ├── index.ts              # Export barrel file
│   ├── intercomIntegration.ts # Intercom integration
│   ├── stripeIntegration.ts  # Stripe integration
│   └── integrationDemo.ts    # Usage examples
├── .env.example              # Environment variables
├── package_additions.json    # NPM dependencies to add
├── INTEGRATION_NOTES.md     # Integration documentation
└── SETUP.md                  # Setup instructions for web APIs
```

## TypeScript-Specific Features

1. **Type Safety**: All generated code includes proper TypeScript types
2. **Interface Definitions**: API responses and configs have interfaces
3. **Framework Detection**: Recognizes TypeScript projects and frameworks
4. **Web vs Server**: Generates appropriate code for browser or Node.js
5. **Modern Syntax**: Uses ES2020+ features with proper transpilation

## Differences from Python Version

| Feature | Python Version | TypeScript Version |
|---------|---------------|-------------------|
| **Intercom** | Basic support | Full web + server support |
| **Type Safety** | Runtime checking | Compile-time types |
| **Web APIs** | Limited | Full browser support |
| **Package Manager** | pip | npm/yarn |
| **Frameworks** | FastAPI, Flask | Next.js, Express, NestJS |

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev testIntegrator.ts

# Clean build artifacts
npm run clean
```

## Troubleshooting

### TypeScript Compilation Errors
```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
npm run clean && npm run build
```

### Missing Dependencies
```bash
# Install all dependencies
npm install

# Or install specific ones
npm install openai axios dotenv
```

### API Configuration Issues
```bash
# Validate configurations
npm run validate

# Check environment variables
node -e "console.log(process.env.OPENAI_API_KEY ? '✓ Key set' : '✗ Key missing')"
```

## Contributing

The TypeScript version is designed to be more web-friendly and includes:
- Better browser API support
- TypeScript type definitions
- Modern JavaScript patterns
- Framework-specific optimizations

Feel free to add more APIs or improve the integration logic!