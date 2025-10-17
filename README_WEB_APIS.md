# TypeScript Web API Integration Guide

Complete TypeScript implementation focused on modern web APIs and frameworks like React, Next.js, Vue, and Angular.

## 🚀 Quick Start for Web Projects

```bash
# Navigate to TypeScript folder
cd typescript

# Install dependencies
npm install

# Run integration with git operations
npx ts-node integrateAndCommit.ts https://github.com/vercel/next.js intercom stripe segment --framework nextjs

# Auto-approve for CI/CD
npx ts-node integrateAndCommit.ts https://github.com/user/repo intercom stripe --auto --web-apis
```

## 🌐 Web-Focused APIs

### Tier 1: Essential Web APIs
| API | Description | Best For |
|-----|-------------|----------|
| **Intercom** | Customer messaging & support | SaaS, E-commerce |
| **Stripe** | Payment processing | Any app with payments |
| **Segment** | Customer data platform | Analytics tracking |
| **Sentry** | Error tracking & monitoring | Production apps |

### Tier 2: Authentication & Analytics
| API | Description | Best For |
|-----|-------------|----------|
| **Auth0** | Authentication platform | Enterprise auth |
| **Clerk** | Modern user management | Next.js/React apps |
| **PostHog** | Product analytics | Feature tracking |
| **Mixpanel** | Event analytics | User behavior |
| **Google Analytics** | Web analytics | Traffic analysis |

## 📦 Framework-Specific Integration

### Next.js Integration

```bash
# Full Next.js integration with web APIs
npx ts-node integrateAndCommit.ts \
  https://github.com/your/nextjs-app \
  intercom stripe clerk sentry \
  --framework nextjs \
  --auto
```

Generated structure:
```
integrations/
├── intercomIntegration.tsx    # React component with hooks
├── stripeIntegration.tsx      # Payment components
├── clerkIntegration.tsx       # Auth components
├── sentryIntegration.tsx      # Error boundary
├── integrationDemo.tsx        # Usage examples
└── index.ts                   # Barrel exports
```

### React App Integration

```bash
npx ts-node integrateAndCommit.ts \
  https://github.com/your/react-app \
  segment posthog stripe \
  --framework react
```

### Vue.js Integration

```bash
npx ts-node integrateAndCommit.ts \
  https://github.com/your/vue-app \
  auth0 mixpanel intercom \
  --framework vue
```

## 🔥 Real-World Examples

### 1. E-Commerce Site (Next.js)

```typescript
// Command
npx ts-node integrateAndCommit.ts \
  https://github.com/vercel/commerce \
  stripe intercom segment sentry \
  --framework nextjs --auto

// Generated: integrations/stripeIntegration.tsx
import { Elements, CardElement, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const CheckoutForm: React.FC = () => {
  const stripe = useStripe();
  // ... complete Stripe checkout implementation
};

// Generated: integrations/intercomIntegration.tsx
import { IntercomProvider, useIntercom } from 'react-use-intercom';

export const CustomerSupport = () => {
  const { boot, show } = useIntercom();
  // ... Intercom chat widget setup
};
```

### 2. SaaS Dashboard (React)

```typescript
// Command
npx ts-node integrateAndCommit.ts \
  https://github.com/your/saas-dashboard \
  clerk posthog stripe segment \
  --framework react

// Generated: integrations/clerkIntegration.tsx
import { ClerkProvider, SignIn, UserButton } from '@clerk/react';

export const AuthProvider = ({ children }) => (
  <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_KEY}>
    {children}
  </ClerkProvider>
);
```

### 3. Marketing Site (Vue)

```typescript
// Command
npx ts-node integrateAndCommit.ts \
  https://github.com/your/marketing-site \
  googleAnalytics mixpanel intercom \
  --framework vue

// Generated: integrations/analyticsIntegration.js
import mixpanel from 'mixpanel-browser';
import VueGtag from 'vue-gtag';

export const setupAnalytics = (app) => {
  mixpanel.init(process.env.VUE_APP_MIXPANEL_TOKEN);
  app.use(VueGtag, {
    config: { id: process.env.VUE_APP_GA_ID }
  });
};
```

## 🎯 API Implementation Details

### Intercom (Customer Messaging)

```typescript
// Browser Setup
window.intercomSettings = {
  api_base: "https://api.intercom.io",  // Correct URL
  app_id: process.env.NEXT_PUBLIC_INTERCOM_APP_ID,
  user_id: user.id,
  email: user.email
};

// React Component
import { IntercomProvider, useIntercom } from 'react-use-intercom';

const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID!;

export const App = () => (
  <IntercomProvider appId={INTERCOM_APP_ID} autoBoot>
    <YourApp />
  </IntercomProvider>
);
```

### Stripe (Payments)

```typescript
// Client-side
import { loadStripe } from '@stripe/stripe-js';
const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Server-side (API route)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd'
});
```

### Segment (Analytics)

```typescript
import { AnalyticsBrowser } from '@segment/analytics-next';

const analytics = AnalyticsBrowser.load({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY!
});

// Track events
analytics.track('Product Viewed', {
  productId: '123',
  price: 99.99
});

// Identify users
analytics.identify(userId, { email, name });
```

## 🔧 CLI Options

### TypeScript-Specific Options

```bash
npx ts-node integrateAndCommit.ts <repo> <apis...> [options]

Options:
  --framework <name>   Target framework (react|nextjs|vue|angular|express)
  --web-apis          Focus on browser-compatible APIs
  --auto              Auto-approve changes
  --no-push           Don't push to remote
  --keep-clone        Keep cloned repository
  --no-config         Use env vars only
```

### Examples

```bash
# Next.js e-commerce site
npx ts-node integrateAndCommit.ts \
  https://github.com/vercel/commerce \
  stripe intercom segment \
  --framework nextjs --auto

# React SaaS app
npx ts-node integrateAndCommit.ts \
  https://github.com/your/app \
  clerk posthog stripe \
  --framework react --web-apis

# Vue marketing site
npx ts-node integrateAndCommit.ts \
  https://github.com/your/site \
  googleAnalytics mixpanel \
  --framework vue
```

## 🏗️ Architecture

### File Structure
```
typescript/
├── integrateAndCommit.ts      # Main CLI with git operations
├── codebaseApiIntegrator.ts   # Core integration logic
├── webApiIntegrations.ts      # Web-specific configs
├── gitIntegration.ts          # Git operations
├── configLoader.ts            # Secure config management
└── package.json               # Dependencies
```

### Integration Flow
1. **Clone** → Repository cloned to temp directory
2. **Analyze** → Detect TypeScript, framework, web app
3. **Generate** → Create framework-specific integrations
4. **Review** → Show changes summary
5. **Approve** → Interactive approval (or --auto)
6. **Commit** → Create git commit
7. **Push** → Push to new branch
8. **PR** → Ready for pull request

## 🔐 Environment Variables

### Development (.env.local)
```bash
# Public keys (exposed to browser)
NEXT_PUBLIC_INTERCOM_APP_ID=your_app_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SEGMENT_WRITE_KEY=your_write_key
NEXT_PUBLIC_SENTRY_DSN=https://...@ingest.sentry.io/...

# Server-only keys
STRIPE_SECRET_KEY=sk_test_...
INTERCOM_ACCESS_TOKEN=your_token
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production
Use your platform's secret management:
- Vercel: Environment Variables
- Netlify: Environment Variables
- AWS: Secrets Manager
- Heroku: Config Vars

## 📊 Workflow Comparison

### Python vs TypeScript

| Feature | Python | TypeScript |
|---------|--------|------------|
| **Target** | Backend/APIs | Web/Frontend |
| **Frameworks** | FastAPI, Flask | Next.js, React, Vue |
| **APIs Focus** | Data/ML APIs | Web/Browser APIs |
| **Package Manager** | pip | npm/yarn |
| **Config Format** | .env | .env.local |
| **Best For** | Server-side | Client-side |

## 🚦 Complete Example Workflow

```bash
# 1. Setup
cd typescript
npm install
cp ../config.example.json ../config.secret.json
# Add your OpenAI key to config.secret.json

# 2. Run integration
npx ts-node integrateAndCommit.ts \
  https://github.com/vercel/next-learn \
  intercom stripe segment sentry \
  --framework nextjs

# 3. Review changes
# You'll see:
# 📋 INTEGRATION CHANGES SUMMARY
# 📁 Files to be created (8)
# 📦 Dependencies to add (6)
# 🔐 Environment variables (10)

# 4. Approve
# Choose: 1. 👍 Approve and commit

# 5. Success!
# ✓ Changes committed and pushed
# ✓ Branch: api-integrations-20250117-150000
# 📢 Next: Create PR on GitHub
```

## 🐛 Troubleshooting

### TypeScript Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Framework Not Detected
```bash
# Manually specify framework
--framework nextjs
--framework react
--framework vue
```

### Web APIs Not Loading
```bash
# Use the web-apis flag
--web-apis
```

## 🎉 Success Metrics

After running the integration:
- ✅ All TypeScript types included
- ✅ Framework-specific components generated
- ✅ Browser-compatible code for web APIs
- ✅ Proper environment variable setup
- ✅ Git commit and push ready
- ✅ Pull request template provided

## 📚 Resources

- [Intercom Docs](https://developers.intercom.com)
- [Stripe React](https://stripe.com/docs/stripe-js/react)
- [Segment TypeScript](https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/)
- [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Clerk Next.js](https://clerk.com/docs/nextjs/get-started)