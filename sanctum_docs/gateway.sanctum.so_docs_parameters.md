# Source: https://gateway.sanctum.so/docs/parameters

**Fetched:** 2025-10-28 11:41:44

---

[Skip to main content](https://gateway.sanctum.so/docs/parameters#content-area)
[Sanctum Gateway Docs home page![light logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/light.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=ca03304d0aa68f52c6994cbbfbde4fe4)![dark logo](https://mintcdn.com/sanctum-8b4c5bf5/aA2NSy1MLgkLh8kE/logo/dark.svg?fit=max&auto=format&n=aA2NSy1MLgkLh8kE&q=85&s=537b4693ba9d11b0543b118bdec9d400)](https://gateway.sanctum.so/docs)
Search...
⌘K
  * Support
  * [Dashboard](https://gateway.sanctum.so/dashboard)
  * [Dashboard](https://gateway.sanctum.so/dashboard)


Search...
Navigation
Getting Started
Project Parameters
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
  * [Compute Unit (CU) Price:](https://gateway.sanctum.so/docs/parameters#compute-unit-cu-price%3A)
  * [Jito Configuration:](https://gateway.sanctum.so/docs/parameters#jito-configuration%3A)
  * [Delivery Methods:](https://gateway.sanctum.so/docs/parameters#delivery-methods%3A)
  * [Transaction Routing](https://gateway.sanctum.so/docs/parameters#transaction-routing)
  * [Transaction Expiry:](https://gateway.sanctum.so/docs/parameters#transaction-expiry%3A)
  * [Next Steps](https://gateway.sanctum.so/docs/parameters#next-steps)


Getting Started
# Project Parameters
Configuring parameters that determine how your transactions are optimized and delivered using Gateway
Parameters enable optimizations and incident management for your transactions on the fly—without having to redeploy your project. Changes take effect in real time, allowing you to fine-tune configurations based on performance feedback.
The network can often become congested during times of high usage, leading to a noticeable drop in transaction landing rates. During such instances, you can now simply update your parameters to increase the chances of your transactions landing.
The parameters currently available are as follows,
### 
[​](https://gateway.sanctum.so/docs/parameters#compute-unit-cu-price%3A)
Compute Unit (CU) Price:
This parameter allows you to select the amount of price per compute unit you wish to pay. Each range corresponds to a percentile of CU Price paid in transactions that have landed previously on the Solana network:
  * **Low** : 25th percentile
  * **Median** : 50th percentile
  * **High** : 90th percentile


### 
[​](https://gateway.sanctum.so/docs/parameters#jito-configuration%3A)
Jito Configuration:
  * **Tip Amount:** Select the tip amount for your transaction from these options: 
    * **Low** : 25th percentile
    * **Median** : 50th percentile
    * **High** : 75th percentile
    * **MAX** : 99th percentile

**Delivery Delay:** Use this to set how long Gateway waits (in milliseconds) before sending transactions to Jito after attempting RPC delivery. If a transaction is successfully delivered via RPC, the Jito tip is refunded automatically.
### 
[​](https://gateway.sanctum.so/docs/parameters#delivery-methods%3A)
Delivery Methods:
This section allows you to select and manage delivery methods from your organization for the current project.
  * **Creating** a delivery method from the parameters sidebar automatically links it to the current project. Once linked, this delivery method will be utilized whenever delivery requests are made for this specific project. 
    * Delivery methods created from the delivery methods page will be available organization-wide but won’t be linked automatically to any specific project. They must be manually linked to be utilized for delivery requests.
  * You can manage linked delivery methods in two ways: 
    * **Unlinking** a delivery method removes it from the current project but keeps it accessible for use in other projects within your organization.
    * **Deleting** a delivery method permanently removes it from your entire organization and all associated projects.


### 
[​](https://gateway.sanctum.so/docs/parameters#transaction-routing)
Transaction Routing
This parameter helps you to build your transactions so that one can distribute their transaction traffic between multiple delivery methods. Gateway currently uses a weighted sampling algorithm for distributing your transaction traffic. Depending on the weights one configures, the `getTipInstructions` and `buildGatewayTransaction` JSON-RPC methods respond with appropriate tip instructions and transaction respectively. The following image depicts how one would configure their weights to route **50% **of their transactions to Sanctum Sender** , 30% **to regular RPCs and **20% **to any other configured transaction sender, ![Transaction Routing Pn](https://mintcdn.com/sanctum-8b4c5bf5/GuegblFa-g9Ubguz/images/transaction-routing.png?fit=max&auto=format&n=GuegblFa-g9Ubguz&q=85&s=ecf70a80e2f294c779389d915bccbf54)
### 
[​](https://gateway.sanctum.so/docs/parameters#transaction-expiry%3A)
Transaction Expiry:
This parameter allows you to configure your transaction to expire in the specified amount of slots. This is done by setting a `latestBlockhash` for your transaction according to your configuration. Since every transaction, by default, is valid for **150 blocks** starting from the blockhash set in the transaction, we can thus calculate which blockhash to use so that your transaction expires in the specified number of slots.
## 
[​](https://gateway.sanctum.so/docs/parameters#next-steps)
Next Steps
  * Learn how to **integrate** Gateway endpoints [here](https://gateway.sanctum.so/docs/endpoints)
  * Learn how to **build** your transactions [here](https://gateway.sanctum.so/docs/concepts/builder)


[Delivery Methods](https://gateway.sanctum.so/docs/delivery-methods)[Gateway Endpoints](https://gateway.sanctum.so/docs/endpoints)
⌘I
[x](https://x.com/sanctumso)[github](https://github.com/igneous-labs)
[Powered by Mintlify](https://mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=sanctum-8b4c5bf5)
Assistant
Responses are generated using AI and may contain mistakes.
![Transaction Routing Pn](https://mintcdn.com/sanctum-8b4c5bf5/GuegblFa-g9Ubguz/images/transaction-routing.png?w=560&fit=max&auto=format&n=GuegblFa-g9Ubguz&q=85&s=e93be6e595673c2977f637a9501d5274)
