# IOTA MCP Server Demo

This is a demonstration interface for the IOTA EVM MCP Server, showing how Claude or other AI assistants can interact with IOTA blockchain data.

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- IOTA EVM MCP Server running on port 3001

### Installation

1. Install dependencies:

```bash
cd demo
npm install
# or if using Bun
bun install
```

2. Start the demo server:

```bash
npm start
# or if using Bun
bun start
```

3. Open your browser and navigate to http://localhost:3006

## Demo Features

The demo showcases three main scenarios:

1. **Network Status** - Shows how Claude can analyze the current state of the IOTA network and gas prices to recommend transaction strategies.

2. **Arbitrage Analysis** - Demonstrates cross-chain arbitrage monitoring between IOTA, Shimmer, and Ethereum networks.

3. **Smart Contract Deployment** - Shows how Claude can provide guidance on smart contract deployment based on current network conditions.

## Architecture

The demo consists of:

1. **React Frontend** - A user interface that simulates Claude's interactions with the MCP server
2. **Demo Server** - A WebSocket-enabled Express server that mediates between the UI and the MCP server
3. **IOTA MCP Server** - The actual blockchain interface

## Technical Details

- Real-time updates using WebSockets
- React frontend for smooth user experience
- Integration with the actual MCP server when available (falls back to demo data)
