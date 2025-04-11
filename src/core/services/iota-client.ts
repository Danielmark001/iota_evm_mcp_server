import { Client } from "@iota/client";
import { EventEmitter } from "events";
import {
  IOTA_CONFIG,
  IOTA_NETWORK_EVENTS,
  IOTA_TRANSACTION_TYPES,
} from "../config/iota-config.js";

export class IOTAClientWrapper extends EventEmitter {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    super();
    this.client = new Client({
      nodes: IOTA_CONFIG.nodes,
      localPow: IOTA_CONFIG.localPow,
    });
  }

  async connect(): Promise<boolean> {
    try {
      const nodeInfo = await this.client.getInfo();
      console.log("Connected to IOTA network:", nodeInfo);
      this.isConnected = true;

      // Start listening for network events
      this.startEventListeners();

      return true;
    } catch (error) {
      console.error("Failed to connect to IOTA network:", error);
      throw error;
    }
  }

  private startEventListeners() {
    // Poll for new transactions
    setInterval(async () => {
      if (!this.isConnected) return;

      try {
        const transactions = await this.client.getTransactions();
        transactions.forEach((tx) => {
          this.emit(IOTA_NETWORK_EVENTS.TRANSACTION, {
            type: IOTA_NETWORK_EVENTS.TRANSACTION,
            data: tx,
          });
        });
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    }, 5000);

    // Poll for new blocks
    setInterval(async () => {
      if (!this.isConnected) return;

      try {
        const blocks = await this.client.getBlocks();
        blocks.forEach((block) => {
          this.emit(IOTA_NETWORK_EVENTS.BLOCK, {
            type: IOTA_NETWORK_EVENTS.BLOCK,
            data: block,
          });
        });
      } catch (error) {
        console.error("Error fetching blocks:", error);
      }
    }, 10000);
  }

  async sendTransaction(amount: string, recipient: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error("Not connected to IOTA network");
    }

    try {
      // Prepare transaction
      const transaction = await this.client.buildBasicOutput({
        amount,
        unlockConditions: [
          {
            type: IOTA_TRANSACTION_TYPES.BASIC as 0,
            address: {
              type: 0,
              pubKeyHash: recipient,
            },
          },
        ],
      });

      // Sign and submit transaction
      const signedTransaction = await this.client.signTransaction(transaction);
      const transactionId = await this.client.submitTransaction(
        signedTransaction
      );

      return transactionId;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error("Not connected to IOTA network");
    }

    try {
      const balance = await this.client.getBalance(address);
      return balance.toString();
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  disconnect() {
    this.isConnected = false;
    this.removeAllListeners();
  }
}
