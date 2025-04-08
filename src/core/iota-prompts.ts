// src/core/iota-prompts.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register IOTA-specific prompts with the MCP server
 * @param server The MCP server instance
 */
export function registerIOTAPrompts(server: McpServer) {
  // IOTA network exploration prompt
  server.prompt(
    "explore_iota_network",
    "Explore information about an IOTA network",
    {
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to explore (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    ({ network = "iota" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze the ${network} network and provide information about its key metrics, current status, and significance in the IOTA ecosystem. Include details about block production, transaction volume, and any recent developments.`,
          },
        },
      ],
    })
  );

  // IOTA transaction analysis prompt
  server.prompt(
    "analyze_iota_transaction",
    "Analyze a specific IOTA transaction",
    {
      txHash: z.string().describe("Transaction hash to analyze"),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to use (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    ({ txHash, network = "iota" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze transaction ${txHash} on the ${network} network and provide a detailed explanation of what this transaction does, who the parties involved are, the amount transferred (if applicable), gas used, and any other relevant information specific to IOTA's ecosystem.`,
          },
        },
      ],
    })
  );

  // IOTA address analysis prompt
  server.prompt(
    "analyze_iota_address",
    "Analyze an address on an IOTA network",
    {
      address: z.string().describe("Address to analyze"),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to use (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    ({ address, network = "iota" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze the address ${address} on the ${network} network. Provide information about its IOTA balance, transaction count, and any staking activities or other relevant information specific to the IOTA ecosystem.`,
          },
        },
      ],
    })
  );

  // IOTA smart contract interaction guidance
  server.prompt(
    "interact_with_iota_contract",
    "Get guidance on interacting with a smart contract on IOTA",
    {
      contractAddress: z.string().describe("The contract address"),
      abiJson: z
        .string()
        .optional()
        .describe("The contract ABI as a JSON string"),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to use (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    ({ contractAddress, abiJson, network = "iota" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: abiJson
              ? `I need to interact with the smart contract at address ${contractAddress} on the ${network} network. Here's the ABI:\n\n${abiJson}\n\nPlease analyze this contract's functions and provide guidance on how to interact with it safely on the IOTA network. Explain what each function does, what parameters it requires, and any IOTA-specific considerations I should be aware of.`
              : `I need to interact with the smart contract at address ${contractAddress} on the ${network} network. Please help me understand what this contract does and how I can interact with it safely on the IOTA network. Include any IOTA-specific considerations I should be aware of.`,
          },
        },
      ],
    })
  );

  // IOTA staking guide
  server.prompt(
    "iota_staking_guide",
    "Get guidance on staking IOTA tokens",
    {
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to use (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    ({ network = "iota" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please provide a comprehensive guide on staking IOTA tokens on the ${network} network. Include details on how staking works, current staking options, expected rewards, risks, lock-up periods, and step-by-step instructions for both beginners and advanced users. Also explain how IOTA staking differs from other blockchain networks.`,
          },
        },
      ],
    })
  );

  // IOTA DeFi opportunities
  server.prompt(
    "iota_defi_opportunities",
    "Explore DeFi opportunities in the IOTA ecosystem",
    {
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to focus on (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    ({ network = "iota" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please provide an overview of the current DeFi opportunities available in the ${network} ecosystem. Include information about lending/borrowing platforms, decentralized exchanges, yield farming opportunities, liquidity pools, and other DeFi applications. For each opportunity, explain the potential returns, risks, and how it leverages IOTA's unique features.`,
          },
        },
      ],
    })
  );

  // IOTA vs other networks comparison
  server.prompt(
    "compare_iota_with_networks",
    "Compare IOTA with other blockchain networks",
    {
      networks: z
        .string()
        .describe(
          "Comma-separated list of networks to compare with IOTA (e.g., 'ethereum,solana,avalanche')"
        ),
    },
    ({ networks }) => {
      const networkList = networks.split(",").map((n) => n.trim());
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please compare IOTA with the following blockchain networks: ${networkList.join(
                ", "
              )}. Include information about their architecture, consensus mechanisms, transaction fees, scalability, environmental impact, smart contract capabilities, and ecosystem development. Highlight IOTA's unique features such as feeless transactions and its Directed Acyclic Graph (DAG) structure, and explain how these compare to the other networks.`,
            },
          },
        ],
      };
    }
  );
}
