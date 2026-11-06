import type { ComponentType } from 'react';
import type { SimulationKey, SimulationProps } from '../content/types';
import { Banking } from './Banking';
import { Replication } from './Replication';
import { PeersLab, HashLab, SignatureLab, BlockLab } from './Foundations';
import { NodeLab, WalletLab, JourneyLab, EvmLab, GasLab, ConsensusLab } from './EthereumLabs';
import { TxPoolLab, ReceiptsLab, ContractLab, RpcLab } from './execution';
import { RollupLab, BridgeLab, OracleLab, SmartAccountLab } from './scaling';
import { ProofOfWorkLab, MergeLab, UpgradeLab, StandardsLab } from './evolution';

export const simulations: Record<SimulationKey, ComponentType<SimulationProps>> = {
  banking: Banking, replication: Replication, peers: PeersLab, hashes: HashLab,
  signatures: SignatureLab, blocks: BlockLab, node: NodeLab, wallet: WalletLab,
  journey: JourneyLab, evm: EvmLab, gas: GasLab, consensus: ConsensusLab,
  txpool: TxPoolLab, receipts: ReceiptsLab, contracts: ContractLab, rpc: RpcLab,
  rollups: RollupLab, bridges: BridgeLab, oracles: OracleLab, smartAccounts: SmartAccountLab,
  pow: ProofOfWorkLab, merge: MergeLab, upgrades: UpgradeLab, standards: StandardsLab,
};
