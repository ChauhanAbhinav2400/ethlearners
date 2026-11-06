# Web3MadEazy

**Learn Ethereum by understanding an idea, trying it, and explaining what changed.**

Web3MadEazy has two learning paths, student accounts, chapter assessments, World ID verification, and a Sepolia learning-token reward system. The original dark theme, green accents, 24 Developer lessons, 14 worlds, Story Mode, Explore Mode, and interactive simulations remain.

**Atlas is connected and both contracts are deployed and source-verified on Sepolia. The live API smoke checks pass. A real World ID proof and learner reward claim remain to be tested.** Netlify and Render configuration is included; services have not been provisioned. See [verification status](docs/VERIFICATION.md) for executed checks and remaining limits.

Create My Lab and its AI providers have been removed. No AI API key is needed.

## How we explain a topic

Every Developer lesson follows this teaching sequence. Learners get the foundation before they are asked to operate the experiment.

| Stage                      | What the learner does                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. The idea**            | Read a short explanation of the problem and why it matters, in simple English.                                                                            |
| **2. A familiar example**  | Connect it to something familiar, such as a shop, a shared notebook, or an office approval process. See where the analogy stops matching the real system. |
| **3. How it works**        | Follow the actual mechanism in small steps. Learn technical terms alongside their meaning.                                                                |
| **4. Before you try**      | See how the explanation maps to the experiment's controls, what to watch, and what to do first. Make a prediction.                                        |
| **5. Guided experiment**   | Change inputs and inspect visible state changes. Each instruction says what to try, what to observe, and why it happens.                                  |
| **6. Explain the result**  | Compare the outcome with the prediction. Read what changed, why it changed, and the main idea to remember.                                                |
| **7. Check understanding** | Answer a reasoning question about the mechanism. Read feedback and revisit the explanation when needed.                                                   |
| **8. Go deeper**           | Optionally open technical details, examples, code where relevant, model limitations, and original sources.                                                |

The writing teaches the concept first and introduces its technical name afterward. For example, a transaction lesson starts with Alice sending a request and a node checking it, before discussing validation rules and state changes. Short paragraphs, concrete actions, and direct questions keep the explanation approachable without removing technical depth.

### Example: learning about oracles

The **Oracles** lesson asks: how can a contract use information from outside Ethereum?

It starts with a shop asking reporters for a price. One reporter can be wrong. Several reporters can help, but only if their information is useful and independent. The technical explanation then introduces reports, timestamps, freshness checks, and the median: the middle value after sorting the reports.

The learner then tests those ideas in the actual lab:

| Action                                                                          | Visible result                                                                                                            | What it teaches                                                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Select **One publisher** and choose **Read into contract**.                     | The contract stores publisher A's starting report of `100`.                                                               | Publishing a report and accepting it into application state are separate actions.             |
| Choose **Manipulate publisher A**, then read again.                             | The accepted value becomes `600`.                                                                                         | Receiving a report does not prove that it describes the outside world correctly.              |
| Select **Three-source median** and read again.                                  | Reports `600`, `102`, and `98` produce a median of `102`.                                                                 | Combining reports can reduce the influence of one extreme value.                              |
| Choose **Correlate all reports**, then read again.                              | All reports become `600`, so the median is also `600`.                                                                    | Agreement is not enough when the sources share the same bad information.                      |
| Restore independent reports, advance time by 30 seconds three times, then read. | The read is rejected because the reports exceed the lab's 60-second freshness limit. The previous stored reading remains. | Old reports need explicit handling; rejecting an update does not refresh an old stored value. |
| Refresh all three reports and read again.                                       | Fresh reports are accepted.                                                                                               | Updating a feed and updating the consuming contract are different operations.                 |

The result explanation and understanding check connect those observations back to the idea. Deeper sections discuss assumptions and failure cases. The lab clearly labels its prices, clock, publishers, and freshness policy as a teaching model; it does not fetch market data or implement a production oracle protocol.

## Two learning paths

**Developer Mode** preserves all 24 lessons across 14 worlds: Web2 applications, shared records, blockchain foundations, nodes, accounts and wallets, execution and transaction pools, the EVM, gas and fees, proof of stake, the transaction journey, application development, scaling, Ethereum history, and protocol evolution. Story Mode follows a connected sequence; Explore Mode opens any topic directly.

**Everyday Explorer** teaches 15 chapters without assuming programming knowledge. Each chapter follows six stages: welcome, a familiar example, picture the idea, try it yourself, takeaway, and understanding check. Experiments cover public records, block history, shared networks, wallet approval, secrets, transaction receipts, fees, contracts, token allowances, NFTs, application permissions, safety, scams, evidence, and a final journey review.

All lesson experiments use local teaching data. They never request private keys or submit real transactions. Real wallet ownership signing and testnet rewards are separate, explicit platform features.

Example routes: /story/source-of-truth, /explore/oracles, /everyday/everyday-1, /chapters/dev-00/assessment, /dashboard, and /u/username. The /learn route resumes the original learning experience.

## Questions and rewards

There are **29 assessable chapters**: 14 Developer worlds and 15 Everyday chapters. Each has five topic-specific, server-graded multiple-choice questions and a distinct Master Challenge.

1. Read and experiment without an account or wallet.
2. Sign in to save progress. Complete all five chapter questions correctly; ordinary questions allow unlimited retries.
3. Connect a Sepolia wallet, sign its ownership message, and select it. Then verify through the supported production World ID Proof of Human flow.
4. Drag an answer into the Master Challenge, or use accessible answer buttons. Review the confirmation before submitting.
5. The server consumes one final attempt per verified human and versioned chapter reward scope. A correct answer creates eligibility; an incorrect answer permanently consumes that scope's reward opportunity.
6. Keep a verified wallet selected as your reward destination. Future chapters reuse the human binding on your account.
7. Claim **10 LEARN**. A durable backend worker submits the ERC-20 distribution. The dashboard counts it only after canonical chain finality.

Viewing, selecting an answer, and cancelling confirmation consume no attempt. A different wallet or account cannot reset the same verified human's opportunity. A fresh valid proof matching an existing account returns the browser to that account without merging data. A nullifier alone or a failed proof cannot authorize this switch. Local progress and badges never authorize rewards. Simulator World ID verification cannot earn rewards.

LEARN is an educational Sepolia token, not an investment. World ID helps enforce human uniqueness; it does not prove honest learning or protect against a compromised backend.

## Accounts, dashboard, and profiles

MongoDB stores password hashes, opaque sessions, recovery-code hashes, reading positions, quiz completion, immutable challenge attempts, human bindings, verified wallets, claims, transaction history, and badges. Passwords and raw session tokens are not stored in plaintext.

Registration shows a one-time account recovery code. Keep it privately: recovery rotates the code and invalidates existing sessions. It is not a wallet seed phrase.

The dashboard shows both learning paths, next chapters, results, eligibility, pending and confirmed claims, and four offchain achievements:

| Badge | Confirmed reward requirement |
| --- | --- |
| First Victory | 1 chapter across either path |
| Rising Explorer | 3 chapters across either path |
| Knowledge Champion | 5 chapters across either path |
| Ethereum Master | All 14 Developer v1 chapters |

Public profiles expose display name, username, avatar, bio, and badges. Sharing completed lessons, confirmed reward totals, or a selected wallet requires separate opt-ins. Human identifiers, authentication data, and signed transaction bytes remain private.

Local reading positions work offline. Signed-in lessons sync to the API; the dashboard can import browser reading progress or restore saved positions. Imports do not complete assessments. Experiment state is not restored across reloads.

## Run locally

For the exact values to fill and where to get them, start with [Environment setup](docs/ENVIRONMENT.md). The private local file is **backend/.env**; `.env.dev` is not loaded.

Requires **Node.js 22.20 or newer** and npm. From the repository root:

In WSL with nvm, run `nvm install` and `nvm use` first; the checked-in `.nvmrc` selects the supported Node version. Windows and WSL have separate Node installations and should not share an installed `node_modules` tree.

~~~sh
npm install
npm run setup
npm run dev
~~~

Setup creates backend/.env if absent and generates three private application secrets. It never overwrites an existing file. Add your Atlas URI and actual external settings to **backend/.env**, then restart the backend. The old root .env.local is not used.

The dev command starts the frontend at http://localhost:5173 and backend at http://localhost:3001. Vite proxies /api to the backend. To start them separately, use two terminals: If another runtime such as WSL already owns those localhost ports, use `npm run dev:isolated` instead; it starts this checkout at http://localhost:5174 with its API on port 3002. Check `http://localhost:5174/api/health` and confirm `worldProofContract` is `orb-compat-v2` before testing World ID.

~~~sh
npm run dev:frontend
~~~

~~~sh
npm run dev:backend
~~~

You do not need to build first. Lessons work without credentials. Accounts and assessments require MongoDB. The unconfigured API returns an explicit 503 rather than fake account or reward data.

### Environment settings

The local World ID setup uses `WORLD_ID_CREDENTIAL_MODE=orb-legacy` for Orb-verified users through IDKit 4. The optional `proof-of-human` mode is v4-only. Choose one mode before binding users; changing it after verification requires a migration. See [World ID setup](docs/WORLD_ID_SETUP.md).

Use [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example). Never put secrets in a VITE_ variable or commit them.

| Backend variable | Purpose |
| --- | --- |
| MONGODB_URI | Atlas or a local replica set; transactions are required |
| SESSION_SECRET, IDENTITY_SECRET, REWARD_ID_SECRET | Stable private secrets generated by setup; back them up securely |
| WORLD_ID_APP_ID, WORLD_ID_RP_ID, WORLD_ID_ACTION, WORLD_ID_SIGNING_KEY | Actual app, relying party, action, and private request signer |
| WORLD_ID_ENVIRONMENT | Production for rewards; staging is nonrewarding |
| SEPOLIA_RPC_URL | Private Sepolia RPC |
| REWARD_TOKEN_ADDRESS, REWARD_DISTRIBUTOR_ADDRESS | Actual deployed contracts |
| REWARD_SIGNER_PRIVATE_KEY | Dedicated testnet distributor account, server-side only |
| REWARD_WORKER_ENABLED | Enable after contracts, signer role, and test ETH are ready |
| FRONTEND_ORIGIN, COOKIE_SAME_SITE, TRUST_PROXY | Exact origin, cookie policy, and reverse-proxy settings |

The frontend uses an empty VITE_API_URL for the local proxy. Cross-origin hosting uses the actual backend origin. World ID request configuration comes from the backend. See [external setup](EXTERNAL_SETUP.md), [World ID setup](docs/WORLD_ID_SETUP.md), and [reward operations](docs/REWARDS.md).

## Build and checks

~~~sh
npm run typecheck
npm test
npm run build
~~~

Build output goes to frontend/dist and backend/dist. The backend does not serve frontend assets; Netlify serves them separately. The production API uses host-supplied environment variables with npm start. To load local private settings explicitly:

~~~sh
node --env-file=backend/.env backend/dist/server.mjs
~~~

Solidity tests require [Foundry](https://getfoundry.sh/introduction/installation/) on PATH:

~~~sh
npm run test:contracts
~~~

CI runs application tests, TypeScript checks, builds, and Foundry tests. Backend tests use a disposable MongoDB replica set with mocked remote World ID and chain calls. Solidity tests execute the contracts locally. These do not establish live Atlas, World App, or Sepolia availability. See [executed verification](docs/VERIFICATION.md).

## Contracts and hosting

The OpenZeppelin ERC-20 permits only its distributor to mint. The distributor enforces a fixed amount, an authorized role, a nonzero recipient, and a unique reward ID. It supports pausing and delayed administrator transfer.

The worker persists signed transaction bytes before broadcasting. Restarts reconcile the recorded transaction. Ambiguous network failures rebroadcast the same bytes without allocating another nonce. Claims retain their original destination after wallet changes. Confirmed claims unlock badges idempotently. Finalized reverts are journaled and signed retries are bounded.

Deploy with the checked-in Foundry script and a protected deployer keystore; commands are in [Rewards](docs/REWARDS.md). The operational signer is a dedicated testnet account, not an HSM or production custody service. Pending fee/nonce problems may need operator reconciliation.

[netlify.toml](netlify.toml) defines the frontend build and SPA fallback. [render.yaml](render.yaml) defines the API build, health endpoint, and private settings. Configure actual domains following [Deployment](docs/DEPLOYMENT.md), including HTTPS, CORS, CSRF, and cookie policy. The guide also covers a same-origin API proxy and sleeping-host limitations.

Netlify and Render services have not been provisioned. The current Sepolia addresses and verification links are in [Deployed contracts](DEPLOYED_CONTRACTS.md). Follow [Demo](docs/DEMO.md) for the complete presentation and how to label unavailable live integrations.

## Project structure

| Location | Responsibility |
| --- | --- |
| frontend/src/app, frontend/src/components | Preserved Developer routes, player, and eight-stage layout |
| frontend/src/content, frontend/src/simulations | Curriculum, explanations, and interactive models |
| frontend/src/content/everyday.ts | Everyday lesson content |
| frontend/src/platform | Everyday demos, accounts, assessments, World ID, wallet, dashboard, profiles |
| packages/shared/curriculum.ts | Stable chapter IDs, reward scopes, badge policies |
| backend/src/content/assessments.ts | Private answer keys and explanations |
| backend/src | API, MongoDB models, sessions, identity, wallet proofs, durable rewards |
| contracts/src, contracts/test, contracts/script | ERC-20, distributor, Foundry tests, deployment |
| docs and EXTERNAL_SETUP.md | Architecture, operations, setup, deployment, verification, demo |

Keep lesson instructions and experiment controls in agreement. Introduce the idea before its technical term, explain every result, and state model limits. See [Architecture](docs/ARCHITECTURE.md) for data ownership and security boundaries.
