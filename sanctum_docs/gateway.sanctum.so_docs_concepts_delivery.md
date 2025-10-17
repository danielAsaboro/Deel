# Source: https://gateway.sanctum.so/docs/concepts/delivery

**Fetched:** 2025-10-28 11:41:50

---

[Skip to main content](https://gateway.sanctum.so/docs/concepts/delivery#content-area)
[Sanctum Gateway Docs home page![light logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/light.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=ca03304d0aa68f52c6994cbbfbde4fe4)![dark logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/dark.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=537b4693ba9d11b0543b118bdec9d400)](https://gateway.sanctum.so/docs)
Search...
⌘K
  * Support
  * [Dashboard](https://gateway.sanctum.so/dashboard)
  * [Dashboard](https://gateway.sanctum.so/dashboard)


Search...
Navigation
Concepts
Delivery
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
  * [Supported Encoding Formats](https://gateway.sanctum.so/docs/concepts/delivery#supported-encoding-formats)
  * [Tracking Slot Latency](https://gateway.sanctum.so/docs/concepts/delivery#tracking-slot-latency)
  * [Request Example](https://gateway.sanctum.so/docs/concepts/delivery#request-example)
  * [Response Example](https://gateway.sanctum.so/docs/concepts/delivery#response-example)


Concepts
# Delivery
Gateway enables seamless switching and routing between various delivery methods
This feature is accessible via `sendTransaction` method. Gateway delivers transactions simultaneously across multiple delivery methods, maximizing transaction success rates. Effortlessly switch between delivery channels from your dashboard—no code changes or redeployments required. Once you have your optimized transaction ready along with the tip transfer included, you can now send it via the `sendTransaction` method.
Gateway expects a minimal tip of 50K Lamports for delivery (or based on the methods used). Please ensure your transaction includes a transfer instruction to one of our [Tip destinations](https://gateway.sanctum.so/docs/misc/tip-accounts)  
(Ignore if you’re using one of our [builder](https://gateway.sanctum.so/docs/concepts/builder) endpoints)
#### 
[​](https://gateway.sanctum.so/docs/concepts/delivery#supported-encoding-formats)
Supported Encoding Formats
Transactions are accepted in both `base64` and `base58` encoding formats.
`base58` is being deprecated from Solana and could be removed as an acceptable encoding in the future. It it advised to use `base64`
#### 
[​](https://gateway.sanctum.so/docs/concepts/delivery#tracking-slot-latency)
Tracking Slot Latency
As we route your transaction through your chosen delivery methods, we record the slot at which each transaction is sent. This allows us to accurately calculate slot latency for your transactions. For even more precise end-to-end latency tracking from your application, you can include a `startSlot` value in your request body. We’ll use this value to determine the slot latency on your behalf.
We’ve recently introduced a `v1` set of of APIs, and hence please note the URL below with the `/v1` path parameter.
### 
[​](https://gateway.sanctum.so/docs/concepts/delivery#request-example)
**Request Example**
Copy
Ask AI
```
import {
  getBase64Encoder,
  getTransactionDecoder,
  getBase64EncodedWireTransaction
} from "@solana/kit";
// Continued from `buildGatewayTransaction`...
const optimizedTxString = optimizeBody.result.transaction;
const optimizedTx = getTransactionDecoder()
    .decode(getBase64Encoder().encode(optimizedTxString));
const signedTx = await signTransaction([keyPair], optimizedTx);
const deliveryResponse = await fetch(`${GATEWAY_URL}/v1/mainnet?apiKey=${apiKey}`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
  body: JSON.stringify({
    id: "test-id",
    jsonrpc: "2.0",
    method: "sendTransaction",
    params: [getBase64EncodedWireTransaction(signedTx), {
        encoding: "base64",
		startSlot: 361082604
    }]
  }),
});

```

### 
[​](https://gateway.sanctum.so/docs/concepts/delivery#response-example)
**Response Example**
The response contains results from each delivery method indexed using its URL.
Copy
Ask AI
```
type DeliveryResult = {
  result?: string; // Transaction signature
  error?: {
    code: number,
	message: string
  }
};

```

Copy
Ask AI
```
{
  "jsonrpc": "2.0",
  "id": "test-id",
  "result": "E7oKpwds2h4xxcrGoccrizTEVWvgu6k8u..."
}

```

In this example, the response includes either a `result` field with the transaction signature or an `error` field with error details.
[Builder](https://gateway.sanctum.so/docs/concepts/builder)[Observability](https://gateway.sanctum.so/docs/concepts/observability)
⌘I
[x](https://x.com/sanctumso)[github](https://github.com/igneous-labs)
[Powered by Mintlify](https://mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=sanctum-8b4c5bf5)
Assistant
Responses are generated using AI and may contain mistakes.
