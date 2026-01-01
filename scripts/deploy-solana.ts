import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying CNY Stablecoin to Solana");

  // Load wallet
  const walletPath = process.env.SOLANA_WALLET_PATH || 
    path.join(process.env.HOME!, ".config/solana/id.json");
  
  if (!fs.existsSync(walletPath)) {
    console.error("Error: Wallet file not found at", walletPath);
    console.log("Please create a wallet or set SOLANA_WALLET_PATH");
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  // Setup connection
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("Admin wallet:", walletKeypair.publicKey.toString());
  console.log("Network:", rpcUrl);

  // Get balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("Wallet balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
    console.error("Error: Insufficient balance. Need at least 0.1 SOL");
    process.exit(1);
  }

  // Load program
  const programPath = path.join(
    __dirname,
    "../contracts/solana/target/deploy/cny_stablecoin.so"
  );

  if (!fs.existsSync(programPath)) {
    console.error("Error: Program not built. Please run: npm run build:solana");
    process.exit(1);
  }

  const idlPath = path.join(
    __dirname,
    "../contracts/solana/target/idl/cny_stablecoin.json"
  );

  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.metadata.address);

  console.log("Program ID:", programId.toString());

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new Program(idl, programId, provider);

  // Create mint for the token
  const mintKeypair = Keypair.generate();
  console.log("Creating mint:", mintKeypair.publicKey.toString());

  // Get Pyth oracle address
  const pythOracleAddress = process.env.PYTH_CNY_USD_SOLANA;
  if (!pythOracleAddress) {
    console.error("Error: Please set PYTH_CNY_USD_SOLANA in .env file");
    process.exit(1);
  }

  const oraclePublicKey = new PublicKey(pythOracleAddress);

  // Derive PDA for state
  const [statePDA, stateBump] = await PublicKey.findProgramAddress(
    [Buffer.from("state")],
    programId
  );

  console.log("State PDA:", statePDA.toString());

  try {
    // Initialize the program
    const tx = await program.methods
      .initialize(18) // 18 decimals
      .accounts({
        state: statePDA,
        mint: mintKeypair.publicKey,
        admin: walletKeypair.publicKey,
        priceOracle: oraclePublicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("\nDeployment successful!");
    console.log("Transaction signature:", tx);
    console.log("\nDeployment Summary:");
    console.log("==================");
    console.log("Program ID:", programId.toString());
    console.log("Mint Address:", mintKeypair.publicKey.toString());
    console.log("State PDA:", statePDA.toString());
    console.log("Admin:", walletKeypair.publicKey.toString());
    console.log("Oracle:", oraclePublicKey.toString());
    console.log("Network:", rpcUrl);

    // Save deployment info
    const deploymentInfo = {
      network: rpcUrl,
      programId: programId.toString(),
      mint: mintKeypair.publicKey.toString(),
      state: statePDA.toString(),
      admin: walletKeypair.publicKey.toString(),
      oracle: oraclePublicKey.toString(),
      timestamp: new Date().toISOString(),
      transactionSignature: tx,
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    fs.writeFileSync(
      path.join(deploymentsDir, "solana-deployment.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\nDeployment info saved to deployments/solana-deployment.json");

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
