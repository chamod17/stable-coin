# CNY Stablecoin Deployment Guide

This guide provides detailed instructions for deploying the CNY Stablecoin on each supported blockchain.

## Pre-Deployment Checklist

- [ ] All contracts compiled successfully
- [ ] All tests passing
- [ ] Environment variables configured in `.env`
- [ ] Admin wallet funded with native tokens for gas
- [ ] Oracle addresses verified for target network
- [ ] Security audit completed (for mainnet)

## Deployment Steps by Chain

### 1. Ethereum (ERC20)

#### Testnet Deployment (Goerli)

```bash
# Configure .env
ETHEREUM_RPC_URL=https://goerli.infura.io/v3/YOUR_KEY
ADMIN_PRIVATE_KEY=your_private_key
CHAINLINK_CNY_USD_ETH=0x... # Goerli test oracle

# Deploy
npx hardhat run scripts/deploy-erc20.js --network goerli
```

#### Mainnet Deployment

```bash
# Configure .env
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
ADMIN_PRIVATE_KEY=your_private_key
CHAINLINK_CNY_USD_ETH=0x... # Mainnet Chainlink CNY/USD feed

# Deploy
npx hardhat run scripts/deploy-erc20.js --network ethereum
```

**Oracle Address:**
- Mainnet: Check [Chainlink Data Feeds](https://docs.chain.link/data-feeds/price-feeds/addresses) for CNY/USD
- If CNY/USD not available, you may need to deploy a custom oracle or use a proxy feed

**Gas Estimate:** ~2-3M gas

### 2. Binance Smart Chain (BEP20)

#### Testnet Deployment (BSC Testnet)

```bash
# Configure .env
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
ADMIN_PRIVATE_KEY=your_private_key
CHAINLINK_CNY_USD_BSC=0x... # BSC testnet oracle

# Deploy
npx hardhat run scripts/deploy-bep20.js --network bscTestnet
```

#### Mainnet Deployment

```bash
# Configure .env
BSC_RPC_URL=https://bsc-dataseed.binance.org/
ADMIN_PRIVATE_KEY=your_private_key
CHAINLINK_CNY_USD_BSC=0x... # BSC mainnet oracle

# Deploy
npx hardhat run scripts/deploy-bep20.js --network bsc
```

**Oracle Address:**
- BSC Mainnet: Check BSC-compatible Chainlink feeds or deploy custom oracle
- Alternative: Use Band Protocol or other BSC oracle providers

**Gas Estimate:** ~2-3M gas (much cheaper than Ethereum)

### 3. Tron (TRC20)

#### Testnet Deployment (Nile/Shasta)

```bash
# Configure .env
TRON_RPC_URL=https://api.shasta.trongrid.io
ADMIN_PRIVATE_KEY=your_private_key
TRON_ORACLE_ADDRESS=your_oracle_address

# Compile first
npx hardhat compile

# Deploy
node scripts/deploy-trc20.js
```

#### Mainnet Deployment

```bash
# Configure .env
TRON_RPC_URL=https://api.trongrid.io
ADMIN_PRIVATE_KEY=your_private_key
TRON_ORACLE_ADDRESS=your_oracle_address

# Deploy
node scripts/deploy-trc20.js
```

**Oracle Options:**
- WINkLink (Tron's oracle solution)
- Custom oracle contract
- Off-chain price feed with on-chain verification

**Note:** Tron uses energy/bandwidth instead of gas. Ensure admin account has sufficient TRX and energy.

**Energy Estimate:** ~150-200M energy for deployment

### 4. Solana (SPL Token)

#### Devnet Deployment

```bash
# Configure Solana CLI
solana config set --url https://api.devnet.solana.com

# Ensure wallet has SOL
solana balance

# If needed, airdrop SOL
solana airdrop 2

# Configure .env
SOLANA_RPC_URL=https://api.devnet.solana.com
PYTH_CNY_USD_SOLANA=... # Pyth devnet CNY/USD account

# Build program
cd contracts/solana/programs/cny-stablecoin
cargo build-bpf

# Deploy
anchor deploy
# Or use the script:
ts-node scripts/deploy-solana.ts
```

#### Mainnet Deployment

```bash
# Configure Solana CLI
solana config set --url https://api.mainnet-beta.solana.com

# Ensure wallet has sufficient SOL (5-10 SOL recommended)
solana balance

# Configure .env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PYTH_CNY_USD_SOLANA=... # Pyth mainnet CNY/USD account

# Build program
cd contracts/solana/programs/cny-stablecoin
cargo build-bpf

# Deploy
anchor deploy

# Or use the script:
ts-node scripts/deploy-solana.ts
```

**Oracle Address:**
- Use Pyth Network CNY/USD price account
- Check [Pyth Price Feeds](https://pyth.network/price-feeds) for account address
- Example format: `0x...` (32-byte public key)

**Cost Estimate:** ~5-10 SOL for program deployment

## Post-Deployment Steps

### 1. Verify Contracts (EVM Chains)

```bash
# Ethereum
npx hardhat verify --network ethereum CONTRACT_ADDRESS ADMIN_ADDRESS ORACLE_ADDRESS

# BSC
npx hardhat verify --network bsc CONTRACT_ADDRESS ADMIN_ADDRESS ORACLE_ADDRESS
```

### 2. Test Basic Functions

After deployment, test the following:

```javascript
// Connect to deployed contract
const contract = await ethers.getContractAt("CNYStablecoin", contractAddress);

// Test oracle
const [price, timestamp] = await contract.getCNYPrice();
console.log("CNY/USD Price:", price.toString());

// Test minting (admin only)
await contract.mint(testAddress, ethers.utils.parseEther("100"));

// Test balance
const balance = await contract.balanceOf(testAddress);
console.log("Balance:", ethers.utils.formatEther(balance));
```

### 3. Save Deployment Information

Create a deployment record with:
- Contract address
- Network/chain ID
- Admin address
- Oracle address
- Deployment transaction hash
- Deployment timestamp
- Initial configuration

Example format:
```json
{
  "network": "ethereum-mainnet",
  "chainId": 1,
  "contractAddress": "0x...",
  "admin": "0x...",
  "oracle": "0x...",
  "txHash": "0x...",
  "timestamp": "2024-01-01T00:00:00Z",
  "blockNumber": 123456
}
```

### 4. Security Measures

#### After Mainnet Deployment:

1. **Transfer Admin to Multi-Sig**: Consider using Gnosis Safe or similar
   ```javascript
   await contract.updateAdmin(multiSigAddress);
   ```

2. **Test Emergency Functions**: Ensure pause/unpause work
   ```javascript
   await contract.pause();
   // Verify transfers fail
   await contract.unpause();
   ```

3. **Monitor Events**: Set up event monitoring for:
   - Minted
   - Burned
   - Blacklisted
   - Paused/Unpaused
   - AdminUpdated

4. **Oracle Health Check**: Regularly verify oracle is updating prices

5. **Backup Plans**: 
   - Have backup oracle addresses ready
   - Document admin key recovery process
   - Prepare emergency response procedures

## Troubleshooting

### Common Issues

#### "Oracle not found" or "Invalid oracle"
- Verify oracle address is correct for the network
- Check oracle is active and returning data
- Test oracle independently before deployment

#### "Insufficient funds for gas"
- Ensure admin wallet has enough native tokens
- Ethereum: Need ETH
- BSC: Need BNB
- Tron: Need TRX and energy
- Solana: Need SOL

#### "Nonce too high" (EVM)
```bash
# Reset account nonce
npx hardhat clean
```

#### Solana Program Deployment Fails
```bash
# Increase compute units
solana program deploy --max-len 200000 program.so

# Or upgrade existing program
solana program upgrade program.so PROGRAM_ID
```

## Network-Specific Notes

### Ethereum
- High gas fees - deploy during low network usage
- Consider Layer 2 alternatives (Arbitrum, Optimism)
- Use gas price optimizer

### BSC
- Lower fees than Ethereum
- Faster block times
- Compatible with Ethereum tooling

### Tron
- Very low fees
- Different account/address format (base58)
- Energy/bandwidth system
- Use TronWeb for interactions

### Solana
- Extremely fast and cheap
- Different programming model (Rust/Anchor)
- Account-based (not EVM)
- Requires program ID in Anchor.toml

## Multi-Chain Management

### Maintaining Consistency

When deploying across multiple chains:

1. **Use Same Admin Address**: Convert between formats as needed
2. **Document Each Deployment**: Keep detailed records
3. **Test Independently**: Each chain is separate
4. **Monitor All Chains**: Set up alerts for all deployments
5. **Coordinate Updates**: Plan admin/oracle updates across chains

### Bridge Considerations

This implementation does NOT include cross-chain bridging. Each deployment is independent. If you need to bridge CNYS between chains, you'll need to:

1. Implement or integrate a bridge solution
2. Add bridge contracts to manage locks/mints
3. Ensure proper security for bridge operations
4. Consider using established bridge protocols

## Maintenance

### Regular Tasks

- Monitor oracle price feeds
- Check contract events
- Verify admin key security
- Update oracle addresses if needed
- Respond to security alerts

### Upgrade Considerations

Current contracts are NOT upgradeable. For upgrades:

1. Deploy new contract version
2. Pause old contract
3. Migrate liquidity and users
4. Sunset old contract

Or implement upgradeable pattern from the start using:
- OpenZeppelin TransparentUpgradeableProxy
- UUPS pattern
- Governance-controlled upgrades

## Support

For deployment issues:
- Check logs carefully
- Verify network connection
- Test on testnet first
- Review Hardhat/Anchor documentation
- Check blockchain explorers for transaction details
