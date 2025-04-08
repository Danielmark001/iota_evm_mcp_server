// src/core/iota-chains.ts
// Define IOTA EVM chain configurations

export const iotaMainnet = {
  id: 1074,
  name: "IOTA EVM",
  network: "iota",
  nativeCurrency: {
    name: "MIOTA",
    symbol: "MIOTA",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://evm.wasp.sc.iota.org"],
    },
    public: {
      http: ["https://evm.wasp.sc.iota.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "IOTA EVM Explorer",
      url: "https://explorer.iota.org/mainnet/evm",
    },
  },
} as const;

export const iotaTestnet = {
  id: 1075,
  name: "IOTA Testnet EVM",
  network: "iota-testnet",
  nativeCurrency: {
    name: "MIOTA",
    symbol: "MIOTA",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.evm.wasp.sc.iota.org"],
    },
    public: {
      http: ["https://testnet.evm.wasp.sc.iota.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "IOTA Testnet Explorer",
      url: "https://explorer.iota.org/testnet/evm",
    },
  },
} as const;

export const shimmerEVM = {
  id: 148,
  name: "Shimmer EVM",
  network: "shimmer",
  nativeCurrency: {
    name: "Shimmer",
    symbol: "SMR",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://json-rpc.evm.shimmer.network"],
    },
    public: {
      http: ["https://json-rpc.evm.shimmer.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Shimmer Explorer",
      url: "https://explorer.evm.shimmer.network",
    },
  },
} as const;
