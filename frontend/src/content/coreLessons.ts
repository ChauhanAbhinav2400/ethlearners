import type { Lesson } from './types';

// Core concepts: explanations refined on 18 October 2026.
export const coreLessons: Lesson[] = [
  {
    "id": "source-of-truth",
    "worldId": "00",
    "title": "Who decides what’s true?",
    "shortTitle": "The source of truth",
    "summary": "A familiar app. A simple transfer. One question that changes how you think about trust.",
    "duration": 5,
    "simulation": "banking",
    "aliases": [
      "bank",
      "banking",
      "Web2",
      "React",
      "Node.js",
      "database",
      "centralization",
      "trust",
      "authority",
      "API",
      "authentication",
      "authorization"
    ],
    "prerequisites": [],
    "related": [
      "replication",
      "ethereum-node"
    ],
    "intro": [
      "Let’s say you’re building a simple payment application.",
      "A user opens your website, creates an account, and sends ₹500 to a friend. You have a React frontend, a Node.js backend, and a database where you store the user’s balance.",
      "Everything works fine. The backend updates the database, and the new balance appears on the screen. But let me ask you something. Who actually decides how much money that user has?"
    ],
    "question": {
      "prompt": "In this application, which record is treated as the source of truth?",
      "options": [
        "The balance shown in React",
        "The database record used by the backend",
        "Whichever value the user remembers"
      ],
      "answer": 1,
      "explanation": "React displays a result. The backend applies the application’s rules, and this application treats its database record as authoritative."
    },
    "experiment": "Send a simulated transfer. Switch between Website, Backend, and Database. Then use the explicit unauthorized-change control and return to the website. Follow the same balance through all three views.",
    "reveal": "The React application is the interface. The backend processes requests, and the database stores the records. Change the record in our toy system and the website follows it. The organization operating the backend and database has authority over the shared record.",
    "mentalModel": "A source of truth is the record your system agrees to treat as authoritative.",
    "deepDive": [
      {
        "title": "The server checks permission",
        "example": "Alice asks to send Bob ₹500. Typing “Alice” into a request is not enough. The server must check who sent it and whether that person can spend her balance.",
        "body": "Checking who you are is authentication. Checking what you may do is authorization. Both checks belong on the server, because someone can change the code running in their own browser.\n\nThe two balance updates should succeed together or fail together. A database transaction can provide that all-or-nothing step.",
        "code": "// Teaching sketch, not production payment code\ncheckIdentity(request);\ncheckPermission(request);\nupdateBothBalancesTogether();"
      },
      {
        "title": "A secure system can still have an owner",
        "example": "A bank may protect its records very well. You still rely on that bank to keep the records available, follow its policies, and resolve disputes.",
        "body": "Security and control are different questions. Access controls, audit logs, backups, and reviews make a centralized service safer. They do not remove the organization’s authority over the service.\n\nThe experiment bypasses those protections on purpose. It shows which record the app trusts, not how to break into a real database."
      }
    ],
    "boundary": "This is a local teaching simulation, not a banking security model. The unauthorized-change button deliberately bypasses controls to make authority visible. It does not show an exploit or imply that real databases are easy to change.",
    "check": {
      "prompt": "You add three database replicas controlled by the same company. What has definitely changed?",
      "options": [
        "No one needs to trust the company anymore",
        "Every stored transfer is now legitimate",
        "The system has more copies of its records"
      ],
      "answer": 2,
      "explanation": "Replication can improve availability. It does not by itself remove the operator’s authority or prove that an update was authorized."
    },
    "nextQuestion": "What if we kept copies with different participants, so one organization did not control the only record?",
    "sources": [
      {
        "title": "Ethereum: Web2 and Web3 trust models",
        "url": "https://ethereum.org/en/developers/docs/web2-vs-web3/"
      }
    ],
    "relatedWhy": {
      "replication": "Try keeping several copies, then ask whether that removes the need for trust.",
      "ethereum-node": "Compare one company’s database with a node that checks shared rules."
    }
  },
  {
    "id": "replication",
    "worldId": "01",
    "title": "Five copies. One truth?",
    "shortTitle": "Replication is not agreement",
    "summary": "Copy the balance to five computers. Then discover the question copying cannot answer.",
    "duration": 6,
    "simulation": "replication",
    "aliases": [
      "distributed systems",
      "replicas",
      "replication",
      "consistency",
      "agreement",
      "shared records",
      "validation"
    ],
    "prerequisites": [
      "source-of-truth"
    ],
    "related": [
      "peers",
      "signatures",
      "consensus"
    ],
    "intro": [
      "In the previous example, we had one application server and one database. The application owner controlled the records.",
      "So let’s try something different. What if we keep copies of the same data on multiple computers? Even if one computer goes offline, the others still have their copies. Sounds better, right?",
      "But if someone changes the balance on one computer, should everyone else accept the new value? Should they reject it? And how would they know which value is correct?"
    ],
    "question": {
      "prompt": "Node 2 changes Alice’s balance from ₹1,000 to ₹5,000. What does that tell the other nodes?",
      "options": [
        "Alice definitely received ₹4,000",
        "They should automatically copy Node 2",
        "One copy changed; they still need evidence and rules"
      ],
      "answer": 2,
      "explanation": "A changed value is an observation, not authorization. The nodes need rules for valid updates and a way to handle conflicting histories."
    },
    "experiment": "Start with five copies of ₹1,000. Change Node 2 to ₹5,000, compare the records, and then copy ₹5,000 to every node. Watch the difference between disagreement and an unsupported update that everyone now shares.",
    "reveal": "We discovered two problems. Replication keeps copies of data. Validation decides whether a proposed change follows the rules. Even when all five copies match, nothing in this experiment proves that Alice was entitled to the extra ₹4,000.",
    "mentalModel": "Matching records tell you that copies agree. They do not tell you why the records deserve to be trusted.",
    "deepDive": [
      {
        "title": "Copy, check, then agree",
        "example": "Five computers can all display ₹5,000 because someone copied that number. They still need evidence that Alice actually received another ₹4,000.",
        "body": "Keeping copies is replication. Checking whether an update follows the rules is validation. Choosing a shared order of valid updates is part of consensus.\n\nThese jobs work together. Copying more data does not replace the checks that explain why an update is allowed."
      },
      {
        "title": "An old copy and an invented copy differ",
        "example": "Node 5 misses a transfer while it is offline. Node 2 invents an extra ₹4,000. Both disagree with their peers, but for different reasons.",
        "body": "An offline node needs the updates it missed. An invented update should fail the shared rules. A useful system must handle both cases without treating every disagreement as an attack.\n\nA transfer record can include the sender’s signature, amount, and a counter that prevents reuse. A balance alone does not contain that evidence."
      }
    ],
    "boundary": "The five nodes are local state objects. There is no replication protocol or consensus implementation behind the copy button. More computers alone do not make a blockchain secure, and agreement is not proof that a rule is sensible.",
    "check": {
      "prompt": "All five nodes now display ₹5,000. What remains unproven?",
      "options": [
        "Whether that balance change was valid and authorized",
        "Whether the displayed numbers match",
        "Whether more than one copy exists"
      ],
      "answer": 0,
      "explanation": "They match because you copied a value. We still need evidence of an authorized, valid transition and rules for choosing a history."
    },
    "nextQuestion": "If these computers belong to different people, how do they exchange records without a central server?",
    "sources": [
      {
        "title": "Ethereum nodes validate their own data",
        "url": "https://ethereum.org/en/developers/docs/nodes-and-clients/"
      },
      {
        "title": "Peer-to-peer networking",
        "url": "https://ethereum.org/en/developers/docs/networking-layer/"
      }
    ],
    "relatedWhy": {
      "peers": "Copies need a way to exchange updates.",
      "signatures": "A copied update still needs evidence of permission.",
      "consensus": "Valid updates can conflict; consensus helps choose their history."
    }
  },
  {
    "id": "peers",
    "worldId": "01",
    "title": "Pass it to a peer",
    "shortTitle": "Peers & messages",
    "summary": "Let a message travel through neighbors. Disconnect one and see what the network can still do.",
    "duration": 4,
    "simulation": "peers",
    "aliases": [
      "p2p",
      "peer-to-peer",
      "gossip",
      "propagation",
      "network",
      "nodes",
      "offline"
    ],
    "prerequisites": [
      "replication"
    ],
    "related": [
      "ethereum-node",
      "transaction-journey"
    ],
    "intro": [
      "Our computers have separate copies. Now they need a way to hear about changes.",
      "Instead of sending everything through one application server, each computer connects to a few others. Those connections are its peers. Let’s pass a message through them."
    ],
    "question": {
      "prompt": "A node receives a message from a peer. Does receipt mean the message is valid?",
      "options": [
        "Yes, because a peer sent it",
        "No, it still needs to check the message",
        "Only if the message arrives first"
      ],
      "answer": 1,
      "explanation": "Transport tells you what was received. Validation decides whether it obeys the rules; arrival order is not proof."
    },
    "experiment": "Broadcast a message and advance its delivery through the network. Disconnect a node, broadcast again, and inspect which connected peers receive it. Reset to compare the two runs.",
    "reveal": "A message can spread through several neighbor-to-neighbor hops. An offline node misses messages, and different peers can learn about an update at different times. Networking moves information; it does not decide the truth of that information.",
    "mentalModel": "A peer is a connection to another participant, not a trusted source of truth.",
    "deepDive": [
      {
        "title": "Neighbors pass the message on",
        "example": "Alice’s node sends a transaction to two peers. Each peer checks it and can pass it to others. Alice does not need a direct connection to every node.",
        "body": "A client first finds other participants. This is peer discovery. It then connects, announces new data, and asks for anything it is missing. Passing announcements between peers is often called gossip.\n\nReceiving a message only tells a node what someone sent. The node still needs to check it."
      },
      {
        "title": "Ethereum has two networking jobs",
        "example": "The execution client hears about a pending transfer. The consensus client hears which blocks validators support. They exchange different kinds of messages.",
        "body": "Execution clients maintain peer connections for execution data, including transaction announcements. Consensus clients use another peer network for beacon blocks and validator votes, called attestations.\n\nThe two clients also talk locally through the Engine API. That internal connection is separate from peer-to-peer networking."
      }
    ],
    "boundary": "This is a small deterministic network diagram, not Ethereum’s networking stack. Real peers use discovery, transport security, message validation, request protocols, and gossip policies. Connectivity alone promises neither delivery nor consensus.",
    "check": {
      "prompt": "Two honest nodes receive the same messages in a different order. What should the system provide?",
      "options": [
        "A rule that trusts the faster internet connection",
        "A requirement that all messages arrive simultaneously",
        "Validation and history-selection rules that handle different local views"
      ],
      "answer": 2,
      "explanation": "Real networks have delay. Participants need rules for checking messages and reconciling local views rather than assuming a universal arrival order."
    },
    "nextQuestion": "When a record arrives, how can we tell whether its contents changed along the way?",
    "sources": [
      {
        "title": "Ethereum networking layer",
        "url": "https://ethereum.org/en/developers/docs/networking-layer/"
      }
    ],
    "relatedWhy": {
      "ethereum-node": "See where the two peer networks connect to node software.",
      "transaction-journey": "Follow a transaction as peers learn about it."
    }
  },
  {
    "id": "hashes",
    "worldId": "02",
    "title": "One tiny change. A new fingerprint.",
    "shortTitle": "Hashes & tampering",
    "summary": "Change a record and compare its fingerprint. Then ask who you trust to supply the original.",
    "duration": 4,
    "simulation": "hashes",
    "aliases": [
      "hash",
      "hashing",
      "SHA-256",
      "Keccak-256",
      "fingerprint",
      "integrity",
      "tamper",
      "cryptography"
    ],
    "prerequisites": [
      "replication"
    ],
    "related": [
      "signatures",
      "blocks"
    ],
    "intro": [
      "Imagine checking a large record against a copy you saw yesterday. Comparing every byte works, but carrying a compact fingerprint is useful.",
      "A cryptographic hash produces a fixed-size result from input bytes. Change the input and you will almost certainly get a different result. Try it yourself."
    ],
    "question": {
      "prompt": "Someone changes a record and calculates a new matching hash. Does the new hash prove the change was authorized?",
      "options": [
        "Yes, a matching hash is authorization",
        "No, anyone can hash a record",
        "Yes, if the hash looks random"
      ],
      "answer": 1,
      "explanation": "Hashing is public computation. A trusted previous fingerprint helps detect a change; a fresh hash does not tell you who authorized it."
    },
    "experiment": "Hash the sample message, change one character, and hash it again. Compare the full results. Restore the original message to see that the same bytes produce the same fingerprint.",
    "reveal": "A tiny input edit causes a very different-looking fingerprint. Restoring the exact input restores its hash. That makes hashes useful for detecting changes against a known reference, but it does not lock the underlying data.",
    "mentalModel": "A hash is a fingerprint of the data. It does not prove who approved that data.",
    "deepDive": [
      {
        "title": "A fingerprint you can calculate again",
        "example": "Save the fingerprint of “Alice sends 5.” Change 5 to 6 and compare. Put 5 back, using exactly the same characters, and the original fingerprint returns.",
        "body": "The same bytes always produce the same hash. This property is called determinism. A cryptographic hash also makes two tasks impractical: finding an input from only its hash, and finding two different inputs with the same hash.\n\nThose protections are called preimage resistance and collision resistance. They rely on the strength of the hash function; they are not a claim that collisions are mathematically impossible."
      },
      {
        "title": "One fingerprint for many records",
        "example": "Suppose a block has many transactions. Hash small groups, then hash the groups together. You can end with one fingerprint that depends on all of them.",
        "body": "That final fingerprint is a root. A Merkle proof supplies the nearby hashes needed to connect one record to the root. This lets you check that the record belongs to a known collection without downloading the whole collection.\n\nYou still need a reason to trust the root. A made-up collection can also have a perfectly matching root."
      }
    ],
    "boundary": "This browser lab uses SHA-256. Ethereum execution uses Keccak-256 for mechanisms such as transaction and execution-block hashing; it also uses other hash functions elsewhere. The lab demonstrates the property, not Ethereum’s exact encoding or hash algorithm.",
    "check": {
      "prompt": "You receive both a file and its hash from the same untrusted person. What can a matching hash establish?",
      "options": [
        "That the file matches the supplied fingerprint",
        "That the person owns the file",
        "That the file is safe or truthful"
      ],
      "answer": 0,
      "explanation": "It checks consistency with the supplied fingerprint. Authenticity requires a trusted reference or another mechanism, such as a verified signature."
    },
    "nextQuestion": "A fingerprint can reveal an edit. How do we check who authorized the original message?",
    "sources": [
      {
        "title": "Merkle Patricia tries and roots",
        "url": "https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/"
      },
      {
        "title": "Ethereum Yellow Paper: Keccak and execution data structures",
        "url": "https://ethereum.github.io/yellowpaper/paper.pdf"
      }
    ],
    "relatedWhy": {
      "signatures": "Fingerprints detect edits; signatures check authorization.",
      "blocks": "Link fingerprints together to make changes in history visible."
    }
  },
  {
    "id": "signatures",
    "worldId": "02",
    "title": "Who authorized this message?",
    "shortTitle": "Digital signatures",
    "summary": "Sign a message, verify it, and then try changing what was signed.",
    "duration": 5,
    "simulation": "signatures",
    "aliases": [
      "signature",
      "signing",
      "public key",
      "private key",
      "ECDSA",
      "secp256k1",
      "authorization",
      "verification"
    ],
    "prerequisites": [
      "hashes"
    ],
    "related": [
      "wallets",
      "blocks"
    ],
    "intro": [
      "“Alice sends Bob 5” is easy for anyone to type. We need a way to check whether Alice’s key actually authorized those bytes.",
      "A digital signature connects a message to a key. The private key signs; the public key lets others verify. The private key does not need to travel with the message."
    ],
    "question": {
      "prompt": "You keep the signature but change the signed amount. What should verification do?",
      "options": [
        "Accept it because the sender name still matches",
        "Accept it if the amount is smaller",
        "Reject it because the signed message changed"
      ],
      "answer": 2,
      "explanation": "The signature is checked against the exact message. A valid signature on one message is not permission to substitute another."
    },
    "experiment": "Generate an ephemeral demo key, sign the message, and verify it. Alter the message and verify again. Then sign the new message to see why changing data requires a new authorization.",
    "reveal": "The original message verifies. An altered message fails against the old signature. The signature gives a checkable link to the signing key; it does not tell us whether that key’s holder had enough funds or understood the request.",
    "mentalModel": "A signature authorizes particular bytes with a particular key. Other rules still decide whether the request is valid.",
    "deepDive": [
      {
        "title": "A key is not a person",
        "example": "A valid signature shows that the signing key approved the message. It cannot tell you whether Alice was holding the key, someone stole it, or Alice misunderstood the request.",
        "body": "A public key can verify a signature created with its matching private key. This proves a relationship between the key and the message. It does not prove a legal identity, sufficient funds, or a safe contract.\n\nThat is why a wallet should explain the destination, amount, and permissions before asking someone to sign."
      },
      {
        "title": "Signing does not hide the message",
        "example": "Bob can read Alice’s transfer and check her signature. He does not need her private key, and the amount does not have to be secret.",
        "body": "Signing helps others check authorization. Encryption hides information from people who lack a decryption key. They solve different problems.\n\nConventional Ethereum account transactions use a signature method called ECDSA with the secp256k1 curve. This browser experiment uses the same family of method with a different curve, P-256."
      },
      {
        "title": "Stop the same permission being used twice",
        "example": "Alice signs “send Bob 5.” If the system accepted that same request again tomorrow, one signature could spend twice.",
        "body": "An account’s transaction counter is its nonce. A request includes the expected counter, so it cannot be included twice in the same accepted history. A chain ID also ties a protected transaction signature to its intended network.\n\nContracts that accept other signed messages need their own reuse checks, such as a nonce and an expiry."
      }
    ],
    "boundary": "The lab uses browser-generated, ephemeral P-256 keys through Web Crypto, not Ethereum’s secp256k1 transaction format. It is a real cryptographic demonstration with different parameters. No wallet, seed phrase, or real private key is needed.",
    "check": {
      "prompt": "A transaction’s signature verifies, but its sender cannot afford it. What follows?",
      "options": [
        "It must be accepted because the signature is valid",
        "It fails the separate balance checks",
        "Its signature automatically becomes invalid"
      ],
      "answer": 1,
      "explanation": "Authorization and balance validity answer different questions. A signature can verify while the transaction fails other rules."
    },
    "nextQuestion": "We can detect edits and check authorization. How do we preserve the order of many changes?",
    "sources": [
      {
        "title": "Ethereum transactions and signatures",
        "url": "https://ethereum.org/en/developers/docs/transactions/"
      },
      {
        "title": "EVM cryptographic primitives",
        "url": "https://ethereum.org/en/developers/docs/evm/"
      },
      {
        "title": "EIP-155: Simple replay attack protection",
        "url": "https://eips.ethereum.org/EIPS/eip-155"
      }
    ],
    "relatedWhy": {
      "wallets": "See how a wallet turns signing into a transaction request.",
      "blocks": "Put signed requests into an ordered history."
    }
  },
  {
    "id": "blocks",
    "worldId": "02",
    "title": "Give history a memory",
    "shortTitle": "Blocks & linked history",
    "summary": "Link records to their predecessors, then change the past and inspect the broken connection.",
    "duration": 5,
    "simulation": "blocks",
    "aliases": [
      "block",
      "blockchain",
      "chain",
      "parent hash",
      "previous hash",
      "history",
      "Merkle",
      "root"
    ],
    "prerequisites": [
      "hashes",
      "signatures"
    ],
    "related": [
      "ethereum-node",
      "consensus",
      "transaction-journey"
    ],
    "intro": [
      "Two valid transfers can still conflict if they spend the same available balance. Their order matters.",
      "Let’s group records into blocks and include the previous block’s fingerprint in each new block. Now the sequence itself leaves a trail."
    ],
    "question": {
      "prompt": "You edit an early block without updating later references. What happens?",
      "options": [
        "The next block’s stored parent reference no longer matches",
        "Every later block automatically updates itself",
        "The edit becomes impossible"
      ],
      "answer": 0,
      "explanation": "The edited block has a new fingerprint. The child still points to the old one, so checking the link exposes the mismatch."
    },
    "experiment": "Inspect each toy block’s data, hash, and previous-hash reference. Tamper with an earlier record and compare the links. Rebuild the chain to discover why internally matching hashes are still not consensus.",
    "reveal": "Linking hashes makes an edit visible against a known history. Recalculating all later references can produce another internally consistent chain. Nodes still need validation and consensus rules to decide which history to follow.",
    "mentalModel": "A hash-linked chain makes history checkable. Consensus gives participants rules for choosing a shared history.",
    "deepDive": [
      {
        "title": "A block records several kinds of results",
        "example": "Alice’s transfer is a request. Her lower balance is part of the new state. The execution status and emitted events belong in a receipt.",
        "body": "An execution-block header stores the parent block’s hash. It also contains separate roots for transactions, state, and receipts. A root is a fingerprint of a collection.\n\nKeeping these roots separate lets nodes check the requests, the resulting account records, and the execution results against their own calculations."
      },
      {
        "title": "The order can change the answer",
        "example": "Alice has 5 and signs two transfers of 5. Both signatures may be valid. After the first transfer spends the balance, the second cannot spend that same 5 again.",
        "body": "Transactions are checked in their block order. Each one starts from the result of the earlier transactions. This step from old records to new records is a state transition.\n\nRecomputing every hash does not make an overspend valid. A node must check both the links and the rules for changing state."
      },
      {
        "title": "A matching history is only a candidate",
        "example": "The tamper button breaks a link. Recomputing all links repairs the fingerprints, but it does not show that other participants accepted your edited history.",
        "body": "Several internally consistent histories can exist. Fork choice is the set of rules that selects the current branch among valid candidates. Finality adds stronger rules for committing to earlier history.\n\nHash links make history checkable. Validation and consensus determine which history a node follows."
      }
    ],
    "boundary": "These are toy blocks with simplified hashing and data. Rebuilding them has no Ethereum proof-of-stake cost. Hash links alone do not make rewriting impossible, and this lab does not implement Ethereum headers, tries, or fork choice.",
    "check": {
      "prompt": "An alternative chain has perfectly matching hash links. Must your node accept it?",
      "options": [
        "Yes, linked hashes are the only rule",
        "No, it must also validate the contents and apply consensus rules",
        "Yes, if its creator used more computers"
      ],
      "answer": 1,
      "explanation": "Internal consistency is necessary but insufficient. Invalid state transitions stay invalid even if every hash was recalculated."
    },
    "nextQuestion": "Where do all these checks actually happen inside an Ethereum node?",
    "sources": [
      {
        "title": "Ethereum blocks",
        "url": "https://ethereum.org/en/developers/docs/blocks/"
      },
      {
        "title": "Merkle Patricia trie",
        "url": "https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/"
      }
    ],
    "relatedWhy": {
      "ethereum-node": "Find the software that checks block contents and results.",
      "consensus": "Choose between competing valid histories.",
      "transaction-journey": "See when a pending request enters a block."
    }
  },
  {
    "id": "ethereum-node",
    "worldId": "03",
    "title": "Open an Ethereum node",
    "shortTitle": "Inside a node",
    "summary": "Two clients, two responsibilities, and a shared view of the chain.",
    "duration": 6,
    "simulation": "node",
    "aliases": [
      "full node",
      "execution client",
      "consensus client",
      "Engine API",
      "JSON-RPC",
      "RPC provider",
      "database",
      "sync",
      "archive"
    ],
    "prerequisites": [
      "peers",
      "blocks"
    ],
    "related": [
      "wallets",
      "evm",
      "consensus"
    ],
    "intro": [
      "So far, a node has been a box in our diagrams. Let’s open it.",
      "A typical Ethereum full node runs two pieces of software. The execution client checks transactions and runs code. The consensus client follows the rules for choosing blocks and finalizing history."
    ],
    "question": {
      "prompt": "Which part checks that a proposed block produces the claimed balances and contract state?",
      "options": [
        "The execution client",
        "The wallet interface",
        "A database administrator chosen by the proposer"
      ],
      "answer": 0,
      "explanation": "The execution client runs the transactions and checks the result. The consensus client combines that result with its own checks about proposals and votes."
    },
    "experiment": "Select the node’s components to inspect their jobs. Follow the connection between execution and consensus, and distinguish the app’s JSON-RPC entry point from the local Engine API.",
    "reveal": "A node is not just a wallet or a validator. Execution and consensus clients cooperate through the Engine API. A full node can verify Ethereum without operating a validator; a validator adds duties such as proposing and attesting.",
    "mentalModel": "Execution checks what a block does. Consensus determines how valid blocks fit into the shared chain.",
    "deepDive": [
      {
        "title": "The execution client checks the work",
        "example": "Alice sends a transfer. The client checks the request, runs the code when needed, and works out the new balances. Another correct client should get the same answer.",
        "body": "The execution client manages account state, runs the EVM, and keeps a local transaction pool. Apps ask it for data through JSON-RPC, a request-and-response interface.\n\nA proposed block also includes a claimed result. The execution client checks that result by applying the execution rules itself."
      },
      {
        "title": "The consensus client follows the chain",
        "example": "Two valid blocks arrive at nearly the same time. The consensus client follows the proof-of-stake rules to decide which branch is currently selected.",
        "body": "The newest selected block is the head. Rules for selecting it are called fork choice. Validator votes also help establish which older checkpoints are justified and finalized.\n\nThe consensus client asks the execution client to check a block’s transactions. Their local interface is the Engine API. Neither client can replace the other’s checks."
      },
      {
        "title": "Node, wallet, provider, and validator",
        "example": "Your wallet can ask a provider for Alice’s balance. The provider runs nodes. Alice’s wallet does not become a node just by making that request.",
        "body": "A client is software. A node is a running participant. An RPC provider gives applications access to nodes. A wallet prepares requests and manages signing.\n\nA validator performs proof-of-stake duties, including proposing blocks and signing votes. You can run a full node and check the chain without staking or operating a validator."
      },
      {
        "title": "Today’s records differ from yesterday’s records",
        "example": "A node may know Alice’s balance now without keeping a ready-to-read copy of her balance after every block since launch.",
        "body": "Current state, old blocks, and old versions of state are different data. A client can discard some old data to save disk space; this is pruning. Archive configurations retain more historical state.\n\nSyncing means catching up with the network. Clients offer different storage and sync options, so do not assume every full node stores every historical state forever."
      }
    ],
    "boundary": "The diagram shows responsibilities, not running clients. Storage layouts and synchronization strategies vary. No RPC requests leave this lab, and the Engine API link is a conceptual connection.",
    "check": {
      "prompt": "You run both clients without staking. Can your node validate the chain?",
      "options": [
        "No, only proposers validate",
        "No, validation requires a wallet connection",
        "Yes, validating a chain and operating a validator are distinct roles"
      ],
      "answer": 2,
      "explanation": "A full node checks the chain without needing to propose blocks or attest with staked validator keys."
    },
    "nextQuestion": "How does a user’s intention become a request this node can verify?",
    "sources": [
      {
        "title": "Nodes and clients",
        "url": "https://ethereum.org/en/developers/docs/nodes-and-clients/"
      },
      {
        "title": "Node architecture and Engine API",
        "url": "https://ethereum.org/en/developers/docs/nodes-and-clients/node-architecture/"
      }
    ],
    "relatedWhy": {
      "wallets": "Trace how a signed wallet request reaches the execution client.",
      "evm": "Open the execution engine and step through its work.",
      "consensus": "Explore the consensus client’s head and checkpoint rules."
    }
  },
  {
    "id": "wallets",
    "worldId": "04",
    "title": "A wallet makes a request",
    "shortTitle": "Accounts & signing",
    "summary": "Separate the interface from the account, and inspect the fields that give a transaction its meaning.",
    "duration": 5,
    "simulation": "wallet",
    "aliases": [
      "wallet",
      "account",
      "EOA",
      "address",
      "private keys",
      "nonce",
      "chain ID",
      "transaction types",
      "replay protection",
      "signing"
    ],
    "prerequisites": [
      "signatures",
      "ethereum-node"
    ],
    "related": [
      "transaction-pool",
      "smart-accounts",
      "gas"
    ],
    "intro": [
      "Your wallet shows a balance, but the balance is recorded on Ethereum. The wallet helps you read it and sign requests.",
      "Prepare Alice’s transfer. Besides the amount, watch the account counter, called a nonce, and the chain ID that identifies the intended network."
    ],
    "question": {
      "prompt": "A wallet signs a transaction. Has the transfer happened on-chain?",
      "options": [
        "Yes, signing changes the recipient’s balance",
        "No, the signed request still needs submission and inclusion",
        "Yes, if the wallet shows a transaction hash"
      ],
      "answer": 1,
      "explanation": "Signing creates authorization. The network must still receive, validate, include, and execute the request; finality comes later."
    },
    "experiment": "Inspect the recipient, amount, nonce, and chain ID. Prepare and sign the toy request, then change its fields. Notice that the authorization belongs to the exact request that was signed.",
    "reveal": "The wallet is an interface and signing tool. The account’s balance and nonce are part of network state. A signed transaction is a request to change that state, not proof that the change already happened.",
    "mentalModel": "Your wallet authorizes a request. The protocol decides whether and where that request takes effect.",
    "deepDive": [
      {
        "title": "The counter and the network matter",
        "example": "Alice’s next nonce is 7. A transfer with nonce 7 can be used once. A later transfer needs 8. A signed request for one chain should not silently become permission on another.",
        "body": "The nonce orders an account’s outgoing transactions. A protected transaction signature also includes a chain ID, which identifies the intended chain.\n\nA node may queue a future nonce until earlier requests arrive. It cannot include an already-used nonce again in the same accepted history."
      },
      {
        "title": "Accounts and request formats",
        "example": "Alice controls a regular account with a signing key. A vault contract follows its code. Both have addresses, but their rules for taking action differ.",
        "body": "A key-controlled account is often called an externally owned account, or EOA. A contract account runs code when called. Ethereum also has different transaction formats, identified by a type.\n\nType-2 transactions, for example, carry the maximum fee and priority fee fields introduced by EIP-1559. A transaction type is not a new kind of wallet."
      },
      {
        "title": "A wallet can have programmable rules",
        "example": "A smart wallet could require two approvals for a large payment or let a sponsor cover a fee. Those checks belong to the account’s rules, not just its screen.",
        "body": "Account abstraction makes account authorization more programmable. ERC-4337 describes a flow where user requests are bundled into a transaction. EIP-7702 defines a way for an EOA to delegate code execution.\n\nThese mechanisms differ. Neither means that all accounts automatically have the same recovery or sponsorship features. The smart-accounts lab explores a simplified flow."
      }
    ],
    "boundary": "Addresses, balances, signatures, and transaction fields here are toy data. This is not an Ethereum signing implementation or a wallet connection. The lab never requests a seed phrase or private key and cannot move funds.",
    "check": {
      "prompt": "You uninstall a wallet app. Does that delete its account balance from Ethereum?",
      "options": [
        "No, account state is maintained by the network",
        "Yes, the app stores all of the account’s ETH",
        "Only if the app was connected to a public RPC provider"
      ],
      "answer": 0,
      "explanation": "Removing an interface does not remove on-chain state. Access depends on the account’s authorization mechanism and retaining the necessary keys or recovery method."
    },
    "nextQuestion": "The request is signed. What does a node check before putting it in its local waiting area?",
    "sources": [
      {
        "title": "Ethereum accounts",
        "url": "https://ethereum.org/en/developers/docs/accounts/"
      },
      {
        "title": "EIP-155: Simple replay attack protection",
        "url": "https://eips.ethereum.org/EIPS/eip-155"
      },
      {
        "title": "EIP-2718: Typed transaction envelope",
        "url": "https://eips.ethereum.org/EIPS/eip-2718"
      },
      {
        "title": "EIP-7702: Set code for EOAs",
        "url": "https://eips.ethereum.org/EIPS/eip-7702"
      }
    ],
    "relatedWhy": {
      "transaction-pool": "Discover why signing is only the start of admission checks.",
      "smart-accounts": "Replace a single approval rule with programmable wallet rules.",
      "gas": "Find out why the balance must cover fees as well as the transfer."
    }
  },
  {
    "id": "evm",
    "worldId": "06",
    "title": "Watch a program become state",
    "shortTitle": "The EVM stepper",
    "summary": "One instruction at a time: a stack changes, memory fills, and storage records the result.",
    "duration": 7,
    "simulation": "evm",
    "aliases": [
      "virtual machine",
      "bytecode",
      "opcode",
      "program counter",
      "stack",
      "memory",
      "storage",
      "calldata",
      "returndata",
      "revert",
      "determinism"
    ],
    "prerequisites": [
      "ethereum-node",
      "wallets"
    ],
    "related": [
      "gas",
      "receipts-and-logs",
      "contract-workshop"
    ],
    "intro": [
      "A smart contract does not wake up by itself. A transaction can trigger execution of its code.",
      "Instead of trusting one server’s result, nodes can apply the same execution rules to the same inputs and state. Let’s slow that computation down until every change is visible."
    ],
    "question": {
      "prompt": "Two correct clients start with the same records and run the same ordered requests under the same rules. What should happen?",
      "options": [
        "They can choose different results if both seem reasonable",
        "The faster machine decides the result",
        "They compute the same execution result"
      ],
      "answer": 2,
      "explanation": "The same inputs and starting state must give the same result. This lets one node check another node’s calculation. This property is called deterministic execution."
    },
    "experiment": "Step through the toy program. Follow the current instruction, stack, memory, storage, and gas meter. Compare the working state with the committed result, then try the revert path and replay.",
    "reveal": "The stack and memory hold working values. Storage holds the contract’s lasting records. Each instruction changes those values in a defined way. REVERT undoes the call’s writes, but the included transaction still pays for work and uses its nonce.",
    "mentalModel": "The EVM is a rulebook for turning a starting state and a transaction into a reproducible result.",
    "deepDive": [
      {
        "title": "Three places to keep a value",
        "example": "To add 2 and 3, put them on the stack. Use memory for temporary working bytes. Write 5 to storage if the contract should remember it after a successful call.",
        "body": "The stack holds 256-bit values used by instructions. An instruction is an opcode; the program counter identifies the next instruction. Memory is a temporary byte array for one call. Storage is attached to an account and can survive later transactions.\n\nThese places have different jobs and gas costs. Solidity’s storage layout determines where its variables fit in storage slots."
      },
      {
        "title": "One contract can call another",
        "example": "A shop contract asks a token contract to move tokens. The shop passes input bytes and receives either output bytes or an error.",
        "body": "Input bytes are calldata; output bytes are returndata. Each call gets a working area called a call frame. CALL runs the target’s code with the target’s storage. STATICCALL forbids state changes.\n\nDELEGATECALL runs another account’s code using the caller’s storage and address context. This supports proxy contracts, but incompatible storage layouts can corrupt the caller’s records."
      },
      {
        "title": "An error can undo changes without undoing work",
        "example": "A contract writes a new balance and then discovers a failed condition. REVERT discards that call’s writes and logs. The computation already used gas.",
        "body": "REVERT can return error data and leave unused gas available. An outer contract can catch a failed inner call, so an inner failure does not always fail the whole transaction.\n\nIf the top-level execution fails, its execution changes are rolled back. The included transaction still consumes the sender’s nonce and pays for the gas charged."
      }
    ],
    "boundary": "This is a small EVM-like teaching interpreter with toy instruction costs, not full Ethereum bytecode execution. It omits much of the opcode set, encoding, word arithmetic, call behavior, and fork-specific gas rules. Do not use its trace as a contract audit.",
    "check": {
      "prompt": "A top-level contract execution reverts after some work. Which description is correct?",
      "options": [
        "Everything is free because storage rolled back",
        "Execution changes roll back, but the included transaction still pays for gas consumed",
        "The node must accept its intermediate storage writes"
      ],
      "answer": 1,
      "explanation": "Rollback removes execution effects, not the work already performed. The included transaction still consumes a nonce and incurs gas charges."
    },
    "nextQuestion": "If every node must do this work, what stops a request from running forever?",
    "sources": [
      {
        "title": "Ethereum Virtual Machine",
        "url": "https://ethereum.org/en/developers/docs/evm/"
      },
      {
        "title": "EIP-140: REVERT instruction",
        "url": "https://eips.ethereum.org/EIPS/eip-140"
      },
      {
        "title": "Ethereum execution specifications",
        "url": "https://github.com/ethereum/execution-specs"
      }
    ],
    "relatedWhy": {
      "gas": "Every instruction needs a work budget.",
      "receipts-and-logs": "See which results survive after success or revert.",
      "contract-workshop": "Connect Solidity source to the code that the EVM runs."
    }
  },
  {
    "id": "gas",
    "worldId": "07",
    "title": "Put a meter on computation",
    "shortTitle": "Gas & transaction fees",
    "summary": "Give work a budget. Then separate gas units from the price paid for each unit.",
    "duration": 6,
    "simulation": "gas",
    "aliases": [
      "fee",
      "fees",
      "gas units",
      "gas limit",
      "gas used",
      "base fee",
      "priority fee",
      "max fee",
      "gwei",
      "out of gas",
      "EIP-1559"
    ],
    "prerequisites": [
      "evm"
    ],
    "related": [
      "receipts-and-logs",
      "protocol-upgrades",
      "wallets"
    ],
    "intro": [
      "What if Alice submits a program that never stops? Other nodes need a limit on how much work they will do for one request.",
      "Ethereum counts work in gas units. A transaction sets a gas limit, and a price per gas turns the work into a fee. Let’s separate the meter, the budget, and the price."
    ],
    "question": {
      "prompt": "You raise the gas limit, and the same successful program uses the same amount of gas. Must its fee double?",
      "options": [
        "No, the limit is a ceiling, not the amount consumed",
        "Yes, the whole limit is always charged",
        "Yes, gas limit and gas price are the same field"
      ],
      "answer": 0,
      "explanation": "For this ordinary execution-fee model, the fee uses gas consumed at the effective price. Increasing a ceiling does not itself make the program consume it."
    },
    "experiment": "Change the workload and gas limit, then run the toy computation. Compare success with out of gas. Adjust base fee, priority fee, and max fee to inspect the effective price and the resulting execution fee.",
    "reveal": "A gas limit is a budget, not a bill. Successful execution pays for the gas charged at the effective price. A low price cap can keep a transaction out of a block. Running out of gas is different: execution started, used its budget, and failed.",
    "mentalModel": "Gas is the meter. Gas limit is the budget. Fee per gas is the price.",
    "deepDive": [
      {
        "title": "Calculate the price for the work",
        "example": "The base fee is 20 gwei. Alice offers a tip up to 2 and a total price cap of 30. She pays 22 per gas. At 30,000 gas used, the fee is 0.00066 ETH.",
        "body": "The base fee is the block’s required price per gas and is burned. The priority part is the tip paid to the block’s fee recipient. The maximum fee caps their combined price.\n\nIf the cap cannot cover the block’s base fee, the request is not eligible for that block. This is different from running out of gas while executing.",
        "code": "price = min(maxFee, baseFee + maxPriorityFee)\nfeeInGwei = gasCharged * price\nfeeInEth = feeInGwei / 1_000_000_000"
      },
      {
        "title": "Rejected, reverted, or out of gas?",
        "example": "A malformed request may be rejected before it runs. A valid request can run and hit a contract error. Or it can use up its execution budget before finishing.",
        "body": "Rejection means the transaction is not included as an ordinary execution failure. REVERT is a deliberate execution error and may leave gas unused. Out of gas uses up the affected call’s gas budget.\n\nAn included failed transaction still costs gas. For an inner call, the outer contract may catch the failure and continue; the whole transaction need not fail."
      },
      {
        "title": "A real gas estimate has more inputs",
        "example": "Reading a value for the first time can cost differently from reading it again during the same transaction. Growing memory also needs work.",
        "body": "Real costs depend on the instructions, input data, storage access, memory growth, and active protocol rules. A transaction also has an upfront cost, called intrinsic gas. Refund rules can affect the final charged amount.\n\nBlob transactions pay a separate data fee as well. Our lab isolates ordinary execution-fee arithmetic so you can understand each quantity first."
      }
    ],
    "boundary": "Workload gas numbers and fee inputs are teaching examples, not live prices or Ethereum estimates. This calculator omits refunds, calldata floors, blob fees, and other fork-specific details. It cannot predict the fee of a real contract interaction.",
    "check": {
      "prompt": "A fee cap is below the block’s base fee. What is the right diagnosis?",
      "options": [
        "The contract necessarily ran out of gas",
        "The transaction has already paid the base fee",
        "It is not eligible for inclusion in that block at this cap"
      ],
      "answer": 2,
      "explanation": "Fee eligibility is checked before executing that transaction in the block. A low price cap and an insufficient execution budget are separate problems."
    },
    "nextQuestion": "When execution succeeds or fails, what result does the application actually receive?",
    "sources": [
      {
        "title": "EIP-1559: Fee market change",
        "url": "https://eips.ethereum.org/EIPS/eip-1559"
      },
      {
        "title": "Ethereum gas and fees",
        "url": "https://ethereum.org/en/developers/docs/gas/"
      },
      {
        "title": "EIP-140: REVERT instruction",
        "url": "https://eips.ethereum.org/EIPS/eip-140"
      }
    ],
    "relatedWhy": {
      "receipts-and-logs": "Read the charged gas and execution status in a receipt.",
      "protocol-upgrades": "Experiment with the fee rule introduced by EIP-1559.",
      "wallets": "See where fee limits fit into a signed request."
    }
  },
  {
    "id": "consensus",
    "worldId": "08",
    "title": "Agreement has weight",
    "shortTitle": "Consensus & finality",
    "summary": "Follow proposals and attestations, compare branches, and separate the head from finalized history.",
    "duration": 7,
    "simulation": "consensus",
    "aliases": [
      "proof of stake",
      "PoS",
      "validator",
      "stake",
      "slots",
      "epochs",
      "proposer",
      "attestation",
      "fork choice",
      "LMD-GHOST",
      "Casper FFG",
      "finality",
      "slashing"
    ],
    "prerequisites": [
      "blocks",
      "ethereum-node",
      "gas"
    ],
    "related": [
      "transaction-journey",
      "proof-of-work",
      "the-merge"
    ],
    "intro": [
      "Validating a block tells us whether it follows the rules. It does not make every participant see the same chain head at the same instant.",
      "Ethereum uses proof of stake. Validators propose blocks and attest to their view. Those messages have weight based on stake, not on the number of computers someone can start."
    ],
    "question": {
      "prompt": "One operator starts 1,000 extra computers with no additional validator stake. Does that create 1,000 extra units of consensus voting weight?",
      "options": [
        "Yes, every machine gets one vote",
        "No, consensus weight is tied to validator stake",
        "Yes, if the machines are fast enough"
      ],
      "answer": 1,
      "explanation": "A raw count of machines is easy to multiply. Ethereum’s proof-of-stake voting weights come from validator balances and protocol rules."
    },
    "experiment": "Compare two proposed branches. Change the simulated validators’ attestations and watch the stake weights move. Advance the conceptual checkpoint steps to see that choosing a head and finalizing history are separate decisions.",
    "reveal": "A heavier supported branch can become the head without being finalized. Finality uses checkpoint votes and separate rules. Counting nodes, checking signatures, selecting a head, and finalizing a checkpoint solve different parts of the problem.",
    "mentalModel": "Fork choice picks the current branch. Finality commits to older history under stronger checkpoint rules.",
    "deepDive": [
      {
        "title": "A schedule for proposals and votes",
        "example": "A validator gets a turn to propose a block. If it is offline, that turn can pass without a block. Other validators still have scheduled work.",
        "body": "A proposal opportunity is a slot. Slots are grouped into epochs. Validators send signed votes, called attestations, about the head and checkpoint links.\n\nThe schedule and vote weights depend on protocol rules and validator stake. Starting extra computers does not create extra stake."
      },
      {
        "title": "Choosing the head is not finalizing it",
        "example": "Branch A has more support now, so it is selected as the head. That alone does not make its newest block final. Later checkpoint votes must meet additional rules.",
        "body": "Ethereum combines two mechanisms. LMD-GHOST uses validators’ latest messages and stake weights to help choose a head. Casper FFG checks links between checkpoints to justify and finalize history.\n\nThe lab shows the difference, not the full algorithms. A two-thirds bar on one screen is not the complete finality rule."
      },
      {
        "title": "Why conflicting votes have consequences",
        "example": "Going offline is different from signing two conflicting promises. Both affect the network, but the protocol treats them differently.",
        "body": "Certain conflicting votes can trigger slashing: some stake is removed and the validator is forced to exit. Ordinary missed duties can lose rewards or incur penalties without being slashable.\n\nUnder the finality safety assumptions, conflicting finalized histories require slashable behavior involving at least one-third of active stake. Low participation can also stop new finality without creating two finalized histories."
      },
      {
        "title": "Votes cannot make an overspend valid",
        "example": "Even if many validators support a block that creates unauthorized ETH, a correctly checking node rejects that invalid execution result.",
        "body": "Consensus chooses among blocks that pass the required checks. It does not replace execution validation. Security also relies on signatures, stake incentives, network conditions, and how nodes get a trustworthy starting point when syncing."
      }
    ],
    "boundary": "The few validators, weights, timing, and checkpoint steps here are conceptual. This is neither an LMD-GHOST implementation nor a Casper FFG simulator. It omits committees, balance updates, proposer boost, detailed slashing conditions, and weak-subjectivity synchronization.",
    "check": {
      "prompt": "A block is the current head. Which claim is safe?",
      "options": [
        "It is already finalized",
        "It can never be reorganized",
        "It is currently selected; finality requires additional protocol conditions"
      ],
      "answer": 2,
      "explanation": "Head selection is provisional. Inclusion and extra descendant blocks are useful observations, but protocol finality has its own checkpoint rules."
    },
    "nextQuestion": "Can we now follow one transaction through every piece, without confusing submission, execution, inclusion, and finality?",
    "sources": [
      {
        "title": "Ethereum proof of stake",
        "url": "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/"
      },
      {
        "title": "Gasper: fork choice and finality",
        "url": "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/gasper/"
      },
      {
        "title": "Ethereum consensus specifications",
        "url": "https://github.com/ethereum/consensus-specs"
      }
    ],
    "relatedWhy": {
      "transaction-journey": "Place proposals, inclusion, and finality on one path.",
      "proof-of-work": "Compare stake-weighted consensus with Ethereum’s earlier mining system.",
      "the-merge": "See which part of Ethereum changed when mining ended."
    }
  },
  {
    "id": "transaction-journey",
    "worldId": "09",
    "title": "One click. A whole network.",
    "shortTitle": "The transaction journey",
    "summary": "Replay the full path from a wallet request to a finalized record, with every handoff visible.",
    "duration": 7,
    "simulation": "journey",
    "aliases": [
      "transaction lifecycle",
      "submission",
      "pending",
      "mempool",
      "txpool",
      "propagation",
      "execution payload",
      "receipt",
      "logs",
      "status",
      "inclusion",
      "confirmation",
      "finality"
    ],
    "prerequisites": [
      "wallets",
      "evm",
      "gas",
      "consensus"
    ],
    "related": [
      "contract-workshop",
      "receipts-and-logs",
      "rollups"
    ],
    "intro": [
      "Think back to the first transfer. A button, a backend, and a database made it look simple.",
      "Now we can follow the Ethereum version without treating “sent” as “done.” Let’s replay a signed request through the execution and consensus layers, then inspect what each status really means."
    ],
    "question": {
      "prompt": "Your RPC provider returns a transaction hash. What can you conclude?",
      "options": [
        "The submission returned an identifier; inclusion and finality still need checking",
        "The transfer is already final",
        "Every Ethereum node has accepted it"
      ],
      "answer": 0,
      "explanation": "An identifier lets you track the request. It is not a receipt, a promise of inclusion, or a finality guarantee."
    },
    "experiment": "Advance one stage at a time or play the journey. Inspect the wallet, local pool, execution, proposal, validation, inclusion, and checkpoint stages. Pause and replay to distinguish the events that a frontend might otherwise hide behind one spinner.",
    "reveal": "Submission sends the request. A node may hold and propagate it. Block construction executes selected transactions; receiving nodes validate the proposed result. A transaction included in the selected chain can still be reorganized before its history becomes finalized.",
    "mentalModel": "“Transaction sent” begins a lifecycle. Each later status makes a different promise.",
    "deepDive": [
      {
        "title": "A pending request is in someone’s local pool",
        "example": "Node A has Alice’s transfer. Node B has not heard about it yet. A wallet may show “pending” even though no block contains it.",
        "body": "A transaction pool, or mempool, is local to a node. Clients can differ in what they admit, replace, queue, or drop. A proposer is not required to include every pending request.\n\nThe transaction-pool lab lets you compare local pools directly."
      },
      {
        "title": "A failed transaction can be in a valid block",
        "example": "Alice calls a contract with an amount the contract refuses. The request passes the transaction checks, runs, and reverts. That failure is a valid result.",
        "body": "The block’s ordered transactions and execution data form its execution payload. Other nodes apply the rules again to check the claimed result.\n\nA transaction being valid for execution is different from its contract call succeeding. The receipt tells the application which outcome occurred."
      },
      {
        "title": "A receipt tells the app what happened",
        "example": "The receipt says the call succeeded, reports gas used, and contains a Transfer log. The frontend can show success and update its activity list.",
        "body": "Logs are records emitted during execution. Logs from a reverted call are discarded. The block records separate fingerprints for its transactions, receipts, and final account state.\n\nA receipt can disappear if the containing block is removed from the selected chain before finality. Applications should handle that change."
      },
      {
        "title": "More blocks and protocol finality differ",
        "example": "Alice’s transfer is included. Two more blocks follow it. That is stronger evidence than a pending request, but it is not the same as checking finalized status.",
        "body": "Applications often call descendant blocks confirmations; counting conventions vary. Protocol finality comes from stake-weighted checkpoint rules.\n\nA clear frontend can show pending, included success, included failure, and finalized history separately. One “done” label hides distinctions that matter to users."
      }
    ],
    "boundary": "This local timeline compresses concurrent protocol work into a readable sequence. It omits private transaction paths, builder infrastructure, client policy details, network delays, and many reorganization cases. Advancing a step does not contact Ethereum or produce a real receipt.",
    "check": {
      "prompt": "An included transaction has receipt status “failed.” Which statement can still be true?",
      "options": [
        "It was never included in a block",
        "Its block is valid, its nonce was consumed, and gas was charged",
        "No computation happened"
      ],
      "answer": 1,
      "explanation": "Execution failure is a valid outcome for an included transaction. Its execution changes roll back, but the protocol still accounts for its nonce and gas."
    },
    "nextQuestion": "When your React app calls a Solidity contract, how will you expose each of these states to the person using it?",
    "sources": [
      {
        "title": "Ethereum transaction lifecycle",
        "url": "https://ethereum.org/en/developers/docs/transactions/"
      },
      {
        "title": "Node architecture",
        "url": "https://ethereum.org/en/developers/docs/nodes-and-clients/node-architecture/"
      },
      {
        "title": "Block contents and commitments",
        "url": "https://ethereum.org/en/developers/docs/blocks/"
      },
      {
        "title": "Proof-of-stake finality",
        "url": "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/"
      }
    ],
    "relatedWhy": {
      "contract-workshop": "Build the contract interaction that starts this journey.",
      "receipts-and-logs": "Inspect the results that a frontend reads.",
      "rollups": "Ask how to handle more requests without doing all work on layer one."
    }
  }
];
