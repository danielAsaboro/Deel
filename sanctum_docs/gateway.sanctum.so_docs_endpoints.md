# Source: https://gateway.sanctum.so/docs/endpoints

**Fetched:** 2025-10-28 11:41:46

---

[Skip to main content](https://gateway.sanctum.so/docs/endpoints#content-area)
[Sanctum Gateway Docs home page![light logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/light.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=ca03304d0aa68f52c6994cbbfbde4fe4)![dark logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/dark.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=537b4693ba9d11b0543b118bdec9d400)](https://gateway.sanctum.so/docs)
Search...
⌘K
  * Support
  * [Dashboard](https://gateway.sanctum.so/dashboard)
  * [Dashboard](https://gateway.sanctum.so/dashboard)


Search...
Navigation
Getting Started
Gateway Endpoints
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
  * [Endpoint URL Structure](https://gateway.sanctum.so/docs/endpoints#endpoint-url-structure)
  * [Path Parameters](https://gateway.sanctum.so/docs/endpoints#path-parameters)
  * [{cluster} (required)](https://gateway.sanctum.so/docs/endpoints#%7Bcluster%7D-required)
  * [Query Parameters](https://gateway.sanctum.so/docs/endpoints#query-parameters)
  * [apiKey (required)](https://gateway.sanctum.so/docs/endpoints#apikey-required)
  * [Usage Example](https://gateway.sanctum.so/docs/endpoints#usage-example)
  * [Security Best Practices](https://gateway.sanctum.so/docs/endpoints#security-best-practices)
  * [Next Steps](https://gateway.sanctum.so/docs/endpoints#next-steps)


Getting Started
# Gateway Endpoints
The Transaction Processing Gateway (TPG) is accessible via secure HTTP endpoints.
## 
[​](https://gateway.sanctum.so/docs/endpoints#endpoint-url-structure)
Endpoint URL Structure
Copy
Ask AI
```
https://tpg.sanctum.so/v1/{cluster}?apiKey={apiKey}

```

### 
[​](https://gateway.sanctum.so/docs/endpoints#path-parameters)
Path Parameters
#### 
[​](https://gateway.sanctum.so/docs/endpoints#%7Bcluster%7D-required)
`{cluster}` (required)
Specifies the Solana cluster targeted for transactions. **Supported Clusters:** Cluster Value | Description  
---|---  
`mainnet` | Solana Mainnet Beta  
`devnet` | Solana Development Network  
### 
[​](https://gateway.sanctum.so/docs/endpoints#query-parameters)
Query Parameters
#### 
[​](https://gateway.sanctum.so/docs/endpoints#apikey-required)
`apiKey` (required)
The unique authentication key assigned to your project. **Example:**
Copy
Ask AI
```
01ARZ3NDEKTSV4RRFFQ69G5FAV

```

## 
[​](https://gateway.sanctum.so/docs/endpoints#usage-example)
Usage Example
Below is a basic example demonstrating how to build a transaction:
Copy
Ask AI
```
const response = await fetch('https://tpg.sanctum.so/v1/mainnet?apiKey=your-api-key', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    method: 'buildGatewayTransaction',
    params: [getBase64EncodedWireTransaction(transaction)],
  })
});

```

## 
[​](https://gateway.sanctum.so/docs/endpoints#security-best-practices)
Security Best Practices
**Protecting Your API Key:**
  * **Do not expose API keys** in client-side code, repositories, or publicly accessible areas.
  * Store API keys using environment variables or dedicated secrets management tools.
  * Maintain separate API keys for distinct environments (development, staging, production).


## 
[​](https://gateway.sanctum.so/docs/endpoints#next-steps)
Next Steps
  * Learn how to **build** your transactions [here](https://gateway.sanctum.so/docs/concepts/builder)
  * Learn how to **deliver** transactions [here](https://gateway.sanctum.so/docs/concepts/delivery)


[Project Parameters](https://gateway.sanctum.so/docs/parameters)[Builder](https://gateway.sanctum.so/docs/concepts/builder)
⌘I
[x](https://x.com/sanctumso)[github](https://github.com/igneous-labs)
[Powered by Mintlify](https://mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=sanctum-8b4c5bf5)
Assistant
Responses are generated using AI and may contain mistakes.
