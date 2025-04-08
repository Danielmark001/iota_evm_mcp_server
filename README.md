# IOTA MCP Server

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![IOTA Integration](https://img.shields.io/badge/IOTA-Integrated-green)
![EVM Networks](https://img.shields.io/badge/Networks-30+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)
![Viem](https://img.shields.io/badge/Viem-1.0+-green)

A comprehensive Model Context Protocol (MCP) server that provides blockchain services for IOTA and multiple EVM-compatible networks. This server enables AI agents to interact with IOTA, Shimmer, Ethereum, Optimism, Arbitrum, Base, Polygon, and many other EVM chains through a unified interface.

## 📋 Contents

- [Overview](#-overview)
- [Features](#-features)
- [IOTA Integration](#-iota-integration)
- [Supported Networks](#-supported-networks)
- [Prerequisites](#️-prerequisites)
- [Installation](#-installation)
- [Server Configuration](#️-server-configuration)
- [Usage](#-usage)
- [API Reference](#-api-reference)
  - [IOTA Tools](#iota-tools)
  - [IOTA Resources](#iota-resources)
  - [General Tools](#general-tools)
  - [General Resources](#general-resources)
- [Security Considerations](#-security-considerations)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [License](#-license)

## 🏆 IOTA APAC AngelHack 2025 Submission

This project was developed as a submission for the IOTA APAC AngelHack 2025 hackathon. It focuses on enhancing the integration between IOTA networks and AI systems through the Model Context Protocol (MCP).

### Hackathon Tracks

- **Primary**: AI Agents
- **Secondary**: Developer Tools
- **Additional**: Cross-Chain

## 🔭 Overview

The IOTA MCP Server leverages the Model Context Protocol to provide blockchain services to AI agents, with a special focus on IOTA and its ecosystem. It supports a wide range of services including:

- Reading blockchain state (balances, transactions, blocks, etc.)
- Interacting with smart contracts
- Transferring tokens (native, ERC20, ERC721, ERC1155)
- IOTA-specific services (staking, network status, etc.)
- Querying token metadata and balances
- Chain-specific services across 30+ EVM networks including IOTA networks
- **ENS name resolution** for all address parameters (use human-readable names instead of addresses)

All services are exposed through a consistent interface of MCP tools and resources, making it easy for AI agents to discover and use blockchain functionality across multiple networks including IOTA, Shimmer, and all other EVM-compatible chains.

## ✨ Features

### IOTA-Specific Features

- **IOTA network support** for IOTA EVM, IOTA Testnet, and Shimmer networks
- **IOTA token information** including name, symbol, decimals, and total supply
- **IOTA network status** monitoring and health checks
- **IOTA balance queries** for checking native token balances
- **IOTA staking information** for monitoring staking activities
- **IOTA transaction history** and analysis
- **Cross-chain comparisons** between IOTA and other networks

### Blockchain Data Access

- **Multi-chain support** for 30+ EVM-compatible networks including IOTA
- **Chain information** including blockNumber, chainId, and RPCs
- **Block data** access by number, hash, or latest
- **Transaction details** and receipts with decoded logs
- **Address balances** for native tokens and all token standards
- **ENS resolution** for human-readable Ethereum addresses

### Token Services

- **ERC20 Tokens**

  - Get token metadata (name, symbol, decimals, supply)
  - Check token balances
  - Transfer tokens between addresses
  - Approve spending allowances

- **NFTs (ERC721)**

  - Get collection and token metadata
  - Verify token ownership
  - Transfer NFTs between addresses
  - Retrieve token URIs and count holdings

- **Multi-tokens (ERC1155)**
  - Get token balances and metadata
  - Transfer tokens with quantity
  - Access token URIs

### Smart Contract Interactions

- **Read contract state** through view/pure functions
- **Write services** with private key signing
- **Contract verification** to distinguish from EOAs
- **Event logs** retrieval and filtering

## 🌐 Supported Networks

### IOTA Networks

- IOTA EVM Mainnet
- IOTA Testnet
- Shimmer

### Mainnets

- Ethereum (ETH)
- Optimism (OP)
- Arbitrum (ARB)
- Arbitrum Nova
- Base
- Polygon (MATIC)
- Polygon zkEVM
- Avalanche (AVAX)
- Binance Smart Chain (BSC)
- zkSync Era
- Linea
- Celo
- Gnosis (xDai)
- Fantom (FTM)
- Filecoin (FIL)
- Moonbeam
- Moonriver
- Cronos
- Scroll
- Mantle
- Manta
- Blast
- Fraxtal
- Mode
- Metis
- Kroma
- Zora
- Aurora
- Canto
- And more...

### Testnets

- Sepolia
- Optimism Sepolia
- Arbitrum Sepolia
- Base Sepolia
- Polygon Amoy
- And more...

## 🛠️ Prerequisites

- [Bun](https://bun.sh/) 1.0.0 or higher
- Node.js 18.0.0 or higher (if not using Bun)

## 📦 Installation

### Clone the Repository

First, clone the repository to your local machine:

```bash
git clone https://github.com/Danielmark001/iota_evm_mcp_server.git
cd iota_evm_mcp_server
```

### Install Dependencies

Using Bun (recommended):

```bash
bun install
```

Using npm:

```bash
npm install
```

## ⚙️ Configuration

The server uses the following default configuration that can be adjusted in the `.env` file:

```bash
# Create a .env file in the root directory
touch .env

# Add configuration values
echo "PORT=3001" >> .env
echo "HOST=0.0.0.0" >> .env
echo "DEFAULT_CHAIN_ID=1074" >> .env  # IOTA EVM Mainnet
```

## 🚀 Usage

### Start the Server

#### Using stdio (for embedding in CLI tools)

```bash
# Start the server
bun start

# Development mode with auto-reload
bun dev
```

#### Using HTTP Server (for web applications)

```bash
# Start the HTTP server
bun start:http

# Development mode with auto-reload
bun dev:http
```

### Build for Production

```bash
# Build the project
bun run build

# Build the HTTP server
bun run build:http
```

### Docker Deployment

```bash
# Build the Docker image
docker build -t iota_evm_mcp_server .

# Run the container
docker run -p 3001:3001 iota_evm_mcp_server
```

## 🔌 Integrating with AI Systems

### Example: Using with Claude, GPT-4, or other AI assistants

AI platforms that support the Model Context Protocol can directly connect to the IOTA MCP Server. For example, with a properly configured MCP-enabled AI:

```
User: "Check the balance of address 0x1234... on the IOTA network"

AI Assistant: [Uses IOTA MCP Server to check balance and returns]
"The balance of address 0x1234... on the IOTA network is 15.75 MIOTA"
```

### Example: Using the server with custom AI agents

```javascript
// Connect to MCP server
const mcpClient = new McpClient({
  endpoint: "http://localhost:3001",
});

// Call IOTA-specific tool
const response = await mcpClient.callTool("get_iota_balance", {
  address: "0x1234...",
  network: "iota",
});

console.log(response);
```

## 📚 API Reference

The server provides a comprehensive set of tools and resources for interacting with IOTA and other blockchain networks. For detailed API documentation, please see the [API Reference](./docs/API_REFERENCE.md).

### Key IOTA Tools

- `get_iota_network_info`: Get information about IOTA networks
- `get_iota_balance`: Get token balances for an address
- `transfer_iota`: Transfer IOTA tokens to another address
- `get_iota_staking_info`: Get staking information
- `verify_iota_network_status`: Check network health and status

### Key IOTA Resources

- `iota://{network}/info`: Information about an IOTA network
- `iota://{network}/block/latest`: Latest block on an IOTA network
- `iota://{network}/address/{address}/balance`: Token balance for an address
- `iota://{network}/status`: Network health and status

## 🧪 Testing

Run the test suite to verify the server functionality:

```bash
bun test
```

Run specific test files:

```bash
bun test test/iota.test.ts
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [IOTA Foundation](https://www.iota.org/) for their amazing technology
- [Model Context Protocol](https://modelcontextprotocol.github.io/) for enabling AI-blockchain interaction
- [Viem](https://viem.sh/) for the EVM interaction library
- IOTA APAC AngelHack 2025 organizers and mentors
- All contributors and supporters

---

Built with ❤️ for the IOTA community
