# Getting Started with CNY Stablecoin

This guide will help you get the CNY Stablecoin project up and running.

## Quick Start

### 1. Prerequisites

Make sure you have the following installed:

```bash
# Node.js (v16 or higher)
node --version

# npm or yarn
npm --version

# For Solana development
rustc --version
cargo --version

# Solana CLI (for Solana deployment)
solana --version

# Anchor CLI (for Solana)
anchor --version
```

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/chamod17/stable-coin.git
cd stable-coin

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` file with your settings:

```env
# Required: Your admin private key (keep this secret!)
ADMIN_PRIVATE_KEY=your_private_key_here

# Optional: Specify admin address (will use deployer if not set)
ADMIN_ADDRESS=your_admin_address_here

# RPC endpoints for each network
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
TRON_RPC_URL=https://api.trongrid.io
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Oracle addresses (you need to find these for your network)
CHAINLINK_CNY_USD_ETH=0x... # Chainlink CNY/USD on Ethereum
CHAINLINK_CNY_USD_BSC=0x... # Chainlink CNY/USD on BSC
PYTH_CNY_USD_SOLANA=0x...   # Pyth CNY/USD on Solana
```

### 4. Compile Contracts

```bash
# Compile EVM contracts (Ethereum, BSC, Tron)
npm run compile

# For Solana (if you have Rust/Anchor installed)
npm run build:solana
```

### 5. Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:evm
npm run test:tron
```

### 6. Deploy

Choose your target network:

```bash
# Deploy to Ethereum testnet (Goerli)
npx hardhat run scripts/deploy-erc20.js --network goerli

# Deploy to BSC testnet
npx hardhat run scripts/deploy-bep20.js --network bscTestnet

# Deploy to Tron
node scripts/deploy-trc20.js

# Deploy to Solana devnet
ts-node scripts/deploy-solana.ts
```

## Understanding the Project

### What is CNY Stablecoin?

CNY Stablecoin (CNYS) is a multi-chain stablecoin pegged to the Chinese Yuan (CNY). Key features:

- **1 CNYS = 1 CNY**: Value pegged to Chinese Yuan
- **Multi-Chain**: Works on Ethereum, BSC, Tron, and Solana
- **Admin Controlled**: Single admin can mint/burn tokens
- **Trust-Based**: Not collateralized - admin maintains the peg
- **Compliance Ready**: Blacklist and pause features

### How Does It Work?

1. **Oracle Integration**: Uses Chainlink (EVM) or Pyth (Solana) to track CNY/USD price
2. **Minting**: Admin mints tokens backed by off-chain CNY reserves
3. **Burning**: Admin burns tokens when users redeem CNY
4. **Transfers**: Users can transfer tokens freely (unless paused or blacklisted)

### Trust Model

⚠️ **Important**: This is NOT a decentralized or collateralized stablecoin!

- Admin has full control over minting and burning
- No automatic collateral management
- Users must trust the admin to maintain reserves
- Suitable for centralized use cases (e.g., company-issued tokens)

## Project Structure Explained

```
stable-coin/
├── contracts/              # Smart contracts
│   ├── evm/               # Ethereum/BSC contracts
│   │   ├── CNYStablecoin.sol        # Main ERC20/BEP20 contract
│   │   └── mocks/                    # Test helpers
│   │       └── MockChainlinkOracle.sol
│   ├── tron/              # Tron-specific
│   │   └── CNYStablecoinTRC20.sol
│   └── solana/            # Solana program
│       ├── Anchor.toml
│       └── programs/
│           └── cny-stablecoin/
│               ├── Cargo.toml
│               └── src/
│                   └── lib.rs
├── scripts/               # Deployment scripts
│   ├── deploy-erc20.js   # Deploy to Ethereum
│   ├── deploy-bep20.js   # Deploy to BSC
│   ├── deploy-trc20.js   # Deploy to Tron
│   └── deploy-solana.ts  # Deploy to Solana
├── test/                 # Test suites
│   ├── CNYStablecoin.test.js      # EVM tests
│   └── CNYStablecoinTRC20.test.js # TRC20 tests
├── README.md            # Main documentation
├── DEPLOYMENT.md        # Deployment guide
├── API.md              # Contract API reference
├── ORACLE_INTEGRATION.md # Oracle setup guide
├── .env.example        # Environment template
├── hardhat.config.js   # Hardhat configuration
└── package.json        # Project dependencies
```

## Common Operations

### As Admin

After deployment, you can:

```javascript
// Connect to your deployed contract
const contract = await ethers.getContractAt("CNYStablecoin", contractAddress);

// Mint tokens
await contract.mint(recipientAddress, ethers.utils.parseEther("1000"));

// Burn tokens
await contract.burn(userAddress, ethers.utils.parseEther("500"));

// Pause all transfers (emergency)
await contract.pause();

// Unpause
await contract.unpause();

// Blacklist an address
await contract.blacklist(badActorAddress);

// Unblacklist
await contract.unblacklist(addressToUnblock);

// Transfer admin rights
await contract.updateAdmin(newAdminAddress);

// Update oracle
await contract.updateOracle(newOracleAddress);
```

### As User

Regular users can:

```javascript
// Check balance
const balance = await contract.balanceOf(myAddress);

// Transfer tokens
await contract.transfer(recipientAddress, ethers.utils.parseEther("100"));

// Approve spending
await contract.approve(spenderAddress, ethers.utils.parseEther("100"));

// Transfer on behalf (if approved)
await contract.transferFrom(fromAddress, toAddress, amount);

// Check if address is blacklisted
const isBlacklisted = await contract.blacklisted(addressToCheck);

// Check if contract is paused
const isPaused = await contract.paused();

// Get current CNY price
const [price, timestamp] = await contract.getCNYPrice();
console.log(`CNY/USD: ${price / 1e8} at ${new Date(timestamp * 1000)}`);
```

## Finding Oracle Addresses

### For Ethereum/BSC (Chainlink)

1. Visit [Chainlink Data Feeds](https://docs.chain.link/data-feeds/price-feeds/addresses)
2. Look for CNY/USD feed
3. If not available, consider:
   - Using CNY/ETH and ETH/USD feeds together
   - Deploying a custom oracle
   - Using alternative oracle providers

### For Solana (Pyth Network)

1. Visit [Pyth Price Feeds](https://pyth.network/price-feeds)
2. Search for "CNY/USD"
3. Copy the price account public key
4. Different keys for mainnet vs devnet

### For Tron

Options:
- WINkLink (Tron's oracle): [winklink.org](https://www.winklink.org/)
- Custom oracle deployment
- Off-chain price feed with on-chain verification

## Testing Locally

### Test with Hardhat Network

```bash
# Start local Hardhat node
npx hardhat node

# In another terminal, run tests
npm test

# Or deploy to local network
npx hardhat run scripts/deploy-erc20.js --network localhost
```

### Test with Ganache

```bash
# Install Ganache globally
npm install -g ganache

# Start Ganache
ganache

# Update hardhat.config.js with Ganache URL
# Run tests or deploy
```

## Troubleshooting

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Compilation fails

```bash
# Clear cache and recompile
npx hardhat clean
npx hardhat compile
```

### "Insufficient funds" when deploying

Make sure your admin wallet has:
- **Ethereum**: At least 0.1 ETH for gas
- **BSC**: At least 0.05 BNB for gas
- **Tron**: TRX and energy
- **Solana**: At least 5 SOL for program deployment

### Oracle errors

```
Error: "CNYStablecoin: invalid price data"
```

Solutions:
- Verify oracle address is correct
- Check oracle is live on your network
- Test oracle independently before deploying stablecoin
- Use testnet oracles for testing

### Tests fail with "price data too old"

```bash
# This is a staleness check - increase time or update mock oracle
# In your test:
await mockOracle.setLatestAnswer(newPrice); // This updates timestamp
```

## Security Checklist

Before mainnet deployment:

- [ ] Audit all smart contracts
- [ ] Test on testnet thoroughly
- [ ] Verify oracle addresses are correct
- [ ] Secure admin private keys (hardware wallet recommended)
- [ ] Consider multi-sig for admin (Gnosis Safe)
- [ ] Set up monitoring for events
- [ ] Prepare incident response plan
- [ ] Document operational procedures
- [ ] Train admin on emergency pause procedure
- [ ] Have backup oracle addresses ready

## Operational Best Practices

### For Admins

1. **Key Management**
   - Use hardware wallet for admin key
   - Consider multi-sig (Gnosis Safe)
   - Never share private keys
   - Have secure backup procedures

2. **Minting/Burning**
   - Always verify off-chain reserves before minting
   - Keep detailed records of all mint/burn operations
   - Implement approval workflows
   - Regular audits of reserves vs supply

3. **Monitoring**
   - Set up event monitoring
   - Monitor oracle health
   - Track contract balance
   - Watch for unusual activity

4. **Emergency Procedures**
   - Know how to pause contract
   - Have backup admin access
   - Document emergency contacts
   - Test pause/unpause regularly

## Support & Resources

### Documentation
- [README.md](./README.md) - Overview and setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [API.md](./API.md) - Contract functions
- [ORACLE_INTEGRATION.md](./ORACLE_INTEGRATION.md) - Oracle setup

### External Resources
- [Hardhat Docs](https://hardhat.org/getting-started/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/)
- [Chainlink Docs](https://docs.chain.link/)
- [Pyth Network Docs](https://docs.pyth.network/)
- [Solana Docs](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)

### Community
- GitHub Issues: Report bugs or request features
- Stack Overflow: Tag questions with relevant blockchain tags

## Next Steps

1. **Read Full Documentation**: Go through README.md, DEPLOYMENT.md, and API.md
2. **Test Locally**: Run tests and experiment with local deployment
3. **Deploy to Testnet**: Test on Goerli, BSC Testnet, etc.
4. **Get Audited**: Have contracts audited before mainnet
5. **Deploy to Mainnet**: Follow production deployment checklist
6. **Monitor & Maintain**: Set up monitoring and operational procedures

## License

MIT License - See LICENSE file for details

## Disclaimer

This software is provided "as is" without warranty. Use at your own risk. Always audit contracts before deploying to mainnet. The admin has full control over token supply - ensure proper operational security.

---

**Need Help?** 
- Check documentation files
- Review test files for examples
- Open GitHub issues for bugs
- Consult blockchain-specific documentation for network issues
