// Server-only answer keys. Each row is question | correct | three distractors | explanation.
// The sixth question is the Master Challenge. Never serialize a Question directly.
export type Question = { id:string; prompt:string; options:string[]; answer:number; explanation:string };
const banks: Record<string,string> = {
'dev-00': `Who normally controls a Web2 application's authoritative balance record?|The service operating its database|Every browser equally|A CSS stylesheet|The user's screen resolution|The backend checks requests and updates its own records.
Does changing a displayed balance with browser tools change the server record?|No|Always|Only on mobile|Only when logged in|The display is not the authoritative database.
What does authentication establish?|Which account is making a request|Whether every action is permitted|That every record is correct|That the service cannot fail|Authorization separately decides which actions that account may take.
What can a database audit log help investigate?|Who changed a record and when|Whether all users are unique humans|Whether servers can never fail|Whether a payment is finalized on Ethereum|Logs provide evidence subject to the operator's controls.
Can replication eliminate all operator trust?|No|Yes with two copies|Yes with backups|Yes with a green status icon|The same operator may control every copy.
An administrator can edit balances and delete its own logs. What remains necessary?|Trust in the operator and its controls|Trust only in the browser font|No trust because there are logs|A wallet signature for every SQL query|Operator-controlled evidence does not independently constrain the operator.`,
'dev-01': `What does replication create?|Copies of records|Automatic agreement on all updates|Private signing keys|Free storage|Copies can improve availability but require rules for conflicting updates.
Two isolated replicas receive different edits. What can happen?|Their records diverge|Both edits become one automatically|Neither can store data|All data becomes encrypted|Communication and conflict rules determine reconciliation.
What does a peer message provide?|Information another node can check|Automatic permission to alter any balance|Guaranteed truth|Finality|Nodes still validate received data.
Why can two nodes temporarily see different transactions?|Messages arrive at different times|Ethereum uses one shared RAM chip|All nodes must be offline|Signatures expire instantly|Network propagation is not instantaneous.
Does a majority of copied files establish Ethereum consensus?|No|Yes regardless of stake|Yes if names match|Yes if one server makes copies|Consensus requires protocol-specific validity and voting rules.
A peer sends a conflicting balance update. What should a receiving node do?|Apply shared validation and agreement rules|Accept it because it arrived first|Accept it because the peer is popular|Ignore all future peers|Communication alone does not establish a valid shared history.`,
'dev-02': `What is a cryptographic hash used for here?|A fingerprint of data|Recovering an encrypted password|Creating a private key from any address|Proving the sender's intent alone|Changing input normally changes its fingerprint.
Does matching a hash prove an outside claim is true?|No|Yes|Only for prices|Only for long messages|A fingerprint concerns data integrity rather than real-world truth.
What does a valid signature demonstrate?|Authorization by the corresponding signing key|Guaranteed transaction success|Guaranteed profitability|Permanent network finality|Execution and consensus checks remain separate.
What happens after changing a signed message?|The old signature should not validate for the new message|The signature updates itself|The key becomes public|All balances reset|The signature binds to the message that was signed.
Why link blocks to previous hashes?|To make history changes detectable|To hide every transaction|To make consensus unnecessary|To waive fees|Changing old data breaks later references unless recomputed.
An attacker recomputes hashes after editing a toy chain. What is still missing?|Acceptance under real network consensus rules|More colorful blocks|A larger file name|Nothing at all|Hash links alone do not authorize rewriting Ethereum history.`,
'dev-03': `Which client runs transaction execution?|Execution client|Consensus client alone|Browser extension alone|DNS resolver|Execution computes the resulting state under EVM rules.
Which client handles proof-of-stake consensus duties?|Consensus client|CSS engine|SQL migration tool|Wallet address book|Consensus tracks proposals and attestations.
What connects execution and consensus clients?|Engine API|ERC-20 allowance|An NFT image|A seed phrase|The Engine API coordinates payload execution and consensus decisions.
What commonly connects apps to an execution node?|JSON-RPC|A validator seed phrase|A bank login|An HTML comment|RPC exposes methods for reading state and submitting requests.
Can valid execution alone prove finality?|No|Always|Only for large transfers|Only for contract calls|Consensus supplies finality separately.
A payload executes correctly but its branch loses fork choice. What follows?|Correct execution alone does not keep that branch canonical|The EVM is broken|Every signature was invalid|The payload must be finalized|Execution validity and consensus selection answer different questions.`,
'dev-04': `What authorizes an ordinary EOA transaction?|A valid signature|An account nickname|A block explorer screenshot|An RPC URL|The signature binds the request to the signing key.
What does the account nonce help prevent?|Repeated execution of the same account request|All contract bugs|All price changes|All front-running|The expected sequence number prevents ordinary transaction replay.
Why include a chain ID in signed transactions?|To bind authorization to a chain|To set the ETH price|To identify a browser|To guarantee finality|Chain binding reduces replay across different chains.
What happens to the sender nonce after an included transaction reverts?|It is consumed|It is always restored|It doubles|It becomes a private key|Replay protection and fee accounting remain even when application changes revert.
Does a wallet contain the onchain balance itself?|No, it presents and authorizes account interactions|Yes in its icon|Yes in a cookie|Yes in the recovery phrase text|The network state records balances.
An attacker resubmits a previously included EOA transaction unchanged. What blocks ordinary replay?|The account's already-consumed nonce|Its gas limit alone|The current clock alone|The user's display name|The sender's expected nonce has advanced.`,
'dev-05': `Are all transaction pools identical?|No, pools are local views|Yes, they share one database|Yes, by definition|Only on weekends|Propagation and node policies differ.
Why might a future-nonce request wait?|Earlier account nonces are missing|It has already finalized|Its signature is necessarily fake|Its token icon is missing|Pool acceptance is different from eligibility for immediate execution.
What does a successful receipt describe?|Execution of an included transaction|An unsubmitted wallet draft|Guaranteed finality|An unchangeable website|Receipt status is distinct from consensus finality.
What happens to reverted execution logs?|They are discarded with reverted state|They remain successful events|They double|They become validator votes|Logs from reverted execution do not become committed receipt logs.
Can a reverted included transaction use gas?|Yes|Never|Only with no signature|Only before submission|Work performed still has a cost.
A receipt has success status but the block is not finalized. What is accurate?|Execution succeeded in that block; finality is separate|The transaction cannot be reorganized|No gas was charged|All nodes must have finalized it|Status and finality are different observations.`,
'dev-06': `What does the EVM stack hold?|Temporary operands|All blockchain history|Wallet passwords|Consensus votes|Opcodes use stack operands during execution.
Which store persists across successful calls?|Contract storage|Temporary memory|The current stack|A local variable in a browser|Storage changes commit with successful execution.
What happens to memory between separate transactions?|It does not persist as contract storage|It becomes public keys|It is always copied into every slot|It determines stake|Memory is temporary execution workspace.
Why must nodes get the same execution result?|They must agree on resulting state|To make all fees zero|To hide instructions|To remove signatures|Valid execution is deterministic for the same state and inputs.
What does a top-level revert roll back?|Application changes from that execution|All historical blocks|The included sender nonce|All gas already spent|Fee and nonce accounting remain distinct.
A call writes storage then reverts. Which outcome is expected?|The storage write rolls back while used gas is charged|The storage persists free of charge|The account nonce is restored|Every prior transaction reverts|Execution failure does not erase the cost of running instructions.`,
'dev-07': `What does gas measure?|Execution work|The ETH exchange rate|Number of human users|Wallet popularity|Gas units and price per unit are separate.
What is a transaction gas limit?|A maximum gas allowance|The exact fee always paid|A validator balance|A token approval|Unused allowance is not work performed.
Where does the base fee go?|It is burned|Entirely to the proposer|To the sender's wallet|To an NFT contract|The priority fee is the proposer incentive component.
What bounds the effective priority fee?|The tip cap and fee cap minus base fee|Only the recipient balance|Only the nonce|Only the block timestamp|The effective gas price cannot exceed the transaction's fee cap.
What if the fee cap is below the block base fee?|The transaction is not eligible for that block|It executes for free|The sender receives a subsidy|Its nonce must be consumed anyway|Fee conditions must be valid for inclusion.
Gas used is 21000, base fee 20 gwei, tip cap 3, fee cap 22. What is paid per gas?|22 gwei|23 gwei|3 gwei|20 ETH|The fee cap leaves 2 gwei for the tip, giving 20 plus 2.`,
'dev-08': `What weights Ethereum attestations?|Validator stake|Number of browser tabs|Number of arbitrary peers|Number of usernames|Consensus uses stake-weighted participation.
What is a slot?|A protocol opportunity for a block proposal|A guaranteed block|A gas refund|A private key|A slot may be missed.
What groups slots?|An epoch|An ERC-20 transfer|A wallet popup|A mempool receipt|Epochs organize consensus duties and checkpoints.
What does fork choice select?|The current chain head|A user's private key|A token's price|The next CSS theme|Head choice is distinct from finality.
Does counting machines alone describe proof of stake?|No|Yes|Only for laptops|Only if all IPs differ|Stake and protocol rules matter, not arbitrary machine count.
A block becomes the current head. Is it automatically finalized?|No, finality has additional consensus conditions|Yes immediately|Only if its transaction count is even|Only if its proposer is online|Head selection and checkpoint finality are separate mechanisms.`,
'dev-09': `What comes before a node can process a request?|It must receive and validate it|It must already finalize it|It must mint a badge|It must erase the sender nonce|Submission and validation precede inclusion.
Does submission guarantee inclusion?|No|Yes|Only if the wallet closes|Only if an RPC returns a hash|A transaction hash identifies a request, not its eventual inclusion.
What determines application state changes?|Execution under protocol rules|Wallet color|Explorer page views|Token marketing|Nodes execute valid transactions to compute state.
What commits a block's transactions?|A transactions root|A user's password|A domain name|An avatar|Roots summarize specific block data.
What improves certainty beyond first inclusion?|Consensus finality|Refreshing a wallet icon|Renaming a transaction|Increasing browser storage|Finality is a network property, not a UI refresh.
The wallet shows a hash but no receipt. What should the app report?|Submitted or pending, not confirmed success|Finalized success|Guaranteed failure|Tokens already minted|Track each milestone from actual evidence.`,
'dev-10': `What is an ABI used for?|Encoding and interpreting contract interactions|Protecting recovery phrases|Electing validators|Setting all fees|An ABI describes callable interfaces and event data.
Does eth_call persist its simulated writes?|No|Always|Only if the browser is logged in|Only if gas is high|A read simulation does not submit a state-changing transaction.
What is deployment?|Creating a contract through a transaction|Uploading only an image|Renaming an address|Editing all existing contracts|Deployment places contract code and initial state onchain.
Why do indexers track events?|To build searchable application views|To replace consensus|To own private keys|To guarantee prices|Indexers derive views and must handle missing or reorganized data.
Can editing local source change already deployed immutable code?|No|Yes automatically|Only in a text editor|Only if a tab stays open|A new deployment or explicit upgrade mechanism is needed.
An RPC returns a transaction hash for a contract write. What should the frontend do next?|Track its receipt and relevant confirmation state|Immediately assume final success|Delete the pending state|Treat eth_call as a finalized write|Submission acknowledgment is not execution evidence.`,
'dev-11': `What does a rollup need beyond execution?|Settlement and sufficient data availability|Only a fast logo|Only private spreadsheets|Only low fees|Other participants need the protocol's data and verification path.
What risk does a bridge add?|Its own verification and custody assumptions|Automatic risk elimination|Guaranteed instant finality|Free insurance|Cross-system transfers introduce additional mechanisms.
What does an oracle provide?|Reports about outside information|Guaranteed truth|Private account passwords|Consensus finality|Reports still depend on data quality and design.
Can three correlated reporters all be wrong?|Yes|Never|Only if unsigned|Only with one wallet|Shared bad inputs defeat assumed independence.
What does a paymaster change?|Who pays under a sponsorship policy|Whether authorization is required|Whether execution can fail|Whether all requests finalize|Funding and authorization remain separate.
A fresh median uses three publishers copying one bad source. What remains?|A shared source failure|Proof that the price is correct|Guaranteed decentralization|Automatic recovery of losses|Freshness and agreement do not establish independent truth.`,
'dev-12': `What did historical proof of work require?|Repeated work finding valid block proofs|A browser vote|A free nonce lookup|An ERC-20 approval|Mining expended computation under difficulty rules.
What changed at the Merge?|Ethereum's consensus mechanism|Every contract balance was deleted|All apps changed addresses|Gas became permanently free|Proof of stake replaced proof of work consensus.
What generally remained through the Merge?|Execution state and contract continuity|Mining as the consensus mechanism|A need to migrate every token manually|A new copy of each private key|The transition preserved the execution history and state.
Does more toy mining success prove real network security?|No|Yes|Only for a fast laptop|Only with colorful hashes|A teaching puzzle omits real network economics and consensus.
Does the Merge mean Ethereum still mines mainnet blocks?|No|Yes|Only for NFTs|Only at night|Mainnet consensus uses proof of stake.
A website says the Merge requires revealing a phrase to migrate ETH. What is correct?|Reject the request; no phrase migration was required|Provide the phrase|Pay a mandatory migration fee|Create a new key from the website|The Merge preserved accounts; recovery phrases must remain private.`,
'dev-13': `What is an EIP?|A proposal describing an Ethereum improvement|An automatic deployment|A user's private account|A guaranteed network vote|Proposals still need review and adoption.
What does an ERC standard help define?|A common interface or convention|Guaranteed token value|Unlimited mint authority for everyone|A compulsory wallet brand|Interfaces help independently built applications interoperate.
Does publishing a proposal activate it?|No|Always|Only if numbered|Only if widely shared|Adoption and protocol activation are separate steps.
What does ERC-20 approve change?|A spender's allowance|The total supply automatically|The owner's private key|The validator set|Approval grants a bounded spending permission.
What influences the next EIP-1559 base fee?|Block gas usage relative to its target|An avatar color|A token ticker|The number of browser tabs|The protocol adjusts the base fee using block utilization.
A token follows ERC-20. What may an integrator assume?|It exposes the expected interface, not that it is trustworthy or valuable|It cannot contain malicious behavior|It guarantees profit|It is officially endorsed by Ethereum|Standards improve interoperability without certifying assets.`,
'everyday-1': `What can Web3 applications use?|Shared blockchain records|Only paper receipts|Only private diaries|Only offline photos|Web3 commonly uses shared records and wallets.
Must every application use a blockchain?|No|Yes|Only shopping apps|Only social apps|Choose technology for the need.
What should remain private?|A recovery phrase|A receiving address you choose to share|A public project name|A published block number|Recovery phrases can control accounts.
Does a public record remove all trust?|No|Yes|Only if copied|Only if searchable|Outside facts and application design still matter.
What is a useful first learning action?|Try a simulation|Buy unknown tokens|Share signing secrets|Approve every popup|Simulation provides practice without real funds.
A service wants private health notes on a public chain. What concern should you raise?|Public visibility may harm privacy|Blockchains hide everything|Wallets make all data secret|Fees guarantee confidentiality|Shared public storage is not automatically appropriate for sensitive information.`,
'everyday-2': `How are blocks connected?|References to earlier blocks|Wallet colors|User birthdays|Website passwords|Links help expose changes to history.
Who checks records in a blockchain network?|Participating nodes following rules|Only a website logo|Only an NFT artist|Only the person receiving money|Network participants verify according to protocol rules.
Can copied records disagree temporarily?|Yes|Never|Only on paper|Only if encrypted|Updates and network messages take time.
Does a hash link prove a price is truthful?|No|Yes|Only for ETH|Only for long numbers|Integrity and outside truth differ.
Why inspect a record's history?|To understand recorded changes|To reveal everyone's keys|To erase fees|To guarantee investment returns|History records changes, not all possible truths.
Someone edits a page in a linked receipt book. What can broken references show?|The recorded data changed|Who is legally right|That all other books are honest|That no agreement rules are needed|Links reveal inconsistency, not the authority to choose history.`,
'everyday-3': `What is Ethereum?|A network for shared state and programs|Only a coin logo|One person's database|A password manager|Ethereum supports transactions and smart contracts.
What is ETH?|Ethereum's native asset|Every token ever created|An email address|A recovery phrase|ETH is used for network fees and other purposes.
What is a node?|A participant running network software|A wallet picture|An NFT image|A bank password|Nodes help verify and relay network information.
Does closing a website delete onchain balances?|No|Yes|Only on phones|Only at midnight|The website is an interface to shared state.
Does a transaction always cost zero?|No|Yes|Only if called Web3|Only when sent twice|Network work usually involves fees.
Two interfaces display the same account. Where is its Ethereum balance recorded?|In network state|Inside the first website's icon|Only in browser history|In the username spelling|Interfaces can read the same shared record.`,
'everyday-4': `What does a wallet help you do?|Review and authorize account requests|Guarantee every investment|Erase all fees|Control every node|Wallets provide an account interface.
Does viewing a balance send a payment?|No|Yes|Only on desktop|Only when connected|Reading and authorizing are separate.
What should you inspect before approving a transfer?|Destination, network, amount and fee|Only the button color|Only the logo|Only social followers|Review the actual requested action.
Is a connected site entitled to every signature?|No|Yes|Only after ten minutes|Only if it is popular|Each request needs its own review.
Can wallet recovery rules differ?|Yes|Never|Only by screen size|Only by language|Custody and account design affect recovery.
A wallet opens an unexpected approval popup. What is a valid action?|Reject it and investigate|Approve to close it|Type a recovery phrase|Ignore the amount and sign|You can decline unexplained authorization requests.`,
'everyday-5': `Which item is a public destination?|An account address|A private key|A recovery phrase|A password|Addresses can receive transfers.
What can a private key authorize?|Actions for its account|Every account on Ethereum|Changes to all fees|Network shutdown|Signing authority belongs to the corresponding account.
What can a recovery phrase restore?|Keys in compatible wallets|Any lost username anywhere|All scam losses|The entire Ethereum network|Protect phrases as signing secrets.
Should support need your recovery phrase?|No|Yes always|Only for rewards|Only for updates|Never share it to troubleshoot or claim a reward.
Can a public address reveal activity?|Yes|Never|Only if it contains a name|Only with a password|Public activity can be linked to an address.
A reward form asks for twelve recovery words. What should you do?|Leave without entering them|Enter them quickly|Send a screenshot|Share them only in a private chat|A reward destination needs an address, not signing secrets.`,
'everyday-6': `What does pending mean?|The request is awaiting later processing|Guaranteed final success|The keys are deleted|The network owes a refund|Pending is not finality.
What does a signature authorize?|The specific request being signed|All future requests automatically|Every website|Every chain regardless of signing rules|Read what the signature binds to.
What can a receipt show?|Included execution status|The recovery phrase|Guaranteed profit|Every future network state|A receipt supplies execution evidence.
Can an included transaction fail execution?|Yes|Never|Only if unsigned|Only if offline|A contract action can revert after inclusion.
Is finality distinct from first inclusion?|Yes|No|Only for photos|Only for small transfers|Consensus finality provides a later assurance.
Your wallet has a transaction hash but no receipt. What is appropriate?|Treat it as submitted, not proven successful|Tell the recipient it is finalized|Delete the request|Assume no fee can ever be paid|A hash alone is not execution confirmation.`,
'everyday-7': `What does gas measure?|Work used by a transaction|The number of wallet icons|The token's popularity|A person's identity|Gas is a unit of work.
What determines a simple fee calculation?|Gas used times price per gas|Only the transfer amount|Only a username|Only the recipient age|Work and unit price are different factors.
Is the gas limit always fully charged?|No|Yes|Only on weekends|Only with green buttons|Unused allowance is not used work.
Can a reverted operation pay a fee?|Yes|Never|Only if successful|Only if a user complains|Execution before failure still used work.
Should you review estimated fees?|Yes|Never|Only after signing|Only if sharing a key|Fees affect the request's cost.
At two demo fee units per work unit, a failed action uses four units. What cost does the model show?|Eight fee units|Zero fee units|Two fee units|Four ETH|Failed application changes do not erase performed work.`,
'everyday-8': `What is a smart contract?|A program on the blockchain|A legal guarantee from every node|A recovery service|An ordinary picture|Code applies defined rules.
Can contract code contain bugs?|Yes|Never|Only in private chains|Only if fees are low|Public execution does not guarantee good code.
What triggers a normal contract action?|A call through execution|Its website being bookmarked|An image download|A changed username|Programs execute as part of requests.
Can a contract directly know a real-world temperature?|Not without supplied information|Always|Only by having a logo|Only by charging more gas|Outside reports require additional mechanisms.
What happens when a modeled ticket rule rejects missing payment?|No ticket is reserved|A free ticket appears|All tickets disappear|Every other user loses access|The rule checks conditions before applying the reservation.
A contract promises a physical delivery. What else is needed?|Trustworthy real-world fulfillment|Only the word smart|Only a token picture|Only a high fee|Code cannot by itself guarantee a physical promise.`,
'everyday-9': `Where is a token balance recorded?|In the token contract's state|Inside its icon|Only in a chat|In an email password|The contract tracks balances.
What helps distinguish tokens with identical names?|Network and contract address|Only logo color|Only ticker|Only influencer mentions|Names and icons can be copied; the network and contract identify the token.
What does ERC-20 describe?|A common interchangeable-token interface|Guaranteed market value|A universal insurance policy|A required wallet company|The standard supports interoperability.
What does approval grant?|A spender allowance|Ownership of every token|A new private key|Guaranteed finality|Review who may spend and how much.
Is approval identical to transfer?|No|Yes always|Only with round amounts|Only with no balance|Permission can exist before a later transfer.
An unknown spender requests unlimited allowance for a small task. What is sensible?|Reject or reduce permission after verifying the need|Accept because approval cannot matter|Share a phrase instead|Assume all ERC-20 tokens are safe|Allowances create spending authority and deserve review.`,
'everyday-10': `What distinguishes an NFT?|Its contract and token ID|Only the image color|Only the owner's name|Only its price|Identity is separate from media appearance.
Does an NFT automatically grant copyright?|No|Yes|Only if expensive|Only if numbered|Rights need separate terms.
Can linked media become unavailable?|Yes|Never|Only if the token is transferred|Only if its name changes|External storage has availability assumptions.
Can an NFT represent membership?|Yes, under defined terms|Never|Only if it guarantees profit|Only with private keys in its image|Benefits depend on the issuer and rules.
Is an NFT necessarily an investment?|No|Yes|Only if it has a picture|Only if its ID is low|Tokens can represent many things without profit promises.
An image server disappears but token ownership remains recorded. What does this show?|Token records and media availability are separate|The owner acquired copyright|The chain must have stopped|The token guarantees a refund|Inspect where associated content is stored.`,
'everyday-11': `What is a dapp interface?|A way to interact with blockchain applications|Proof that every contract is safe|A recovery phrase generator for strangers|A guarantee of no fees|Interfaces and underlying contracts have separate risks.
What does wallet connection commonly reveal?|A public address|The recovery phrase|All private keys|A database password|Connection is not blanket spending approval.
Should each signing request be reviewed?|Yes|No|Only the first one|Only after money moves|Signatures can grant authority.
Does disconnecting a site necessarily revoke onchain allowances?|No|Yes|Only if the tab closes|Only on mobile|Onchain permissions may need separate revocation.
Can a familiar-looking website be fake?|Yes|Never|Only without a logo|Only with slow loading|Branding is easy to imitate.
A site remains disconnected but its old token allowance exists. Why?|Connection state and onchain permissions are separate|The private key is public|Ethereum ignored the browser|All approvals expire instantly|Closing a connection does not rewrite contract state.`,
'everyday-12': `What should you compare before sending?|The complete destination address|Only its first character|Only its avatar|Only a nickname|Lookalike addresses can be misleading.
Why check the network?|The destination and asset must be supported there|All networks share identical balances|It removes every fee|It proves website honesty|Sending on the wrong network can create problems.
What should unclear permissions prompt?|Pause and investigate|Automatic approval|Sharing a key|Paying twice|Do not authorize something you cannot explain.
Does a small successful test prove a contract is safe?|No|Yes|Only if fast|Only if cheap|A test can reveal some errors, not every risk.
Are authorized mistakes always reversible by support?|No|Yes|Only with a screenshot|Only within one hour|There is usually no universal reversal service.
A destination matches only the first and last characters of a trusted address. What should you do?|Compare the full address through a trusted source|Assume it is identical|Ignore the network|Send more to test|Partial similarity is insufficient verification.`,
'everyday-13': `What is a common phishing tactic?|Impersonating trusted support|Explaining risks clearly|Encouraging independent checks|Refusing to request secrets|Impersonation exploits familiar names.
How should guaranteed-return pressure be treated?|As a warning sign|As proof of safety|As a protocol rule|As a bank guarantee|Urgency and certainty do not establish legitimacy.
Does an unexpected token require visiting its linked website?|No|Yes|Only before midnight|Only if the token name says reward|Unsolicited assets can advertise traps.
What is a safer way to contact support?|Navigate independently to an official channel|Use every message link|Send a phrase to the caller|Trust the profile picture|Check the source through an independent route.
Should you sign an unreadable request to stop a countdown?|No|Yes|Only once|Only on desktop|Pressure does not justify unclear authority.
A stranger requires an advance transfer to release guaranteed winnings. What is the safer response?|Stop and independently verify; do not pay under pressure|Send the requested amount immediately|Share a private key instead|Borrow funds to pay faster|Advance-payment schemes and urgency are warning signs.`,
'everyday-14': `What can a blockchain donation record establish?|A recorded transfer|Physical delivery of every item|Honesty of all organizers|No need for receipts|Payment and fulfillment are different facts.
What remains important for outside reports?|Reliable data sources|Only a token logo|Only follower count|Only high fees|The ledger cannot directly observe every event.
When might a private database be preferable?|When sensitive records need controlled access|Never|Only if the app is small|Only if users have wallets|Privacy and cost are design considerations.
Can digital credentials benefit from verifiable records?|Yes, with appropriate design|Only if all private data is public|Only if tokens are expensive|Never|Verification must still respect issuer trust and privacy.
Does shared recordkeeping eliminate governance choices?|No|Yes|Only with many users|Only on testnets|People still choose rules and responsibilities.
A supply-chain record says a package was cold. What remains uncertain?|Whether the sensor report accurately described reality|Whether a record can have a timestamp|Whether text can be stored|Whether websites can display it|Recording a claim does not guarantee the underlying observation.`,
'everyday-15': `What should precede signing?|Understanding the request|Closing your eyes|Sharing a recovery phrase|Following a countdown|Review authority before granting it.
Can you learn without real funds?|Yes, using simulations|Never|Only with an exchange account|Only after buying ETH|Practice can be local and risk-free.
Which is different from a private key?|A public receiving address|A recovery secret|A signing secret|An account authorization secret|Public destinations are not signing authority.
What should be checked after submission?|Receipt and confirmation state|Only a success animation|Only social likes|Only a wallet theme|Use evidence for the actual transaction stage.
Where can a beginner explore technical mechanisms next?|Developer Explore Mode|An unsolicited reward form|A stranger's seed-phrase chat|A guaranteed-return group|Curated simulations provide a route into deeper explanations.
A new app asks you to sign something you cannot explain. What best applies your learning?|Pause, reject, and seek a clear explanation|Approve because you finished a course|Share a key for help|Trust its celebration animation|Learning supports informed decisions; it does not make every new request safe.`,
};
export const assessments = Object.fromEntries(Object.entries(banks).map(([id,text])=>{
  const rows=text.split('\n').map((row,i)=>{const [prompt,correct,a,b,c,explanation]=row.split('|'); const answer=i%4; const options=[a,b,c]; options.splice(answer,0,correct); return {id:`q${i+1}`,prompt,options,answer,explanation};});
  if(rows.length!==6 || rows.some(q=>q.options.length!==4 || !q.explanation)) throw new Error(`Incomplete assessment ${id}`);
  return [id,{quiz:rows.slice(0,5),master:rows[5]}];
}));
export function publicQuestion(q:Question){return {id:q.id,prompt:q.prompt,options:q.options};}
