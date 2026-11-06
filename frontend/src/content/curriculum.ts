import type { CurriculumWorld, Lesson } from './types';
import { coreLessons } from './coreLessons';
import { executionLessons } from './executionLessons';
import { scalingLessons } from './scalingLessons';
import { evolutionLessons } from './evolutionLessons';

// The topic map and story order share the same content, but serve different ways of exploring.
export const worlds: CurriculumWorld[] = [
  {
    "id": "00",
    "order": 0,
    "title": "The Web2 world",
    "description": "A familiar application. A less familiar question about who controls its records.",
    "lessonIds": [
      "source-of-truth"
    ],
    "topics": [
      "Browser",
      "Frontend",
      "Backend",
      "APIs",
      "Database",
      "Authentication",
      "Authorization",
      "Source of truth",
      "Control",
      "Audit logs",
      "Availability",
      "Trust assumptions",
      "Single points of failure"
    ]
  },
  {
    "id": "01",
    "order": 1,
    "title": "Shared records",
    "description": "Make copies, break agreement, and discover what a network still needs.",
    "lessonIds": [
      "replication",
      "peers"
    ],
    "topics": [
      "Nodes",
      "Peers",
      "Replication",
      "Consistency",
      "Network communication",
      "Failures",
      "Conflicting records",
      "Validation",
      "Shared rules",
      "Peer-to-peer networking"
    ]
  },
  {
    "id": "02",
    "order": 2,
    "title": "Blockchain foundations",
    "description": "Give a record a fingerprint, an author, and a place in history.",
    "lessonIds": [
      "hashes",
      "signatures",
      "blocks"
    ],
    "topics": [
      "Hash functions",
      "Tampering detection",
      "Digital signatures",
      "Public and private keys",
      "Blocks",
      "Previous-block hashes",
      "Chain history",
      "Merkle trees and roots",
      "Data integrity"
    ]
  },
  {
    "id": "03",
    "order": 3,
    "title": "Inside an Ethereum node",
    "description": "Open the machine and see how execution and consensus work together.",
    "lessonIds": [
      "ethereum-node"
    ],
    "topics": [
      "Ethereum network",
      "Full node",
      "Execution client",
      "Consensus client",
      "Engine API",
      "Peer networking",
      "JSON-RPC",
      "Local databases",
      "Current state",
      "Historical data",
      "Synchronization"
    ]
  },
  {
    "id": "04",
    "order": 4,
    "title": "Accounts & wallets",
    "description": "Turn an intention into a signed request the network can check.",
    "lessonIds": [
      "wallets"
    ],
    "topics": [
      "Externally owned accounts",
      "EOAs",
      "Contract accounts",
      "Addresses",
      "Private keys",
      "Signing",
      "Nonces",
      "Chain ID",
      "Transaction types",
      "Transaction fields",
      "Signature verification",
      "Replay protection",
      "Transaction submission",
      "Pending transactions"
    ]
  },
  {
    "id": "05",
    "order": 5,
    "title": "Execution & the txpool",
    "description": "Compare local transaction pools, then inspect what inclusion, success, and failure leave in a receipt.",
    "lessonIds": [
      "transaction-pool",
      "receipts-and-logs"
    ],
    "topics": [
      "Transaction validation",
      "Mempool",
      "Txpool",
      "Propagation",
      "Transaction selection",
      "Execution payload",
      "Receipts",
      "Logs",
      "Status",
      "State transition",
      "Revert behavior",
      "Inclusion"
    ]
  },
  {
    "id": "06",
    "order": 6,
    "title": "The EVM",
    "description": "Step through instructions and watch a program change state.",
    "lessonIds": [
      "evm"
    ],
    "topics": [
      "Bytecode",
      "Opcodes",
      "Program counter",
      "Stack",
      "Memory",
      "Persistent storage",
      "Calldata",
      "Returndata",
      "Call frames",
      "CALL",
      "STATICCALL",
      "DELEGATECALL",
      "Storage layout",
      "State changes",
      "Reverts",
      "Events and logs",
      "Determinism"
    ]
  },
  {
    "id": "07",
    "order": 7,
    "title": "Gas & fees",
    "description": "Separate the work a transaction uses from the price of that work.",
    "lessonIds": [
      "gas"
    ],
    "topics": [
      "Gas units",
      "Intrinsic transaction costs",
      "Execution costs",
      "Gas limit",
      "Gas used",
      "Base fee",
      "Priority fee",
      "Max fee per gas",
      "Effective gas price",
      "Out of gas",
      "Revert costs",
      "EIP-1559"
    ]
  },
  {
    "id": "08",
    "order": 8,
    "title": "Proof of stake",
    "description": "Compare competing branches, then discover why choosing a head is not finality.",
    "lessonIds": [
      "consensus"
    ],
    "topics": [
      "Validators",
      "Staking",
      "Slots",
      "Epochs",
      "Proposer",
      "Attestations",
      "Fork choice",
      "LMD-GHOST",
      "Casper FFG",
      "Justification",
      "Finality",
      "Slashing",
      "Inactivity",
      "Validator duties",
      "Consensus clients"
    ]
  },
  {
    "id": "09",
    "order": 9,
    "title": "The complete journey",
    "description": "Put the pieces together, from a wallet click to a finalized record.",
    "lessonIds": [
      "transaction-journey"
    ],
    "topics": [
      "Block headers",
      "Transactions root",
      "State root",
      "Receipts root",
      "Execution payload",
      "Block proposal",
      "Execution validation",
      "Attestations",
      "Fork choice",
      "Confirmations",
      "Finality"
    ]
  },
  {
    "id": "10",
    "order": 10,
    "title": "Build with Ethereum",
    "description": "Turn contract code into a deployed program, then connect a frontend through RPC, receipts, and events.",
    "lessonIds": [
      "contract-workshop",
      "frontend-rpc"
    ],
    "topics": [
      "Solidity",
      "Compilation",
      "ABI",
      "Deployment",
      "Contract address",
      "Calls vs transactions",
      "Events",
      "Logs",
      "RPC",
      "JSON-RPC",
      "Wallets",
      "Frontend integration",
      "Indexers",
      "Local development",
      "Testnets"
    ]
  },
  {
    "id": "11",
    "order": 11,
    "title": "Beyond layer one",
    "description": "Experiment with scaling and the extra rules needed to carry data, assets, and authorization across systems.",
    "lessonIds": [
      "rollups",
      "bridges",
      "oracles",
      "smart-accounts"
    ],
    "topics": [
      "Layer 2s",
      "Rollups",
      "Sequencers",
      "Settlement",
      "Data availability",
      "Blobs",
      "Bridges",
      "Oracles",
      "ERC standards",
      "Tokens",
      "DeFi",
      "Account abstraction",
      "Smart wallets"
    ]
  },
  {
    "id": "12",
    "order": 12,
    "title": "How we got here",
    "description": "Try a historical mining puzzle, then inspect what changed and what stayed the same at the Merge.",
    "lessonIds": [
      "proof-of-work",
      "the-merge"
    ],
    "topics": [
      "Mining",
      "Proof of work",
      "Difficulty",
      "Fork history",
      "The Merge",
      "Transition to proof of stake",
      "What changed",
      "What stayed the same"
    ]
  },
  {
    "id": "13",
    "order": 13,
    "title": "A protocol that evolves",
    "description": "Change a protocol rule, inspect an EIP’s path, and try the shared interfaces that make token integrations work.",
    "lessonIds": [
      "protocol-upgrades",
      "token-standards"
    ],
    "topics": [
      "EIPs",
      "ERCs",
      "Proposal lifecycle",
      "Standards",
      "Core protocol changes",
      "EIP-1559",
      "Typed transactions",
      "Historical upgrades",
      "Protocol upgrades",
      "Design tradeoffs"
    ]
  }
];

export const lessons: Lesson[] = [...coreLessons, ...executionLessons, ...scalingLessons, ...evolutionLessons];
export const storySequence: string[] = [
  "source-of-truth",
  "replication",
  "peers",
  "hashes",
  "signatures",
  "blocks",
  "ethereum-node",
  "wallets",
  "transaction-pool",
  "evm",
  "gas",
  "receipts-and-logs",
  "consensus",
  "transaction-journey",
  "contract-workshop",
  "frontend-rpc",
  "rollups",
  "bridges",
  "oracles",
  "smart-accounts",
  "proof-of-work",
  "the-merge",
  "protocol-upgrades",
  "token-standards"
];
export const lessonById: Record<string, Lesson> = Object.fromEntries(lessons.map(lesson => [lesson.id, lesson]));
