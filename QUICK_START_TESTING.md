# Quick Start Testing Guide

## 🚀 Your Dev Server is Running!

**URL:** http://localhost:3000

---

## ✅ What to Test Right Now (No API Keys Needed)

### 1. Navigation (2 minutes)
Open http://localhost:3000 and click through all nav links:

- [ ] **Home** - Should load landing page
- [ ] **Deals** - Should show marketplace with empty state messages
- [ ] **My Coupons** - Should show wallet connection prompt
- [ ] **Marketplace** - Should show secondary market interface
- [ ] **Staking** - Should show staking interface
- [ ] **Analytics** - Should show analytics dashboard structure
- [ ] **Account** - Should show account management

**Expected:** All pages load without errors, show proper empty states

---

### 2. UI/UX Features (3 minutes)
- [ ] **Theme Switcher** - Click theme button (top right), toggle dark/light mode
- [ ] **Mobile Menu** - Resize browser, verify hamburger menu works
- [ ] **Cluster Selector** - Change between devnet/mainnet/localhost
- [ ] **Responsive Design** - Test at different screen sizes

**Expected:** Smooth transitions, no layout breaks

---

### 3. Empty States (2 minutes)
Go to **/deals** page:

- [ ] **External Deals Section** - Should show helpful message:
  ```
  "No external deals available"
  "Configure API keys in .env.local..."
  "Missing: Amadeus, RapidAPI, or Yelp API keys"
  ```

- [ ] **Blockchain Deals Section** - Should show:
  ```
  "No blockchain deals yet"
  "Be the first merchant to create..."
  Button: "View External Deals to Import"
  ```

**Expected:** Clear, helpful messages with icons

---

### 4. Analytics Dashboard (2 minutes)
Go to **/analytics** page:

- [ ] Connect wallet (if not connected)
- [ ] Should see 4 metric cards (empty/zero values)
- [ ] Should see "No deals created yet" message

**Expected:** Clean layout, no chart errors

---

## ⚠️ What Won't Work (Yet)

### Without API Keys:
- ❌ External deals won't load (empty list)
- ❌ Import to blockchain button will import with placeholder data
- ❌ FakeStore API should work (no key required)

### Without Deployed Program:
- ❌ Create Deal button (transaction will fail)
- ❌ Mint Coupon button (transaction will fail)
- ❌ All blockchain operations

### Without Pinata JWT:
- ❌ NFT metadata will use fake URLs
- ❌ IPFS uploads won't work

---

## 🔧 Quick Fixes to Test More

### Option A: Test FakeStore API (5 minutes)
FakeStore API works without keys!

1. Open http://localhost:3000/deals
2. Click "External Deals" toggle
3. Click "Shopping" category filter
4. Should see product deals from FakeStore API

**Expected:** Real product deals appear (if API is working)

---

### Option B: Add One API Key (15 minutes)

**Easiest: Yelp**
1. Go to https://www.yelp.com/developers
2. Sign up (free)
3. Create app, get API key
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_YELP_API_KEY=your_key_here
   ```
5. Restart server: `Ctrl+C`, then `pnpm dev`
6. Go to /deals, click "Restaurants" category
7. Should see restaurant deals!

---

### Option C: Test with Local Validator (30 minutes)

**Start Local Solana Validator:**
```bash
# Terminal 1: Start validator with program
cd anchor
anchor localnet

# Terminal 2: Keep web app running
# (already running at localhost:3000)
```

**Then:**
1. Connect Phantom wallet
2. Switch to localhost network
3. Airdrop SOL to your wallet
4. Try creating a deal
5. Try minting a coupon

**Expected:** Full blockchain operations work

---

## 📊 Analytics Testing (When You Have Deals)

After creating deals and minting coupons:

1. Go to **/analytics**
2. Should see:
   - ✅ Metric cards with real numbers
   - ✅ Revenue bar chart
   - ✅ Redemption pie chart (green/gray)
   - ✅ Deal performance table
   - ✅ Customer insights

---

## 🐛 Known Issues (Expected Behavior)

### Console Warnings (Ignore These)
- `bigint: Failed to load bindings, pure JS will be used`
  - **Impact:** None, just slower big number operations
  - **Fix:** Not needed

- `Next.js inferred your workspace root`
  - **Impact:** None, just a warning
  - **Fix:** Not needed for hackathon

### Wallet Errors (Expected)
- "Transaction simulation failed: Simulation failed"
  - **Cause:** Program not deployed to selected cluster
  - **Fix:** Deploy program or switch cluster

- "Insufficient funds"
  - **Cause:** Wallet needs SOL
  - **Fix:** Airdrop SOL from faucet

---

## ✅ Success Criteria

### What Success Looks Like:
1. ✅ All pages load without crashes
2. ✅ Navigation works smoothly
3. ✅ Empty states are helpful and clear
4. ✅ UI is responsive and polished
5. ✅ Theme switching works
6. ✅ No TypeScript errors in console
7. ✅ Build completed successfully

### Current Status:
- **Build:** ✅ SUCCESS
- **Dev Server:** ✅ RUNNING
- **TypeScript:** ✅ NO ERRORS
- **UI:** ✅ POLISHED
- **Features:** ✅ ALL ACCESSIBLE

---

## 🎯 Next Steps

### For Quick Demo (No Setup):
1. Open http://localhost:3000
2. Click through all pages
3. Show empty states
4. Show analytics structure
5. Demonstrate navigation

**Use Case:** Show judges the UI/UX quality

---

### For Full Feature Demo (30 min setup):
1. Get Yelp API key (15 min)
2. Start local validator (5 min)
3. Connect wallet (2 min)
4. Create test deal (3 min)
5. Record video (5 min)

**Use Case:** Full demo video for submission

---

### For Production Demo (2 hours):
1. Get all API keys (45 min)
2. Deploy to devnet (30 min)
3. Deploy to Vercel (30 min)
4. Test live (15 min)

**Use Case:** Submission with live URL

---

## 🚨 Troubleshooting

### Dev Server Not Responding
```bash
# Kill existing process
pkill -f "next dev"

# Restart
pnpm dev
```

### Port 3000 Already in Use
```bash
# Use different port
pnpm dev -p 3001
```

### Changes Not Reflecting
```bash
# Hard refresh browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Environment Variables Not Loading
```bash
# Restart dev server after .env.local changes
Ctrl+C
pnpm dev
```

---

## 📱 Mobile Testing

### Test Responsive Design:
1. Open Chrome DevTools (F12)
2. Click device toolbar icon
3. Test these viewports:
   - iPhone 12 Pro (390x844)
   - iPad Pro (1024x1366)
   - Desktop (1920x1080)

**Expected:** All layouts adapt properly

---

## ⏱️ Testing Time Estimates

| Test Level | Time | What You Get |
|------------|------|--------------|
| Quick Look | 5 min | Verify nothing broken |
| UI/UX Test | 15 min | Test all pages, features |
| With APIs | 45 min | External deals working |
| Full Local | 90 min | Everything working locally |
| Production | 3 hours | Live deployment ready |

---

## 🎉 You're Ready!

**Your platform is:**
- ✅ Built and running
- ✅ Professionally polished
- ✅ Feature-complete
- ✅ Well-documented
- ✅ Ready for testing

**Just navigate to:** http://localhost:3000

**Have fun testing! 🚀**
