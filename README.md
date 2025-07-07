[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/danielmark001-iota-evm-mcp-server-badge.png)](https://mseep.ai/app/danielmark001-iota-evm-mcp-server)

# IOTA MCP Server

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![IOTA Integration](https://img.shields.io/badge/IOTA-Integrated-green)
![EVM Networks](https://img.shields.io/badge/Networks-30+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)
![Viem](https://img.shields.io/badge/Viem-1.0+-green)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.0.0-brightgreen)

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
- [Interactive Demo](#-integrating-with-ai-systems)
- [API Reference](#-api-reference)
  - [IOTA Tools](#iota-tools)
  - [Arbitrage Tools](#arbitrage-tools)
  - [IOTA Resources](#iota-resources)
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
- IOTA-specific services (staking, network status, gas estimation, etc.)
- Querying token metadata and balances
- Chain-specific services across 30+ EVM networks including IOTA networks
- **ENS name resolution** for all address parameters (use human-readable names instead of addresses)

All services are exposed through a consistent interface of MCP tools and resources, making it easy for AI agents to discover and use blockchain functionality across multiple networks including IOTA, Shimmer, and all other EVM-compatible chains.

## ✨ Features

### IOTA-Specific Features

- **IOTA network support** for IOTA EVM, IOTA Testnet, and Shimmer networks
- **IOTA token information** including name, symbol, decimals, and total supply
- **IOTA network metrics** with TPS, block time, gas usage, etc.
- **IOTA network status** monitoring and health checks
- **IOTA balance queries** for checking native token balances
- **IOTA transaction analytics** with gas usage, type detection, and age analysis
- **IOTA smart contract deployment** for direct deployment of Solidity contracts
- **IOTA smart contract analysis** with function detection, standard verification, and security assessment
- **IOTA DeFi integrations** for liquidity pools, lending markets, and staking
- **IOTA staking information** for monitoring staking activities
- **IOTA transaction history** and analysis
- **Gas price estimation** with network congestion analysis and transaction cost prediction
- **Cross-chain arbitrage monitoring** for detecting profitable trading opportunities between IOTA and other networks
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

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration:

```bash
# Server Configuration
PORT=3001
HOST=0.0.0.0
DEFAULT_CHAIN_ID=1074  # IOTA EVM Mainnet

# IOTA Configuration
IOTA_JWT_TOKEN=your_jwt_token_here
IOTA_NODE_URL=https://api.iota.org
IOTA_MNEMONIC=your_mnemonic_here  # Required for sending transactions

# SSL Configuration (optional for development)
SSL_CERT_PATH=./certs/client.crt
SSL_KEY_PATH=./certs/client.key
SSL_CA_PATH=./certs/iota-root-ca.crt
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

### Interactive Demo

A visual demonstration interface is included to showcase how Claude or other AI assistants can interact with IOTA blockchain data. The demo features:

1. **Network Status Analysis** - Shows how AI can analyze current IOTA network conditions and gas prices
2. **Cross-Chain Arbitrage** - Demonstrates monitoring of price differences between IOTA and other networks
3. **Smart Contract Deployment** - Showcases AI guidance for optimal smart contract deployment

To run the demo:

```bash
# Install demo dependencies
npm run demo:install

# Start both the MCP server and demo interface
npm run demo:start

# For development with hot-reloading
npm run demo:dev
```

Then open your browser to http://localhost:3006

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
- `get_iota_gas_prices`: Get current gas prices with network congestion analysis
- `estimate_iota_transaction_cost`: Estimate the cost of transactions with different speed options
- `deploy_iota_smart_contract`: Deploy a Solidity smart contract to IOTA networks
- `analyze_iota_smart_contract`: Perform security analysis on deployed smart contracts

### Arbitrage Tools

- `get_cross_chain_token_price`: Get token prices across different networks including IOTA
- `find_arbitrage_opportunities`: Detect profitable trading opportunities between IOTA and other chains
- `list_arbitrage_tokens`: View all tokens available for arbitrage monitoring

### Key IOTA Resources

- `iota://{network}/info`: Information about an IOTA network
- `iota://{network}/block/latest`: Latest block on an IOTA network
- `iota://{network}/address/{address}/balance`: Token balance for an address
- `iota://{network}/status`: Network health and status

## 🧪 Testing

Run the test suite:

```bash
# Using Bun (recommended)
bun test

# Using npm
npm test
```

Run specific test files:

```bash
bun test test/iota-defi-agent.test.ts
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and follow our code of conduct.

## 🐛 Troubleshooting

### Common Issues

1. **Node Version Error**

   - Make sure you have Node.js 18.0.0 or higher installed
   - Use `nvm` to manage Node.js versions

2. **Bun Installation Issues**

   - Follow the official [Bun installation guide](https://bun.sh/)
   - Try reinstalling Bun if you encounter issues

3. **IOTA Connection Issues**

   - Verify your IOTA node URL is correct
   - Check your JWT token is valid
   - Ensure your network connection is stable

4. **Build Errors**
   - Run `bun install` to ensure all dependencies are installed
   - Clear the build directory: `rm -rf build/`
   - Check TypeScript configuration in `tsconfig.json`

### Getting Help

- Open an issue on GitHub
- Check our [FAQ](https://github.com/Danigelmark001/iota_evm_mcp_server/wiki/FAQ)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [IOTA Foundation](https://www.iota.org/) for their amazing technology
- [Model Context Protocol](https://modelcontextprotocol.github.io/) for enabling AI-blockchain interaction
- [Viem](https://viem.sh/) for the EVM interaction library
- IOTA APAC AngelHack 2025 organizers and mentors
- All contributors and supporters

---

Built with ❤️ for the IOTA community
