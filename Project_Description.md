# IOTA MCP Server: AI-Blockchain Bridge

## Project Description (96 words)
IOTA MCP Server is an AI-blockchain bridge that enables AI agents to interact seamlessly with IOTA networks. Built on the Model Context Protocol (MCP), it provides a comprehensive interface for AI systems to access IOTA's native features, query balances, execute transactions, and interact with smart contracts. The server supports IOTA Mainnet, Testnet, and Shimmer while maintaining compatibility with 30+ other EVM networks. This integration accelerates IOTA ecosystem adoption by making blockchain functionality accessible to AI agents, fostering a new generation of intelligent applications built on IOTA's unique infrastructure.

## Selected Hackathon Track
- Primary: AI Agents
- Secondary: Developer Tools
- Additional: Cross-Chain

## Tech Stack
- TypeScript/JavaScript
- Bun (JavaScript runtime)
- Model Context Protocol (MCP) SDK
- Viem (Ethereum/EVM interaction library)
- Express.js (HTTP server)
- Zod (Schema validation)
- IOTA EVM JSON-RPC APIs
- Shimmer EVM JSON-RPC APIs

## Improvements Made During Hackathon Period

### Core IOTA Integration
- Implemented dedicated IOTA service module for interacting with IOTA networks
- Added support for IOTA EVM, IOTA Testnet, and Shimmer networks
- Created IOTA-specific chain configurations with proper RPC endpoints
- Implemented native IOTA token queries and transfer functionality
- Added IOTA staking information retrieval

### MCP IOTA Tools
- Created `get_iota_network_info` tool for querying IOTA network details
- Implemented `get_iota_balance` tool for checking IOTA token balances
- Added `transfer_iota` tool for sending IOTA tokens between addresses
- Built `get_iota_staking_info` tool for monitoring staking activities
- Created `verify_iota_network_status` tool for checking network health

### MCP IOTA Resources
- Implemented `iota://{network}/info` resource for IOTA network information
- Added `iota://{network}/block/latest` resource for latest block data
- Created `iota://{network}/address/{address}/balance` resource for token balances
- Implemented `iota://{network}/address/{address}/staking` resource for staking info
- Added `iota://{network}/tx/{txHash}` resource for transaction information
- Built `iota://{network}/status` resource for network health monitoring

### AI Prompt Templates
- Created specialized prompt templates for IOTA network exploration
- Added prompts for IOTA transaction analysis
- Implemented prompts for IOTA address analysis
- Built prompts for IOTA smart contract interaction guidance
- Added prompts for IOTA staking and DeFi opportunities
- Created comparative analysis prompts between IOTA and other networks

### Server Integration
- Updated server initialization to include IOTA functionality
- Integrated IOTA networks into the general chain configuration
- Added automatic detection of IOTA networks in all generic tools
- Enhanced error handling for IOTA-specific operations
- Improved documentation for IOTA-related functionality