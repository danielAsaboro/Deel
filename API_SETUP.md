# External API Integration Setup Guide

This guide will help you set up API keys for the external deal aggregation feature.

## Overview

The platform integrates with 4 real APIs to fetch live deals:
- **Amadeus** (Flights & Hotels)
- **RapidAPI Booking.com** (Hotels)
- **Yelp** (Restaurants)
- **FakeStore** (Shopping - no auth required)

## Setup Instructions

### 1. Amadeus API (Flights & Hotels)

**Free Tier:** 10,000+ API calls/month in test environment

1. Visit [Amadeus for Developers](https://developers.amadeus.com/register)
2. Click "Register" and create an account
3. Once logged in, click "Create New App"
4. Name your app (e.g., "Deal Discovery Platform")
5. Copy your **API Key** and **API Secret**
6. Add to `.env.local`:
   ```
   AMADEUS_API_KEY=your_api_key_here
   AMADEUS_API_SECRET=your_api_secret_here
   ```

**Note:** The test environment uses `https://test.api.amadeus.com` (already configured).

### 2. RapidAPI (Booking.com Hotels)

**Free Tier:** 500-1000 requests/month

1. Visit [RapidAPI Hub](https://rapidapi.com/auth/sign-up)
2. Create an account
3. Go to [Booking.com API](https://rapidapi.com/tipsters/api/booking-com)
4. Click "Subscribe to Test" (free tier)
5. Go to the "Endpoints" tab and copy your **X-RapidAPI-Key** from the code snippet
6. Add to `.env.local`:
   ```
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```

### 3. Yelp Fusion API (Restaurants)

**Free Tier:** 500 API calls/day

1. Visit [Yelp Developers](https://www.yelp.com/developers)
2. Click "Get Started" and sign in with your Yelp account (or create one)
3. Go to [Manage App](https://www.yelp.com/developers/v3/manage_app)
4. Create a new app with any name
5. Copy your **API Key**
6. Add to `.env.local`:
   ```
   YELP_API_KEY=your_yelp_api_key_here
   ```

### 4. FakeStore API (Shopping)

**No authentication required!** This API is free and open.

## Final Setup

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your API keys in `.env.local`

3. Restart your development server:
   ```bash
   pnpm dev
   ```

4. Visit [http://localhost:3000/deals](http://localhost:3000/deals) to see live external deals!

## Rate Limits & Caching

The API route automatically caches results for 5 minutes to avoid hitting rate limits. This means:
- Multiple users can view deals without repeated API calls
- API limits are preserved
- Deals refresh every 5 minutes

## Troubleshooting

### No External Deals Showing

1. **Check API Keys:** Ensure all keys are correctly added to `.env.local`
2. **Check Console:** Open browser DevTools → Console for error messages
3. **Check Server Logs:** Look at terminal where `pnpm dev` is running
4. **Verify APIs:** Test each API individually:
   - Amadeus: Visit your dashboard at https://developers.amadeus.com/my-apps
   - RapidAPI: Check your subscription status
   - Yelp: Verify API key at https://www.yelp.com/developers/v3/manage_app

### API Errors

- **401 Unauthorized:** Invalid API key
- **403 Forbidden:** Rate limit exceeded or subscription expired
- **429 Too Many Requests:** Rate limit hit (wait or upgrade plan)

### Testing Without API Keys

The FakeStore API works without authentication. Even if other APIs fail, you'll still see shopping deals.

## API Costs

All APIs used have generous free tiers:
- Amadeus: **FREE** (10k+ calls/month)
- RapidAPI: **FREE** (500-1000 calls/month)
- Yelp: **FREE** (500 calls/day)
- FakeStore: **FREE** (unlimited)

**Total Cost: $0** for hackathon/demo usage!

## Production Considerations

For production deployment:
1. Use Amadeus production environment (change base URL)
2. Increase caching duration (10-30 minutes)
3. Consider upgrading to paid tiers for higher limits
4. Implement proper error handling and fallbacks
5. Add monitoring for API usage
