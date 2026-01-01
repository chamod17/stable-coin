const hre = require("hardhat");

async function main() {
  console.log("Deploying CNY Stablecoin (BEP20) to Binance Smart Chain");

  // Get admin address from environment or use deployer
  const [deployer] = await hre.ethers.getSigners();
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  
  // Oracle address for BSC - should be set in environment variables
  const oracleAddress = process.env.CHAINLINK_CNY_USD_BSC;
  
  if (!oracleAddress || oracleAddress === "0x0000000000000000000000000000000000000000") {
    console.error("Error: Please set CHAINLINK_CNY_USD_BSC in .env file");
    process.exit(1);
  }

  console.log("Deploying with account:", deployer.address);
  console.log("Admin address:", adminAddress);
  console.log("Oracle address:", oracleAddress);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract (same contract works for BEP20)
  const CNYStablecoin = await hre.ethers.getContractFactory("CNYStablecoin");
  const stablecoin = await CNYStablecoin.deploy(adminAddress, oracleAddress);

  await stablecoin.deployed();

  console.log("CNY Stablecoin (BEP20) deployed to:", stablecoin.address);
  console.log("Token Name:", await stablecoin.name());
  console.log("Token Symbol:", await stablecoin.symbol());
  console.log("Token Decimals:", await stablecoin.decimals());
  console.log("Admin:", await stablecoin.admin());
  console.log("Oracle:", await stablecoin.priceOracle());

  // Verify contract on BSCScan if API key is provided
  if (process.env.BSCSCAN_API_KEY && hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await stablecoin.deployTransaction.wait(6);
    
    console.log("Verifying contract on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: stablecoin.address,
        constructorArguments: [adminAddress, oracleAddress],
      });
      console.log("Contract verified on BSCScan");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }

  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log("Contract Address:", stablecoin.address);
  console.log("Network: Binance Smart Chain");
  console.log("Admin:", adminAddress);
  console.log("Oracle:", oracleAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
