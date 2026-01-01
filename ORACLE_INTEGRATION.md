# Oracle Integration Guide

This guide explains how to integrate and use price oracles for the CNY Stablecoin across different blockchains.

## Overview

The CNY Stablecoin uses oracle price feeds to track the CNY/USD exchange rate. Different blockchain networks use different oracle solutions:

- **Ethereum & BSC**: Chainlink Price Feeds
- **Tron**: Custom or WINkLink Oracle
- **Solana**: Pyth Network

## Why Oracles?

Oracles provide off-chain price data to smart contracts. For a CNY-pegged stablecoin:

1. **Price Discovery**: Get real-time CNY/USD exchange rate
2. **Transparency**: On-chain verification of peg
3. **Automation**: Enable price-dependent logic
4. **Trust**: Use decentralized oracle networks

## Chainlink Integration (Ethereum/BSC)

### Overview

Chainlink is the leading decentralized oracle network for EVM chains.

### Finding CNY/USD Price Feeds

1. Visit [Chainlink Data Feeds](https://docs.chain.link/data-feeds/price-feeds/addresses)
2. Search for "CNY/USD" or "CNY/ETH"
3. Note the contract address for your network

### Common Feed Addresses

**Note:** As of 2024, direct CNY/USD feeds may be limited. Alternatives:

#### Option 1: Direct CNY/USD Feed
```
Ethereum Mainnet: Check Chainlink docs
BSC Mainnet: Check Chainlink docs
```

#### Option 2: Composite Feeds
If direct CNY/USD not available, use composite calculation:
- Get CNY/ETH and ETH/USD feeds
- Calculate: CNY/USD = (CNY/ETH) * (ETH/USD)

#### Option 3: Deploy Custom Aggregator
Deploy your own price aggregator that:
1. Fetches from multiple sources
2. Calculates median/average
3. Publishes on-chain

### Integration Code

#### Reading Price Data

```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

AggregatorV3Interface public priceOracle;

function getCNYPrice() public view returns (int256 price, uint256 timestamp) {
    (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) = priceOracle.latestRoundData();
    
    // Validation
    require(answeredInRound >= roundId, "Stale price data");
    require(answer > 0, "Invalid price");
    require(block.timestamp - updatedAt <= 3600, "Price too old");
    
    return (answer, updatedAt);
}
```

#### Price Format

Chainlink prices typically have 8 decimals:
```
Price: 14000000 = 0.14 USD per CNY
```

### Testing with Mock Oracle

For development/testing:

```solidity
// Deploy mock oracle
const MockOracle = await ethers.getContractFactory("MockChainlinkOracle");
const oracle = await MockOracle.deploy();

// Set price (0.14 USD per CNY)
await oracle.setLatestAnswer(14000000);

// Deploy stablecoin with mock
const stablecoin = await CNYStablecoin.deploy(admin, oracle.address);
```

### Monitoring Chainlink Feeds

Set up monitoring for:
- Price updates
- Heartbeat (update frequency)
- Deviation threshold
- Node performance

Tools:
- [Chainlink Market](https://market.link/)
- Custom event listeners
- The Graph indexing

## Pyth Network Integration (Solana)

### Overview

Pyth Network provides high-frequency price feeds for Solana and other chains.

### Finding CNY/USD Price Account

1. Visit [Pyth Price Feeds](https://pyth.network/price-feeds)
2. Search for "CNY/USD"
3. Copy the account public key

Example format:
```
Mainnet: 0x... (32-byte public key)
Devnet: 0x... (different key for testing)
```

### Integration Code

```rust
use pyth_sdk_solana::{load_price_feed_from_account_info, Price};

pub fn get_cny_price(ctx: Context<GetPrice>) -> Result<()> {
    let price_account_info = &ctx.accounts.price_oracle;
    let price_feed = load_price_feed_from_account_info(price_account_info)?;
    
    let current_price = price_feed
        .get_current_price()
        .ok_or(ErrorCode::InvalidPriceData)?;
    
    // Staleness check
    let current_timestamp = Clock::get()?.unix_timestamp;
    let price_age = current_timestamp - current_price.publish_time;
    require!(price_age < 3600, ErrorCode::StalePriceData);
    
    // Use price
    msg!("CNY/USD: {}", current_price.price);
    msg!("Confidence: {}", current_price.conf);
    
    Ok(())
}
```

### Price Format

Pyth prices include:
```rust
pub struct Price {
    pub price: i64,           // Price * 10^expo
    pub conf: u64,            // Confidence interval
    pub expo: i32,            // Exponent (e.g., -8 for 8 decimals)
    pub publish_time: i64,    // Unix timestamp
}
```

Example:
```
price: 14000000
expo: -8
Actual price: 14000000 * 10^(-8) = 0.14 USD per CNY
```

### Testing with Mock Pyth

For testing, you can:

1. Use Pyth devnet feeds
2. Create mock price accounts
3. Use Pyth's testing utilities

## WINkLink Integration (Tron)

### Overview

WINkLink is Tron's oracle solution, compatible with Chainlink's interface.

### Integration

1. Find WINkLink price feeds at [WINkLink Market](https://www.winklink.org/)
2. Use similar interface as Chainlink:

```solidity
// Same interface as Chainlink
IAggregatorV3Interface public priceOracle;

function getCNYPrice() public view returns (int256) {
    (, int256 answer,,,) = priceOracle.latestRoundData();
    return answer;
}
```

### Considerations

- Fewer feeds available than Chainlink
- May need custom oracle solution
- Consider using off-chain price feeds with verification

## Custom Oracle Solutions

### When to Build Custom Oracle

- Target price feed not available
- Need specific update frequency
- Require custom data sources
- Want full control over updates

### Architecture

```
Off-Chain                    On-Chain
---------                    --------
[Data Sources] → [Aggregator] → [Oracle Contract] → [Stablecoin]
  - Exchange APIs
  - Market data
  - Multiple sources
```

### Implementation Example

```solidity
contract CustomCNYOracle {
    address public owner;
    int256 public currentPrice;
    uint256 public lastUpdate;
    
    mapping(address => bool) public updaters;
    
    modifier onlyUpdater() {
        require(updaters[msg.sender], "Not authorized");
        _;
    }
    
    function updatePrice(int256 newPrice) external onlyUpdater {
        require(newPrice > 0, "Invalid price");
        currentPrice = newPrice;
        lastUpdate = block.timestamp;
        emit PriceUpdated(newPrice, block.timestamp);
    }
    
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (1, currentPrice, lastUpdate, lastUpdate, 1);
    }
}
```

### Off-Chain Updater

```javascript
// Node.js script to update prices
async function updateOracle() {
    // Fetch from multiple sources
    const prices = await Promise.all([
        fetchFromExchange1(),
        fetchFromExchange2(),
        fetchFromExchange3(),
    ]);
    
    // Calculate median
    const medianPrice = calculateMedian(prices);
    
    // Update on-chain
    await oracleContract.updatePrice(medianPrice);
}

// Run every 5 minutes
setInterval(updateOracle, 5 * 60 * 1000);
```

## Oracle Security Best Practices

### 1. Multiple Data Sources

Never rely on a single source:
```javascript
const sources = [
    'https://api.exchange1.com/price/CNY-USD',
    'https://api.exchange2.com/price/CNY-USD',
    'https://api.exchange3.com/price/CNY-USD',
];
```

### 2. Deviation Checks

```solidity
function validatePrice(int256 newPrice, int256 oldPrice) internal pure {
    int256 deviation = abs(newPrice - oldPrice) * 100 / oldPrice;
    require(deviation < 10, "Price deviation too high"); // Max 10%
}
```

### 3. Staleness Checks

```solidity
uint256 constant STALENESS_THRESHOLD = 3600; // 1 hour

require(
    block.timestamp - updatedAt <= STALENESS_THRESHOLD,
    "Price data too old"
);
```

### 4. Circuit Breakers

```solidity
bool public oraclePaused;

function pauseOracle() external onlyAdmin {
    oraclePaused = true;
}

modifier whenOracleActive() {
    require(!oraclePaused, "Oracle paused");
    _;
}
```

### 5. Fallback Oracles

```solidity
address public primaryOracle;
address public fallbackOracle;

function getPrice() public view returns (int256) {
    try primaryOracle.latestRoundData() returns (...) {
        return answer;
    } catch {
        return fallbackOracle.latestRoundData();
    }
}
```

## Price Feed Data Sources

### Recommended Sources

1. **Cryptocurrency Exchanges**
   - Binance: USDCNY pair
   - Huobi: CNY pairs
   - OKX: CNY markets

2. **Forex Data Providers**
   - OANDA
   - XE Currency
   - Forex.com

3. **Financial APIs**
   - Alpha Vantage
   - Exchange Rate API
   - Fixer.io

4. **Decentralized Oracles**
   - Chainlink
   - Pyth Network
   - Band Protocol
   - API3

## Testing Oracles

### Unit Tests

```javascript
describe("Oracle Integration", function() {
    it("Should get valid price", async function() {
        const [price, timestamp] = await contract.getCNYPrice();
        expect(price).to.be.gt(0);
        expect(timestamp).to.be.gt(0);
    });
    
    it("Should reject stale prices", async function() {
        await oracle.setUpdatedAt(Date.now() - 7200);
        await expect(contract.getCNYPrice())
            .to.be.revertedWith("Price data too old");
    });
});
```

### Integration Tests

```javascript
// Test with real oracle on testnet
const chainlinkOracle = "0x..."; // Testnet address
const contract = await deploy(admin, chainlinkOracle);

const price = await contract.getCNYPrice();
console.log("Current CNY/USD:", price.toString());
```

## Monitoring & Alerts

### Set Up Monitoring

1. **Price Updates**
   ```javascript
   contract.on("PriceUpdated", (price, timestamp) => {
       console.log(`New price: ${price} at ${timestamp}`);
       
       // Check for anomalies
       if (isAnomalous(price)) {
           alertAdmin(price);
       }
   });
   ```

2. **Oracle Health**
   ```javascript
   setInterval(async () => {
       const lastUpdate = await oracle.lastUpdate();
       const now = Date.now() / 1000;
       
       if (now - lastUpdate > 3600) {
           alert("Oracle not updating!");
       }
   }, 60000);
   ```

3. **Price Deviation**
   ```javascript
   const threshold = 0.05; // 5%
   if (Math.abs(newPrice - oldPrice) / oldPrice > threshold) {
       alert("Large price movement!");
   }
   ```

## Emergency Procedures

### Oracle Failure

If oracle fails:

1. **Pause Contract**
   ```solidity
   await contract.pause();
   ```

2. **Switch to Backup Oracle**
   ```solidity
   await contract.updateOracle(backupOracleAddress);
   ```

3. **Manual Price Updates** (if necessary)
   - Deploy emergency oracle
   - Admin manually updates prices
   - Resume operations

### Price Manipulation

If price manipulation detected:

1. Pause immediately
2. Investigate data sources
3. Add more diverse sources
4. Increase deviation thresholds temporarily
5. Consider multi-sig for price updates

## Cost Analysis

### Chainlink
- No direct cost to read prices
- Oracle network costs covered by sponsors
- May need LINK tokens for custom requests

### Pyth Network
- Reading prices: ~0.000005 SOL per call
- Account rent for price accounts
- Very low cost overall

### Custom Oracle
- Gas for each price update
- Infrastructure costs (servers, APIs)
- Maintenance overhead

Recommendation: Use established oracles (Chainlink/Pyth) unless specific needs require custom solution.

## Resources

### Documentation
- [Chainlink Docs](https://docs.chain.link/)
- [Pyth Network Docs](https://docs.pyth.network/)
- [WINkLink Docs](https://doc.winklink.org/)

### Tools
- [Chainlink Market](https://market.link/)
- [Pyth Price Feed List](https://pyth.network/price-feeds)
- [Remix IDE](https://remix.ethereum.org/) for testing

### Community
- Chainlink Discord
- Pyth Discord
- Oracle development forums

## Conclusion

Oracle integration is critical for the CNY Stablecoin's price peg. Always:
- Use reputable oracle providers
- Implement staleness checks
- Have backup options
- Monitor continuously
- Test thoroughly

Choose oracle solution based on:
- Chain/network
- Data availability
- Update frequency requirements
- Cost constraints
- Decentralization needs
