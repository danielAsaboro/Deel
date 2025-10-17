# Source: https://gateway.sanctum.so/docs/delivery-methods

**Fetched:** 2025-10-28 11:41:43

---

[Skip to main content](https://gateway.sanctum.so/docs/delivery-methods#content-area)
[Sanctum Gateway Docs home page![light logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/light.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=ca03304d0aa68f52c6994cbbfbde4fe4)![dark logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/dark.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=537b4693ba9d11b0543b118bdec9d400)](https://gateway.sanctum.so/docs)
Search...
⌘K
  * Support
  * [Dashboard](https://gateway.sanctum.so/dashboard)
  * [Dashboard](https://gateway.sanctum.so/dashboard)


Search...
Navigation
Getting Started
Delivery Methods
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
  * [RPCs/SWQoS](https://gateway.sanctum.so/docs/delivery-methods#rpcs%2Fswqos)
  * [Configuration for RPC:](https://gateway.sanctum.so/docs/delivery-methods#configuration-for-rpc%3A)
  * [Jito Bundles](https://gateway.sanctum.so/docs/delivery-methods#jito-bundles)
  * [Configuration for Jito:](https://gateway.sanctum.so/docs/delivery-methods#configuration-for-jito%3A)
  * [Sanctum Sender](https://gateway.sanctum.so/docs/delivery-methods#sanctum-sender)
  * [Helius Sender](https://gateway.sanctum.so/docs/delivery-methods#helius-sender)
  * [Configuration for Jito:](https://gateway.sanctum.so/docs/delivery-methods#configuration-for-jito%3A-2)


Getting Started
# Delivery Methods
A delivery method enables Gateway to send transactions to the Solana network.
Gateway categorises the various of ways of sending transactions to the Solana network as Delivery Methods. They are as follows,
  * RPCs/SWQoS
  * Jito Bundles
  * Transaction Senders, such as Sanctum Sender, Nozomi, etc.

Gateway allows you to configure appropriate delivery methods based on your project’s requirements, which are then used to send your transactions to the Solana network. The delivery methods currently supported by Gateway are as follows,
## 
[​](https://gateway.sanctum.so/docs/delivery-methods#rpcs%2Fswqos)
RPCs/SWQoS
RPCs are the most common way of sending transactions to Solana nodes. You can an RPC URL for many RPC providers such as Triton One, Quicknode, etc. One can also use set up SWQoS solutions such as [Triton Cascade](https://docs.triton.one/chains/solana/cascade) to use with Gateway.
### 
[​](https://gateway.sanctum.so/docs/delivery-methods#configuration-for-rpc%3A)
Configuration for RPC:
  * **Name:** Identifier for this method.
  * **Cluster:** Select between `devnet` (for testing) or `mainnet`.
  * **URL:** Endpoint URL of the RPC node. Any URL that supports `sendTransaction` JSON-RPC method and requires no additional tip of any sorts will work here.


* * *
## 
[​](https://gateway.sanctum.so/docs/delivery-methods#jito-bundles)
Jito Bundles
Jito is an enhanced validator client (Jito-Solana) that allows transactions to be bundled and sent through Jito’s Block Engine using relays. These bundles participate in an auction, where the amount tipped determines which transactions are included on the network. Since most Solana validators now run Jito, transactions delivered via this method benefit from much faster execution and higher success rates at the price of an additional tip. Gateway sends each of your transactions as individual Jito bundles which include a refundable tip. You can leverage this along with sending transactions to RPCs to not only increase landing rates but also lower your tip expenses.
### 
[​](https://gateway.sanctum.so/docs/delivery-methods#configuration-for-jito%3A)
Configuration for Jito:
  * **Name:** Identifier for this method.
  * **Region or URL:**
    * Select a predefined region to use Jito’s default endpoints (Rate limit: 1 request per second)
    * Provide your custom Jito endpoint URL for higher throughput without enforced rate-limiting.


* * *
## 
[​](https://gateway.sanctum.so/docs/delivery-methods#sanctum-sender)
Sanctum Sender
Sanctum Sender is Sanctum’s transaction submission service. It optimizes transaction submission by leveraging SWQoS and Jito simultaneously, providing multiple pathways for your transactions to be included in blocks. All new projects on Gateway are provider with a Sanctum Sender delivery method by default, making it the easiest way for teams to start sending transactions. There is currently only one global URL for using Sanctum Sender. Hence, no further configuration is required.
* * *
## 
[​](https://gateway.sanctum.so/docs/delivery-methods#helius-sender)
Helius Sender
Helius Sender is Helius’ transaction submission service. It optimizes transaction latency by sending to both Solana validators and Jito simultaneously, providing multiple pathways for your transactions to be included in blocks.
### 
[​](https://gateway.sanctum.so/docs/delivery-methods#configuration-for-jito%3A-2)
Configuration for Jito:
  * **Name:** Identifier for this method.
  * **Region:**
    * Select a predefined region to use Jito’s default endpoints (Rate limit: 6 TPS)


[Quickstart](https://gateway.sanctum.so/docs/quickstart)[Project Parameters](https://gateway.sanctum.so/docs/parameters)
⌘I
[x](https://x.com/sanctumso)[github](https://github.com/igneous-labs)
[Powered by Mintlify](https://mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=sanctum-8b4c5bf5)
Assistant
Responses are generated using AI and may contain mistakes.
