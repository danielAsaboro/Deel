# Source: https://gateway.sanctum.so/docs/concepts/builder

**Fetched:** 2025-10-28 11:41:47

---

[Skip to main content](https://gateway.sanctum.so/docs/concepts/builder#content-area)
[Sanctum Gateway Docs home page![light logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/light.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=ca03304d0aa68f52c6994cbbfbde4fe4)![dark logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/dark.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=537b4693ba9d11b0543b118bdec9d400)](https://gateway.sanctum.so/docs)
Search...
⌘K
  * Support
  * [Dashboard](https://gateway.sanctum.so/dashboard)
  * [Dashboard](https://gateway.sanctum.so/dashboard)


Search...
Navigation
Concepts
Builder
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
  * [buildGatewayTransaction](https://gateway.sanctum.so/docs/concepts/builder#buildgatewaytransaction)
  * [getTipInstructions](https://gateway.sanctum.so/docs/concepts/builder#gettipinstructions)


Concepts
# Builder
The Builder stage helps you to build your transactions to be sent via Gateway
This stage consists of the following JSON-RPC methods,
  * `buildGatewayTransaction`
  * `getTipInstructions`

This set of JSON-RPC methods allow users to abstract the complexity of building transactions according to the delivery method, such as Jito Bundles, Sanctum Sender etc, and allows users to update how their transaction traffic is routed in real-time, without any code changes or redeployments. This stage is optional and users can manually handle building the transactions appropriately, to be sent via Gateway.
### 
[​](https://gateway.sanctum.so/docs/concepts/builder#buildgatewaytransaction)
`buildGatewayTransaction`
This method acceps an existing transaction and returns an updated transaction that is ready to be sent to Gateway. One can use the `buildGatewayTransaction` method to do the following:
  * Simulate the transaction for preflight checks, and get an estimate of the CUs consumed to set the CU limit accordingly.
  * Fetch the latest prioritization fees for the transaction, and set the CU price accordingly.
  * Add the tip instructions to route the trasaction to the desired delivery methods.
  * Set the appropriate `latestBlockhash` for the transaction, depending on whether you want the transaction to expire sooner than usual.


Copy
Ask AI
```
import {
  appendTransactionMessageInstructions,
  blockhash,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getTransactionDecoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransaction,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
export const GATEWAY_ENDPOINT = `https://tpg.sanctum.so/v1/mainnet?apiKey=${process.env.GATEWAY_API_KEY}`;
// Random source and destination used for example
const { alice, bob } = await getAccounts();
const transferIx = getTransferSolInstruction({
  source: alice,
  destination: bob,
  amount: 1000n,
});
const unsignedTransaction = pipe(
  createTransactionMessage({ version: 0 }),
  (txm) => appendTransactionMessageInstructions([transferIx], txm),
  (txm) => setTransactionMessageFeePayerSigner(alice, txm),
  // Since `buildGatewayTransaction` will set the blockhash for you,
  // We can avoid fetching the latest blockhash here
  (m) =>
    setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: blockhash("11111111111111111111111111111111"),
        lastValidBlockHeight: 1000n,
      },
      m
    ),
  compileTransaction
);
const buildGatewayTransactionResponse = await fetch(GATEWAY_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    id: "startup-village",
    jsonrpc: "2.0",
    method: "buildGatewayTransaction",
    params: [
      getBase64EncodedWireTransaction(unsignedTransaction),
      {
        // encoding: "base64" | "base58", default is "base64"
        // skipSimulation: boolean, if true, you need to set the CU limit yourself since simulation allows to find out cu consumed.
        // skipPriorityFee: boolean, if true, you need to set the CU price yourself. Use Triton Priority Fee API
        // cuPriceRange: "low" | "medium" | "high", defaults to project parameters
        // jitoTipRange: "low" | "medium" | "high" | "max", defaults to project parameters
        // expireInSlots: number, defaults to project parameters
        // deliveryMethodType: "rpc" | "jito" | "sanctum-sender" | "helius-sender", defaults to project parameters
      },
    ],
  }),
});
if (!buildGatewayTransactionResponse.ok) {
  throw new Error("Failed to build gateway transaction");
}
const {
  result: { transaction: encodedTransaction },
} = (await buildGatewayTransactionResponse.json()) as {
  result: {
    transaction: string;
    latestBlockhash: {
      blockhash: string;
      lastValidBlockHeight: string;
    };
  };
};
const transaction = getTransactionDecoder()
  .decode(getBase64Encoder().encode(encodedTransaction));
const signedTransaction = await signTransaction([alice.keyPair], transaction);
const sendTransactionResponse = await fetch(GATEWAY_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    id: "startup-village",
    jsonrpc: "2.0",
    method: "sendTransaction",
    params: [getBase64EncodedWireTransaction(signedTransaction)],
  }),
});
if (!sendTransactionResponse.ok) {
  throw new Error("Failed to send transaction");
}
const data = await sendTransactionResponse.json();
console.log(data);

```

### 
[​](https://gateway.sanctum.so/docs/concepts/builder#gettipinstructions)
`getTipInstructions`
This method returns the tip instructions that need to be added to your transaction depending on what delivery method this transaction needs to be sent to. One can either explicitly specify the delivery method for which to return the tip instructions for, or Gateway will use a weighted sampling algorithm to pick one depending on the **Transaction Routing** parameter configured on the Dashboard.
Copy
Ask AI
```
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  type IInstruction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransaction,
} from "@solana/kit";
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from "@solana-program/compute-budget";
import { getTransferSolInstruction } from "@solana-program/system";
import { getAccounts, getTritonPrioritizationFees } from "./utils.js";
export const GATEWAY_ENDPOINT = `https://tpg.sanctum.so/v1/mainnet?apiKey=${process.env.GATEWAY_API_KEY}`;
// Random source and destination used for example
const { alice, bob } = await getAccounts();
const rpc = createSolanaRpc(process.env.RPC_URL as string);
const transferIx = getTransferSolInstruction({
  source: alice,
  destination: bob,
  amount: 1000n,
});
// Fetch latest blockhash, CU price and getTipInstructions response
const [{ value: latestBlockhash }, cuPrice, getTipInstructionsResponse] =
  await Promise.all([
    rpc.getLatestBlockhash().send(),
    getTritonPrioritizationFees([alice.address, bob]),
    fetch(GATEWAY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "demo",
        jsonrpc: "2.0",
        method: "getTipInstructions",
        params: [
          {
            feePayer: alice.address,
            // jitoTipRange: "low" | "medium" | "high" | "max", defaults to project parameters
            // deliveryMethodType: "rpc" | "jito" | "sanctum-sender" | "helius-sender", defaults to project parameters
          },
        ],
      }),
    }),
  ]);
if (!getTipInstructionsResponse.ok) {
  throw new Error("Failed to get tip instructions");
}
// Parse tip instructions response and convert to Instruction[]
const tipIxs: IInstruction[] = [];
const tipIxsData = await getTipInstructionsResponse.json();
for (const ix of tipIxsData.result) {
  tipIxs.push({
    ...ix,
    data: new Uint8Array(Object.values(ix.data)),
  });
}
// Hardcode CU limit, but you can also simulate the transaction to get the exact CU limit
const cuLimitIx = getSetComputeUnitLimitInstruction({
  units: 800,
});
const cuPriceIx = getSetComputeUnitPriceInstruction({
  microLamports: cuPrice,
});
const transaction = pipe(
  createTransactionMessage({ version: 0 }),
  (txm) =>
    appendTransactionMessageInstructions(
      [cuLimitIx, cuPriceIx, transferIx, ...tipIxs],
      txm
    ),
  (txm) => setTransactionMessageFeePayerSigner(alice, txm),
  (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
  compileTransaction
);
const signedTransaction = await signTransaction([alice.keyPair], transaction);
const sendTransactionResponse = await fetch(GATEWAY_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    id: "demo",
    jsonrpc: "2.0",
    method: "sendTransaction",
    params: [getBase64EncodedWireTransaction(signedTransaction)],
  }),
});
if (!sendTransactionResponse.ok) {
  throw new Error("Failed to send transaction");
}
const data = await sendTransactionResponse.json();
console.log(data);

```

[Gateway Endpoints](https://gateway.sanctum.so/docs/endpoints)[Delivery](https://gateway.sanctum.so/docs/concepts/delivery)
⌘I
[x](https://x.com/sanctumso)[github](https://github.com/igneous-labs)
[Powered by Mintlify](https://mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=sanctum-8b4c5bf5)
Assistant
Responses are generated using AI and may contain mistakes.
