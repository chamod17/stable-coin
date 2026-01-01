# CNY Stablecoin - Multi-Chain Implementation

A CNY-pegged stablecoin with multi-chain support across Ethereum (ERC20), Binance Smart Chain (BEP20), Tron (TRC20), and Solana (SPL Token).

## Overview

This project implements a CNY-pegged stablecoin that maintains its value at 1 CNY through trusted oracle price feeds. It features admin-controlled minting and burning, pause functionality for emergency situations, and blacklist capabilities for compliance.

**Note:** This is a trust-based stablecoin (not collateralized). The admin maintains the peg through external reserves management.

## Features

### Core Functionality
- ✅ **CNY Pegging**: Value tracks 1 CNY using oracle price feeds
- ✅ **Multi-Chain Support**: ERC20, BEP20, TRC20, and Solana SPL Token
- ✅ **Admin Controls**: Mint, burn, pause, and blacklist functions
- ✅ **Oracle Integration**: Chainlink (EVM) and Pyth Network (Solana)
- ✅ **Security Features**: ReentrancyGuard, access control, event emissions

### Supported Chains
1. **Ethereum** (ERC20) - Using Chainlink CNY/USD oracle
2. **Binance Smart Chain** (BEP20) - Using Chainlink CNY/USD oracle
3. **Tron** (TRC20) - Custom oracle integration
4. **Solana** (SPL Token) - Using Pyth Network CNY/USD oracle

## Project Structure

```
├── contracts/
│   ├── evm/
│   │   ├── CNYStablecoin.sol          # ERC20/BEP20 implementation
│   │   └── mocks/
│   │       └── MockChainlinkOracle.sol # Mock oracle for testing
│   ├── tron/
│   │   └── CNYStablecoinTRC20.sol      # TRC20 implementation
│   └── solana/
│       └── programs/
│           └── cny-stablecoin/
│               ├── Cargo.toml
│               └── src/
│                   └── lib.rs           # Solana program
├── scripts/
│   ├── deploy-erc20.js                 # Ethereum deployment
│   ├── deploy-bep20.js                 # BSC deployment
│   ├── deploy-trc20.js                 # Tron deployment
│   └── deploy-solana.ts                # Solana deployment
├── test/
│   ├── CNYStablecoin.test.js          # EVM tests
│   └── CNYStablecoinTRC20.test.js     # TRC20 tests
├── hardhat.config.js                   # Hardhat configuration
├── package.json                        # Dependencies
└── .env.example                        # Environment variables template
```

## Setup

### Prerequisites

- Node.js v16+ and npm/yarn
- Hardhat for EVM contracts
- Rust and Anchor for Solana program
- TronBox for Tron deployment (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/chamod17/stable-coin.git
cd stable-coin

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Admin Wallet
ADMIN_PRIVATE_KEY=your_admin_private_key_here
ADMIN_ADDRESS=your_admin_address_here

# RPC Endpoints
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
TRON_RPC_URL=https://api.trongrid.io
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Oracle Addresses (Mainnet)
CHAINLINK_CNY_USD_ETH=0x... # Chainlink CNY/USD feed on Ethereum
CHAINLINK_CNY_USD_BSC=0x... # Chainlink CNY/USD feed on BSC
PYTH_CNY_USD_SOLANA=0x...   # Pyth CNY/USD account on Solana

# API Keys (Optional, for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key
```

## Compilation

### EVM Contracts (Ethereum/BSC/Tron)

```bash
# Compile all Solidity contracts
npm run compile
```

### Solana Program

```bash
# Build Solana program
npm run build:solana
```

## Testing

### Run All Tests

```bash
# Run EVM contract tests
npm test

# Run specific test file
npm run test:evm
npm run test:tron
```

### Test Coverage

The test suite covers:
- Token deployment and initialization
- Minting and burning operations
- Pause/unpause functionality
- Blacklist management
- Admin controls
- Oracle integration
- Transfer operations with all restrictions

Expected coverage: >90%

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for each chain.

### Quick Start

```bash
# Deploy to Ethereum
npm run deploy:ethereum

# Deploy to BSC
npm run deploy:bsc

# Deploy to Tron
npm run deploy:tron

# Deploy to Solana
npm run deploy:solana
```

## Contract Functions

See [API.md](./API.md) for complete API documentation.

### Admin Functions

- `mint(address to, uint256 amount)` - Mint new tokens
- `burn(address from, uint256 amount)` - Burn existing tokens
- `pause()` - Pause all transfers
- `unpause()` - Resume transfers
- `blacklist(address account)` - Add address to blacklist
- `unblacklist(address account)` - Remove address from blacklist
- `updateAdmin(address newAdmin)` - Transfer admin rights
- `updateOracle(address newOracle)` - Update price oracle

### Public Functions

- `transfer(address to, uint256 amount)` - Transfer tokens
- `approve(address spender, uint256 amount)` - Approve spending
- `transferFrom(address from, address to, uint256 amount)` - Transfer on behalf
- `getCNYPrice()` - Get current CNY/USD price from oracle

## Oracle Integration

See [ORACLE_INTEGRATION.md](./ORACLE_INTEGRATION.md) for oracle setup guide.

### Price Feeds

- **Ethereum/BSC**: Chainlink CNY/USD price feeds
- **Solana**: Pyth Network CNY/USD price account
- **Staleness Check**: Prices older than 1 hour are rejected

## Security Features

- ✅ **Access Control**: Admin-only functions with modifiers
- ✅ **ReentrancyGuard**: Protection against reentrancy attacks
- ✅ **Pausable**: Emergency stop mechanism
- ✅ **Blacklist**: Compliance and security enforcement
- ✅ **SafeMath**: Solidity 0.8+ overflow protection
- ✅ **Event Emissions**: Complete audit trail
- ✅ **Oracle Validation**: Staleness and sanity checks

## Upgrade Path

The current implementation is **not upgradeable** by design for maximum security and transparency. If upgradability is required:

1. Consider using OpenZeppelin's proxy patterns
2. Implement proper upgrade governance
3. Add time-locks for sensitive operations
4. Document upgrade procedures clearly

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/chamod17/stable-coin/issues
- Documentation: See docs in this repository

## Disclaimer

This is experimental software. Use at your own risk. Always conduct thorough audits before deploying to mainnet. The admin has full control over minting and burning - ensure proper key management and operational security.