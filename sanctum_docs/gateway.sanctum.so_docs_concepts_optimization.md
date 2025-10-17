# Source: https://gateway.sanctum.so/docs/concepts/optimization

**Fetched:** 2025-10-28 11:41:53

---

[Skip to main content](https://gateway.sanctum.so/docs/concepts/optimization#content-area)
[Sanctum Gateway Docs home page![light logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/light.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=ca03304d0aa68f52c6994cbbfbde4fe4)![dark logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/dark.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=537b4693ba9d11b0543b118bdec9d400)](https://gateway.sanctum.so/docs)
Search...
⌘K
  * Support
  * [Dashboard](https://gateway.sanctum.so/dashboard)
  * [Dashboard](https://gateway.sanctum.so/dashboard)


Search...
Navigation
Concepts
Optimization
[Docs](https://gateway.sanctum.so/docs)
##### Intro
  * [Sanctum Gateway](https://gateway.sanctum.so/docs)


##### Getting Started
  * [Quickstart](https://gateway.sanctum.so/docs/quickstart)
  * [Delivery Methods](https://gateway.sanctum.so/docs/delivery-methods)
  * [Project Parameters](https://gateway.sanctum.so/docs/parameters)
  * [Gateway Endpoints](https://gateway.sanctum.so/docs/endpoints)


##### Concepts
  * [Builder](https://gateway.sanctum.so/docs/concepts/builder)
  * [Delivery](https://gateway.sanctum.so/docs/concepts/delivery)
  * [Observability](https://gateway.sanctum.so/docs/concepts/observability)
  * [Optimization](https://gateway.sanctum.so/docs/concepts/optimization)


##### Misc
  * [Tip Accounts](https://gateway.sanctum.so/docs/misc/tip-accounts)
  * [Rate Limits](https://gateway.sanctum.so/docs/misc/rate-limits)
  * [Press Kit](https://gateway.sanctum.so/docs/misc/press-kit)


On this page
  * [Optimization involves:](https://gateway.sanctum.so/docs/concepts/optimization#optimization-involves%3A)
  * [Encoding Information](https://gateway.sanctum.so/docs/concepts/optimization#encoding-information)
  * [Request and Response Structure](https://gateway.sanctum.so/docs/concepts/optimization#request-and-response-structure)
  * [Request Example](https://gateway.sanctum.so/docs/concepts/optimization#request-example)
  * [Response](https://gateway.sanctum.so/docs/concepts/optimization#response)
  * [Self Optimization](https://gateway.sanctum.so/docs/concepts/optimization#self-optimization)


Concepts
# Optimization
The Optimization stage takes care of simulating your transactions and preparing it to be delivered via your delivery methods.
This page is now deprecated. We’ve now replaced this with our new Builder Stage API
This stage is accessible via `optimizeTransaction` JSON-RPC method.
## 
[​](https://gateway.sanctum.so/docs/concepts/optimization#optimization-involves%3A)
Optimization involves:
  1. **Transaction Simulation:**
     * Ensures transaction validity.
     * Calculates the total compute units (CU) required for the transaction.
  2. **Configuring Compute Budget:**
     * **Allocating Compute Units:** Sets an upper limit on the compute units your transaction can use in a block, increasing its likelihood of being included.
     * **Setting Compute Unit Price:** Defines how much you pay per CU, based on the project/request configuration and the network status, influencing the transaction’s priority.
     * **Priority Fee Determination:** The combination of CU allocation and price determines the transaction’s overall **Priority Fee,**
Copy
Ask AI
```
Priority Fee = CU Limit * CU Price

```

     * If the transaction already has their own CU allocation and compute budget, Gateway retains the pre-defined values instead of overriding them.
  3. **Prepare Tip Instruction:** Gateway also adds an extra `Transfer` instruction to your transaction to charge a fee to the fee payer of the transactions. This fee involves the following,
     * **Gateway Tip:** 25% of the priority fees being paid by your transaction is charged as fees for using Gateway’s services.
     * **Jito Bundle Tip:** If your project is set up to use Jito bundles or you specify a delivery method override in your request, Gateway will automatically add a tip to the instruction according to your project settings or the override. If the transaction ends up being delivered via RPC instead of Jito, the tip is refunded back to the fee payer automatically—no additional action required on your part.
  4. **Set Latest Blockhash:** If the [**Transaction Expiry**](https://gateway.sanctum.so/docs/docs/parameters#transaction-expiry%3A) parameter is configured, then we fetch the blockhash accordingly, orelse we fetch the latest blockhash and set it for your transaction before returning it back in the response.


#### 
[​](https://gateway.sanctum.so/docs/concepts/optimization#encoding-information)
Encoding Information
Transactions can be submitted in `base64` or `base58` formats, but optimized transactions will be returned encoded in `base64` format by default.
`base58` is being deprecated from Solana and could be removed as an acceptable encoding in the future. It it advised to use `base64`
#### 
[​](https://gateway.sanctum.so/docs/concepts/optimization#request-and-response-structure)
Request and Response Structure
Submit transactions in the request body encoded appropriately, along with optional priority fee parameters.
### 
[​](https://gateway.sanctum.so/docs/concepts/optimization#request-example)
**Request Example**
Copy
Ask AI
```
import { getBase64EncodedWireTransaction } from "@solana/kit";
const optimizeResponse = await fetch(`${GATEWAY_URL}/mainnet?apiKey=${apiKey}`, {
  method: 'POST',
  body: JSON.stringify({
    id: "test-id",
    jsonrpc: "2.0",
    method: "optimizeTransaction",
    params: {
      transactions: [
        {
          params: [
            getBase64EncodedWireTransaction(tx),
            // Optionally override the Project Configuration
            { cuPriceRange: "high", jitoTipRange: "high", expireInSlots: 5, encoding: "base64" }
          ],
        },
      ],
    }
  }),
  headers: {'Content-Type': 'application/json'}
});

```

### 
[​](https://gateway.sanctum.so/docs/concepts/optimization#response)
**Response**
The response includes the optimized transaction encoded as a base64 string, along with the `latestBlockhash` that can be used to verify transaction confirmation. The response structure:
Copy
Ask AI
```
{
  transaction: string, // base64 encoded optimized transaction
  latestBlockhash: {
    blockhash: string,
    lastValidBlockHeight: string // Note: This is returned as a string
  }
}

```

Convert the optimized transaction into a Transaction object using `@solana/web3.js` or `@solana/kit` and sign it for execution:
Copy
Ask AI
```
import {
  signTransaction,
  getBase64Encoder,
  getTransactionDecoder
} from "@solana/kit";
const optimizeBody = await optimizeResponse.json();
const optimizedTxString = optimizeBody.result[0].transaction;
const latestBlockhash = optimizeBody.result[0].latestBlockhash;
// Decode and sign the optimized transaction
const optimizedTx = getTransactionDecoder()
    .decode(getBase64Encoder().encode(optimizedTxString));
const signedTx = await signTransaction([keyPair], optimizedTx);
// The latestBlockhash can be used later to verify transaction confirmation
// blockhash: latestBlockhash.blockhash
// lastValidBlockHeight: Number(latestBlockhash.lastValidBlockHeight)

```

## 
[​](https://gateway.sanctum.so/docs/concepts/optimization#self-optimization)
Self Optimization
If you only wish to use our delivery mechanism through `sendOptimizedTransaction`, transactions may also be self-optimized. All thats needed for delivery is the proper tip configuration for Gateway and Jito (if applicable). Here’s how you can set up your transactions for delivery:
Copy
Ask AI
```
import { getTransferSolInstruction } from "@solana-program/system";
import {
  pipe,
  address,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  createKeyPairSignerFromBytes,
  compileTransaction,
  appendTransactionMessageInstruction
} from "@solana/kit";
// 150 for each of the transfer, cuLimit, and cuPrice instructions
const EXTRA_CU_CONSUMED = 150 + 150 + 150;
const TIP_DESTINATIONS = [...]; // Found at Misc/Tip-Accounts
const tipDestination = TIP_DESTINATIONS[
	Math.floor(Math.random() * TIP_DESTINATIONS.length)
];
function getGatewayTip(cuPrice: bigint, cuLimit: bigint) {
  // 25% of priority fee
  const priorityFeeMicroLamports = cuPrice * cuLimit;
  const gatewayFeeMicroLamports = (priorityFeeMicroLamports * 25n) / 100n;
  const gatewayFeeLamports = Math.round(Number(gatewayFeeMicroLamports) / 1_000_000);
  return BigInt(gatewayFeeLamports);
}
// Replace with your own values
const feePayer = await createKeyPairSignerFromBytes(new Uint8Array());
const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
const initialMessage = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayer(feePayer.address, m),
  (m) =>
    setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: (await rpc.getLatestBlockhash().send()).value.blockhash,
        lastValidBlockHeight: 1000n,
      },
      m
    ),
  // Your instructions here
);
const initialTx = await compileTransaction(initialMessage);
const simulation = await rpc.simulateTransaction(
  getBase64EncodedWireTransaction(initialTx), {
    encoding: "base64",
    sigVerify: false,
  }
).send();
if (simulation.value.unitsConsumed === undefined) {
  throw new Error("Simulation failed");
}
// Derived from the tx simulation
const txCuLimit = BigInt(simulation.value.unitsConsumed) + BigInt(EXTRA_CU_CONSUMED);
// Fetch from a Priority Fee API of your choice, Helius, Triton etc.
const txCuPrice = BigInt(...);
const gatewayTip = getGatewayTip(txCuPrice, txCuLimit);
// Fetch from Jito Tip Floor API if using Jito Bundles
const jitoTipFloor = BigInt(...);
const totalTip = gatewayTip + jitoTipFloor;
// Add this tip instruction to the transaction
const tipIx = getTransferSolInstruction({
  source: feePayer,
  destination: address(tipDestination),
  amount: totalTip,
});
const preparedTxForDelivery = pipe(
  initialMessage,
  (m) => appendTransactionMessageInstruction(tipIx, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: (await rpc.getLatestBlockhash().send()).value.blockhash,
      lastValidBlockHeight: 1000n,
    },
    m
  ),
  compileTransaction,
);
// Use this encoded transaction with `sendOptimizedTransaction` method
const encodedTx = getBase64EncodedWireTransaction(preparedTxForDelivery);

```

Tip Accounts can be found [here](https://gateway.sanctum.so/docs/misc/tip-accounts).
[Observability](https://gateway.sanctum.so/docs/concepts/observability)[Tip Accounts](https://gateway.sanctum.so/docs/misc/tip-accounts)
⌘I
[x](https://x.com/sanctumso)[github](https://github.com/igneous-labs)
[Powered by Mintlify](https://mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=sanctum-8b4c5bf5)
Assistant
Responses are generated using AI and may contain mistakes.
