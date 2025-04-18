import { 
  type Address, 
  type Hex,
  type Hash,
  formatUnits,
  getContract
} from 'viem';
import { getPublicClient } from './clients.js';

// Standard ERC20 ABI (minimal for reading)
const erc20Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'tokenURI',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Standard ERC1155 ABI (minimal for reading)
const erc1155Abi = [
  {
    inputs: [{ type: 'uint256', name: 'id' }],
    name: 'uri',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * Get ERC20 token information
 */
export async function getERC20TokenInfo(
  tokenAddress: Address,
  network: string = 'ethereum'
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  formattedTotalSupply: string;
}> {
  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: publicClient,
  });

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.read.name(),
    contract.read.symbol(),
    contract.read.decimals(),
    contract.read.totalSupply()
  ]);

  return {
    name,
    symbol,
    decimals,
    totalSupply,
    formattedTotalSupply: formatUnits(totalSupply, decimals)
  };
}

/**
 * Get ERC721 token metadata
 */
export async function getERC721TokenMetadata(
  tokenAddress: Address,
  tokenId: bigint,
  network: string = 'ethereum'
): Promise<{
  name: string;
  symbol: string;
  tokenURI: string;
}> {
  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: erc721Abi,
    client: publicClient,
  });

  const [name, symbol, tokenURI] = await Promise.all([
    contract.read.name(),
    contract.read.symbol(),
    contract.read.tokenURI([tokenId])
  ]);

  return {
    name,
    symbol,
    tokenURI
  };
}

/**
 * Get ERC1155 token URI
 */
export async function getERC1155TokenURI(
  tokenAddress: Address,
  tokenId: bigint,
  network: string = 'ethereum'
): Promise<string> {
  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: erc1155Abi,
    client: publicClient,
  });

  return contract.read.uri([tokenId]);
}

/**
 * Get ERC20 token balance for an address
 */
export async function getERC20Balance(
  tokenAddress: Address,
  ownerAddress: Address,
  network: string = 'ethereum'
): Promise<{
  raw: bigint;
  formatted: string;
  token: {
    symbol: string;
    decimals: number;
  };
}> {
  const publicClient = getPublicClient(network);

  // ERC20 balanceOf ABI
  const balanceOfAbi = [
    {
      inputs: [{ type: 'address', name: 'account' }],
      name: 'balanceOf',
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    }
  ] as const;

  // Create contract instance
  const contract = getContract({
    address: tokenAddress,
    abi: [...erc20Abi, ...balanceOfAbi],
    client: publicClient,
  });

  // Get token info and balance
  const [balance, symbol, decimals] = await Promise.all([
    contract.read.balanceOf([ownerAddress]),
    contract.read.symbol(),
    contract.read.decimals()
  ]);

  return {
    raw: balance,
    formatted: formatUnits(balance, decimals),
    token: {
      symbol,
      decimals,
    }
  };
}