/**
 * Web-focused API configurations and integration templates
 * Optimized for browser-based and modern web framework usage
 */

export interface WebApiConfig {
  name: string;
  description: string;
  npmDependencies: string[];
  cdnUrls?: string[];
  envVars: Record<string, string>;
  browserSetup?: string;
  serverSetup?: string;
  reactComponent?: string;
  nextjsSetup?: string;
  vueSetup?: string;
}

export const WEB_FOCUSED_APIS: Record<string, WebApiConfig> = {
  intercom: {
    name: "Intercom",
    description: "Customer messaging for web apps",
    npmDependencies: ["react-intercom", "intercom-client"],
    cdnUrls: ["https://widget.intercom.io/widget/{app_id}"],
    envVars: {
      "NEXT_PUBLIC_INTERCOM_APP_ID": "<your-workspace-id>",
      "INTERCOM_ACCESS_TOKEN": "<server-side-token>"
    },
    browserSetup: `
// Add to your HTML or React App.tsx
window.intercomSettings = {
  api_base: "https://api.intercom.io",
  app_id: process.env.NEXT_PUBLIC_INTERCOM_APP_ID,
  user_id: user.id,
  name: user.name,
  email: user.email,
  created_at: Math.floor(user.createdAt / 1000),
  custom_launcher_selector: '.intercom-launcher'
};

// Load Intercom widget
(function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/' + process.env.NEXT_PUBLIC_INTERCOM_APP_ID;var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
`,
    reactComponent: `
import { useEffect } from 'react';
import { IntercomProvider, useIntercom } from 'react-use-intercom';

export const IntercomChat: React.FC = () => {
  const { boot, shutdown, update } = useIntercom();

  useEffect(() => {
    boot({
      userId: user.id,
      email: user.email,
      name: user.name,
      customLauncherSelector: '.intercom-launcher'
    });
    
    return () => shutdown();
  }, [boot, shutdown]);

  return null;
};

// Wrap your app with IntercomProvider
export const App = () => (
  <IntercomProvider appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID}>
    <IntercomChat />
    {/* Your app */}
  </IntercomProvider>
);
`,
    nextjsSetup: `
// pages/_app.tsx or app/layout.tsx
import { IntercomProvider } from 'react-use-intercom';

const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID!;

export default function RootLayout({ children }) {
  return (
    <IntercomProvider appId={INTERCOM_APP_ID} autoBoot>
      {children}
    </IntercomProvider>
  );
}
`
  },

  stripe: {
    name: "Stripe",
    description: "Payment processing for web",
    npmDependencies: ["@stripe/stripe-js", "@stripe/react-stripe-js", "stripe"],
    envVars: {
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_...",
      "STRIPE_SECRET_KEY": "sk_test_...",
      "STRIPE_WEBHOOK_SECRET": "whsec_..."
    },
    browserSetup: `
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
`,
    reactComponent: `
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CheckoutForm: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card
    });

    if (!error) {
      // Send paymentMethod.id to your server
      await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id })
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>Pay</button>
    </form>
  );
};

export const StripeCheckout = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
);
`,
    serverSetup: `
// API Route: /api/payment
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export async function handlePayment(paymentMethodId: string, amount: number) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // in cents
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never'
    }
  });
  
  return paymentIntent;
}
`
  },

  segment: {
    name: "Segment",
    description: "Customer data platform for web analytics",
    npmDependencies: ["@segment/analytics-next"],
    cdnUrls: ["https://cdn.segment.com/analytics.js/v1/{write_key}/analytics.min.js"],
    envVars: {
      "NEXT_PUBLIC_SEGMENT_WRITE_KEY": "<your-write-key>"
    },
    browserSetup: `
import { AnalyticsBrowser } from '@segment/analytics-next';

const analytics = AnalyticsBrowser.load({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY!
});

// Track page views
analytics.page();

// Identify users
analytics.identify('user-id', {
  email: 'user@example.com',
  name: 'John Doe'
});

// Track events
analytics.track('Button Clicked', {
  label: 'Sign Up',
  category: 'Conversion'
});
`,
    reactComponent: `
import { useEffect } from 'react';
import { AnalyticsBrowser } from '@segment/analytics-next';

const useAnalytics = () => {
  useEffect(() => {
    const analytics = AnalyticsBrowser.load({
      writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY!
    });

    // Track page view
    analytics.page();

    // Make analytics available globally
    window.analytics = analytics;
  }, []);
};

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAnalytics();
  return <>{children}</>;
};
`
  },

  sentry: {
    name: "Sentry",
    description: "Error tracking for web applications",
    npmDependencies: ["@sentry/nextjs", "@sentry/react", "@sentry/browser"],
    envVars: {
      "NEXT_PUBLIC_SENTRY_DSN": "https://key@org.ingest.sentry.io/project",
      "SENTRY_ORG": "your-org",
      "SENTRY_PROJECT": "your-project"
    },
    nextjsSetup: `
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true
    })
  ]
});
`,
    reactComponent: `
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});

// Error Boundary Component
export const ErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => <>{children}</>,
  {
    fallback: ({ error }) => <div>An error occurred: {error.message}</div>,
    showDialog: true
  }
);
`
  },

  googleAnalytics: {
    name: "Google Analytics",
    description: "Web analytics by Google",
    npmDependencies: ["@gtag/react", "react-ga4"],
    cdnUrls: [
      "https://www.googletagmanager.com/gtag/js?id={measurement_id}"
    ],
    envVars: {
      "NEXT_PUBLIC_GA_MEASUREMENT_ID": "G-XXXXXXXXXX"
    },
    browserSetup: `
// Add to <head>
<script async src={\`https://www.googletagmanager.com/gtag/js?id=\${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}\`}></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
</script>
`,
    reactComponent: `
import ReactGA from 'react-ga4';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

ReactGA.initialize(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!);

export const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ 
      hitType: "pageview", 
      page: location.pathname + location.search 
    });
  }, [location]);

  return null;
};

// Track events
export const trackEvent = (category: string, action: string, label?: string) => {
  ReactGA.event({
    category,
    action,
    label
  });
};
`
  },

  posthog: {
    name: "PostHog",
    description: "Product analytics platform",
    npmDependencies: ["posthog-js", "posthog-js/react"],
    envVars: {
      "NEXT_PUBLIC_POSTHOG_KEY": "<your-project-api-key>",
      "NEXT_PUBLIC_POSTHOG_HOST": "https://app.posthog.com"
    },
    reactComponent: `
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// Initialize PostHog
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug();
    }
  });
}

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => (
  <PostHogProvider client={posthog}>
    {children}
  </PostHogProvider>
);

// Custom hook for tracking
export const usePostHog = () => {
  return {
    track: (event: string, properties?: Record<string, any>) => {
      posthog.capture(event, properties);
    },
    identify: (userId: string, properties?: Record<string, any>) => {
      posthog.identify(userId, properties);
    }
  };
};
`
  },

  mixpanel: {
    name: "Mixpanel",
    description: "Product analytics for web and mobile",
    npmDependencies: ["mixpanel-browser"],
    envVars: {
      "NEXT_PUBLIC_MIXPANEL_TOKEN": "<your-project-token>"
    },
    browserSetup: `
import mixpanel from 'mixpanel-browser';

mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!, {
  debug: process.env.NODE_ENV === 'development',
  track_pageview: true,
  persistence: 'localStorage'
});

// Track user
mixpanel.identify(userId);
mixpanel.people.set({
  $email: email,
  $name: name
});

// Track events
mixpanel.track('Sign Up', {
  plan: 'Premium'
});
`,
    reactComponent: `
import mixpanel from 'mixpanel-browser';
import { createContext, useContext, useEffect } from 'react';

mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!);

const MixpanelContext = createContext(mixpanel);

export const MixpanelProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    mixpanel.track_pageview();
  }, []);

  return (
    <MixpanelContext.Provider value={mixpanel}>
      {children}
    </MixpanelContext.Provider>
  );
};

export const useMixpanel = () => useContext(MixpanelContext);
`
  },

  auth0: {
    name: "Auth0",
    description: "Authentication and authorization platform",
    npmDependencies: ["@auth0/nextjs-auth0", "@auth0/auth0-react"],
    envVars: {
      "AUTH0_SECRET": "<generated-secret>",
      "AUTH0_BASE_URL": "http://localhost:3000",
      "AUTH0_ISSUER_BASE_URL": "https://your-domain.auth0.com",
      "AUTH0_CLIENT_ID": "<your-client-id>",
      "AUTH0_CLIENT_SECRET": "<your-client-secret>"
    },
    nextjsSetup: `
// pages/api/auth/[...auth0].ts
import { handleAuth } from '@auth0/nextjs-auth0';

export default handleAuth();

// pages/_app.tsx
import { UserProvider } from '@auth0/nextjs-auth0/client';

export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}
`,
    reactComponent: `
import { useUser } from '@auth0/nextjs-auth0/client';

export const Profile = () => {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return user ? (
    <div>
      <img src={user.picture} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <a href="/api/auth/logout">Logout</a>
    </div>
  ) : (
    <a href="/api/auth/login">Login</a>
  );
};
`
  },

  clerk: {
    name: "Clerk",
    description: "User management and authentication",
    npmDependencies: ["@clerk/nextjs", "@clerk/react"],
    envVars: {
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_...",
      "CLERK_SECRET_KEY": "sk_test_..."
    },
    nextjsSetup: `
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
`,
    reactComponent: `
import { SignIn, SignUp, UserButton, useUser } from '@clerk/nextjs';

export const AuthComponent = () => {
  const { user, isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <div>
        <h1>Welcome, {user.firstName}!</h1>
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return <SignIn />;
};
`
  }
};

// Helper function to get web-optimized APIs
export function getWebOptimizedApis(framework?: string): string[] {
  const baseApis = ['intercom', 'stripe', 'segment', 'sentry'];
  
  if (framework === 'nextjs' || framework === 'react') {
    return [...baseApis, 'clerk', 'posthog'];
  } else if (framework === 'vue' || framework === 'angular') {
    return [...baseApis, 'auth0', 'mixpanel'];
  }
  
  return baseApis;
}

// Generate framework-specific integration code
export function generateFrameworkIntegration(
  api: string,
  framework: 'react' | 'nextjs' | 'vue' | 'angular'
): string {
  const config = WEB_FOCUSED_APIS[api];
  if (!config) return '';

  switch (framework) {
    case 'nextjs':
      return config.nextjsSetup || config.reactComponent || config.browserSetup || '';
    case 'react':
      return config.reactComponent || config.browserSetup || '';
    case 'vue':
      return config.vueSetup || config.browserSetup || '';
    case 'angular':
      // Angular-specific setup would go here
      return config.browserSetup || '';
    default:
      return config.browserSetup || '';
  }
}