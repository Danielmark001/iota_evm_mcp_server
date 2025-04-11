export const IOTA_CONFIG = {
  nodes: [
    {
      url: "https://api.iota.org",
      auth: {
        jwt: process.env.IOTA_JWT_TOKEN || "",
      },
    },
  ],
  localPow: true,
  ssl: {
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    certPath: "./certs/client.crt",
    keyPath: "./certs/client.key",
    caPath: "./certs/iota-root-ca.crt",
  },
};

export const IOTA_NETWORK_EVENTS = {
  TRANSACTION: "transaction",
  BLOCK: "block",
  MILESTONE: "milestone",
};

export const IOTA_TRANSACTION_TYPES = {
  BASIC: 0,
  ALIAS: 1,
  NFT: 2,
};
