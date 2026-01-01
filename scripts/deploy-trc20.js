const TronWeb = require('tronweb');
require('dotenv').config();

async function main() {
  console.log("Deploying CNY Stablecoin (TRC20) to Tron Network");

  // Initialize TronWeb
  const tronWeb = new TronWeb({
    fullHost: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
    privateKey: process.env.ADMIN_PRIVATE_KEY
  });

  const adminAddress = tronWeb.address.fromPrivateKey(process.env.ADMIN_PRIVATE_KEY);
  const oracleAddress = process.env.TRON_ORACLE_ADDRESS || tronWeb.address.toHex(adminAddress);

  console.log("Deploying with account:", adminAddress);
  console.log("Admin address:", adminAddress);
  console.log("Oracle address:", oracleAddress);

  // Read the compiled contract
  const fs = require('fs');
  const path = require('path');
  
  // Note: You need to compile the contract first with TronBox or similar
  const contractPath = path.join(__dirname, '../artifacts/contracts/tron/CNYStablecoinTRC20.sol/CNYStablecoinTRC20.json');
  
  if (!fs.existsSync(contractPath)) {
    console.error("Contract artifact not found. Please compile the contract first.");
    console.log("You can compile using: hardhat compile");
    process.exit(1);
  }

  const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  // Deploy contract
  try {
    const contract = await tronWeb.contract().new({
      abi: contractArtifact.abi,
      bytecode: contractArtifact.bytecode,
      feeLimit: 1000000000,
      callValue: 0,
      parameters: [
        tronWeb.address.toHex(adminAddress),
        oracleAddress
      ]
    });

    console.log("CNY Stablecoin (TRC20) deployed to:", contract.address);
    console.log("Contract deployed successfully!");

    // Get token info
    const name = await contract.name().call();
    const symbol = await contract.symbol().call();
    const decimals = await contract.decimals().call();
    const admin = await contract.admin().call();

    console.log("\nToken Information:");
    console.log("==================");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals.toString());
    console.log("Admin:", tronWeb.address.fromHex(admin));
    console.log("Oracle:", tronWeb.address.fromHex(await contract.priceOracle().call()));

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
