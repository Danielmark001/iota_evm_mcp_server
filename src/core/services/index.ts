// Export all services
export * from './clients.js';
export * from './balance.js';
export * from './transfer.js';
export * from './blocks.js';
export * from './transactions.js';
export * from './contracts.js';
export { 
  getERC20TokenInfo,
  getERC721TokenMetadata,
  getERC1155TokenURI
} from './tokens.js';
export * from './ens.js';
export { utils as helpers } from './utils.js';

// Export IOTA-specific services
export { 
  isIOTANetwork, 
  getIOTATokenInfo, 
  getIOTABalance, 
  getIOTAStakingInfo, 
  getIOTAGasPrices, 
  estimateIOTATransactionCost,
  deployIOTASmartContract,
  analyzeIOTASmartContract
} from './iota.js';

// Export arbitrage services
export {
  getTokenPrice,
  findArbitrageOpportunities,
  getSupportedArbitrageTokens
} from './arbitrage.js';

// Re-export common types for convenience
export type { 
  Address, 
  Hash, 
  Hex,
  Block,
  TransactionReceipt,
  Log
} from 'viem'; 