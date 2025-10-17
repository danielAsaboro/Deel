# Vercel Environment Variables Setup

After deployment, you need to configure environment variables in Vercel dashboard:

## Required Variables

Navigate to: https://vercel.com/your-project/settings/environment-variables

Add these variables:

```
NEXT_PUBLIC_GATEWAY_API_KEY=01KA0DY5XDK2V0RK7VX7GN7TKJ
```

## Optional Variables (App works without these)

```
NEXT_PUBLIC_AMADEUS_API_KEY=
NEXT_PUBLIC_AMADEUS_API_SECRET=
NEXT_PUBLIC_RAPIDAPI_KEY=
NEXT_PUBLIC_YELP_API_KEY=
NEXT_PUBLIC_PINATA_JWT=
```

## Steps

1. Go to your Vercel project dashboard
2. Click "Settings" tab
3. Click "Environment Variables" in sidebar
4. Add the GATEWAY API KEY (required)
5. Click "Redeploy" to apply changes

Note: External API keys are optional - the app has a working FakeStore API integration that requires no keys.
