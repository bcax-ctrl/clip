// Deploy NeuroMaxTrader to Base using ethers v6 + solc.
//
//   npm install
//   BASE_RPC=https://mainnet.base.org \
//   WALLET_PRIVATE_KEY=0x... \
//   ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481 \   # Uniswap V3 SwapRouter02 on Base
//   node deploy.js
//
// On success it prints the deployed address — set that as SMART_CONTRACT_ADDRESS
// in the backend .env.
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { ethers } from "ethers";

const SOURCE_FILE = "NeuroMaxTrader.sol";
const CONTRACT_NAME = "NeuroMaxTrader";

function compile() {
  const source = fs.readFileSync(path.resolve(SOURCE_FILE), "utf8");
  const input = {
    language: "Solidity",
    sources: { [SOURCE_FILE]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors || []).filter((e) => e.severity === "error");
  if (errors.length) {
    errors.forEach((e) => console.error(e.formattedMessage));
    throw new Error("Solidity compilation failed");
  }
  const c = out.contracts[SOURCE_FILE][CONTRACT_NAME];
  return { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
}

async function main() {
  const { BASE_RPC, WALLET_PRIVATE_KEY, ROUTER } = process.env;
  if (!WALLET_PRIVATE_KEY || !ROUTER) {
    throw new Error("Set WALLET_PRIVATE_KEY and ROUTER env vars");
  }
  const { abi, bytecode } = compile();
  const provider = new ethers.JsonRpcProvider(BASE_RPC || "https://mainnet.base.org");
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

  console.log("Deploying NeuroMaxTrader from", wallet.address);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(ROUTER);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ NeuroMaxTrader deployed at:", address);
  console.log("   Set SMART_CONTRACT_ADDRESS=" + address + " in backend/.env");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
