# CNY Stablecoin API Documentation

Complete reference for all contract functions across EVM (Ethereum/BSC/Tron) and Solana implementations.

## EVM Contracts (ERC20/BEP20/TRC20)

Contract: `CNYStablecoin.sol` and `CNYStablecoinTRC20.sol`

### Public View Functions

#### `name() → string`
Returns the token name.
```solidity
function name() public view returns (string memory)
```
**Returns:** "CNY Stablecoin"

#### `symbol() → string`
Returns the token symbol.
```solidity
function symbol() public view returns (string memory)
```
**Returns:** "CNYS"

#### `decimals() → uint8`
Returns the number of decimals.
```solidity
function decimals() public pure returns (uint8)
```
**Returns:** 18

#### `totalSupply() → uint256`
Returns the total supply of tokens.
```solidity
function totalSupply() public view returns (uint256)
```

#### `balanceOf(address account) → uint256`
Returns the token balance of an address.
```solidity
function balanceOf(address account) public view returns (uint256)
```

#### `allowance(address owner, address spender) → uint256`
Returns the remaining allowance.
```solidity
function allowance(address owner, address spender) public view returns (uint256)
```

#### `admin() → address`
Returns the current admin address.
```solidity
function admin() public view returns (address)
```

#### `priceOracle() → address`
Returns the current oracle address.
```solidity
function priceOracle() public view returns (address)
```

#### `blacklisted(address account) → bool`
Checks if an address is blacklisted.
```solidity
function blacklisted(address account) public view returns (bool)
```

#### `paused() → bool`
Checks if the contract is paused.
```solidity
function paused() public view returns (bool)
```

#### `getCNYPrice() → (int256 price, uint256 timestamp)`
Gets the current CNY/USD price from the oracle.
```solidity
function getCNYPrice() public view returns (int256 price, uint256 timestamp)
```
**Returns:**
- `price`: CNY/USD price with 8 decimals (e.g., 14000000 = 0.14 USD)
- `timestamp`: When the price was last updated

**Reverts:**
- "CNYStablecoin: stale price data" - Price data too old (>1 hour)
- "CNYStablecoin: invalid price data" - Price ≤ 0 or invalid

### Public State-Changing Functions

#### `transfer(address to, uint256 amount) → bool`
Transfers tokens to another address.
```solidity
function transfer(address to, uint256 amount) public returns (bool)
```
**Requirements:**
- Contract not paused
- Sender not blacklisted
- Recipient not blacklisted
- Sufficient balance

**Emits:** `Transfer(address indexed from, address indexed to, uint256 value)`

#### `approve(address spender, uint256 amount) → bool`
Approves spender to spend tokens.
```solidity
function approve(address spender, uint256 amount) public returns (bool)
```
**Requirements:**
- Contract not paused
- Sender not blacklisted
- Spender not blacklisted

**Emits:** `Approval(address indexed owner, address indexed spender, uint256 value)`

#### `transferFrom(address from, address to, uint256 amount) → bool`
Transfers tokens on behalf of another address.
```solidity
function transferFrom(address from, address to, uint256 amount) public returns (bool)
```
**Requirements:**
- Contract not paused
- From address not blacklisted
- To address not blacklisted
- Caller not blacklisted
- Sufficient allowance

**Emits:** `Transfer(address indexed from, address indexed to, uint256 value)`

### Admin-Only Functions

#### `mint(address to, uint256 amount)`
Mints new tokens to an address.
```solidity
function mint(address to, uint256 amount) external onlyAdmin nonReentrant
```
**Parameters:**
- `to`: Recipient address (cannot be zero address or blacklisted)
- `amount`: Amount to mint (must be > 0)

**Requirements:**
- Caller must be admin
- Recipient not blacklisted

**Emits:** `Minted(address indexed to, uint256 amount, address indexed admin)`

#### `burn(address from, uint256 amount)`
Burns tokens from an address.
```solidity
function burn(address from, uint256 amount) external onlyAdmin nonReentrant
```
**Parameters:**
- `from`: Address to burn from (cannot be zero address)
- `amount`: Amount to burn (must be > 0 and ≤ balance)

**Requirements:**
- Caller must be admin
- Sufficient balance

**Emits:** `Burned(address indexed from, uint256 amount, address indexed admin)`

#### `pause()`
Pauses all token transfers.
```solidity
function pause() external onlyAdmin
```
**Requirements:**
- Caller must be admin

**Emits:** `Paused(address account)`

#### `unpause()`
Unpauses token transfers.
```solidity
function unpause() external onlyAdmin
```
**Requirements:**
- Caller must be admin

**Emits:** `Unpaused(address account)`

#### `blacklist(address account)`
Adds an address to the blacklist.
```solidity
function blacklist(address account) external onlyAdmin
```
**Parameters:**
- `account`: Address to blacklist (cannot be zero address or admin)

**Requirements:**
- Caller must be admin
- Account not already blacklisted
- Account is not admin

**Emits:** `Blacklisted(address indexed account, address indexed admin)`

#### `unblacklist(address account)`
Removes an address from the blacklist.
```solidity
function unblacklist(address account) external onlyAdmin
```
**Parameters:**
- `account`: Address to unblacklist

**Requirements:**
- Caller must be admin
- Account currently blacklisted

**Emits:** `Unblacklisted(address indexed account, address indexed admin)`

#### `updateAdmin(address newAdmin)`
Updates the admin address.
```solidity
function updateAdmin(address newAdmin) external onlyAdmin
```
**Parameters:**
- `newAdmin`: New admin address (cannot be zero address or current admin)

**Requirements:**
- Caller must be admin

**Emits:** `AdminUpdated(address indexed oldAdmin, address indexed newAdmin)`

**Warning:** Be careful with this function. Losing admin access is irreversible.

#### `updateOracle(address newOracle)`
Updates the price oracle address.
```solidity
function updateOracle(address newOracle) external onlyAdmin
```
**Parameters:**
- `newOracle`: New oracle address (cannot be zero address or current oracle)

**Requirements:**
- Caller must be admin

**Emits:** `OracleUpdated(address indexed oldOracle, address indexed newOracle)`

## Solana Program

Program: `cny_stablecoin`

### Instructions

#### `initialize`
Initializes the program state and mint.
```rust
pub fn initialize(ctx: Context<Initialize>, decimals: u8) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA (to be created)
- `mint`: SPL Token mint
- `admin`: Admin signer
- `price_oracle`: Pyth oracle account
- `system_program`, `token_program`, `rent`: System accounts

**Parameters:**
- `decimals`: Token decimals (typically 18)

#### `mint_tokens`
Mints tokens to a recipient.
```rust
pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA
- `mint`: SPL Token mint
- `recipient_token_account`: Recipient's token account
- `recipient`: Recipient address
- `recipient_state`: Recipient's blacklist state
- `admin`: Admin signer
- `token_program`, `system_program`: System accounts

**Requirements:**
- Contract not paused
- Caller is admin
- Recipient not blacklisted

**Emits:** `MintEvent`

#### `burn_tokens`
Burns tokens from an address.
```rust
pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA
- `mint`: SPL Token mint
- `from_token_account`: Token account to burn from
- `from`: Owner/signer
- `admin`: Admin signer
- `token_program`: Token program

**Requirements:**
- Contract not paused
- Caller is admin

**Emits:** `BurnEvent`

#### `pause`
Pauses the contract.
```rust
pub fn pause(ctx: Context<PauseUnpause>) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA (mutable)
- `admin`: Admin signer

**Requirements:**
- Caller is admin
- Contract not already paused

**Emits:** `PausedEvent`

#### `unpause`
Unpauses the contract.
```rust
pub fn unpause(ctx: Context<PauseUnpause>) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA (mutable)
- `admin`: Admin signer

**Requirements:**
- Caller is admin
- Contract is paused

**Emits:** `UnpausedEvent`

#### `blacklist_address`
Adds an address to the blacklist.
```rust
pub fn blacklist_address(ctx: Context<BlacklistAddress>) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA
- `user_state`: User's blacklist state (to be created)
- `user`: User address
- `admin`: Admin signer
- `system_program`: System program

**Requirements:**
- Caller is admin
- User not already blacklisted

**Emits:** `BlacklistedEvent`

#### `unblacklist_address`
Removes an address from the blacklist.
```rust
pub fn unblacklist_address(ctx: Context<UnblacklistAddress>) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA
- `user_state`: User's blacklist state (mutable)
- `user`: User address
- `admin`: Admin signer

**Requirements:**
- Caller is admin
- User currently blacklisted

**Emits:** `UnblacklistedEvent`

#### `update_admin`
Updates the admin address.
```rust
pub fn update_admin(ctx: Context<UpdateAdmin>) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA (mutable)
- `admin`: Current admin signer
- `new_admin`: New admin address

**Requirements:**
- Caller is admin

**Emits:** `AdminUpdatedEvent`

#### `update_oracle`
Updates the oracle address.
```rust
pub fn update_oracle(ctx: Context<UpdateOracle>) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA (mutable)
- `admin`: Admin signer
- `new_oracle`: New oracle address

**Requirements:**
- Caller is admin

**Emits:** `OracleUpdatedEvent`

#### `get_cny_price`
Gets the CNY/USD price from Pyth oracle.
```rust
pub fn get_cny_price(ctx: Context<GetPrice>) -> Result<()>
```
**Accounts:**
- `state`: Program state PDA
- `price_oracle`: Pyth price account

**Requirements:**
- Price data not stale (<1 hour)

**Emits:** `PriceUpdatedEvent`

## Events

### EVM Events

```solidity
event Minted(address indexed to, uint256 amount, address indexed admin);
event Burned(address indexed from, uint256 amount, address indexed admin);
event Blacklisted(address indexed account, address indexed admin);
event Unblacklisted(address indexed account, address indexed admin);
event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
event OracleUpdated(address indexed oldOracle, address indexed newOracle);
event PriceUpdated(int256 price, uint256 timestamp);
event Paused(address account);
event Unpaused(address account);
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
```

### Solana Events

```rust
MintEvent { recipient, amount, admin }
BurnEvent { from, amount, admin }
BlacklistedEvent { user, admin }
UnblacklistedEvent { user, admin }
PausedEvent { admin }
UnpausedEvent { admin }
AdminUpdatedEvent { old_admin, new_admin }
OracleUpdatedEvent { old_oracle, new_oracle }
PriceUpdatedEvent { price, confidence, timestamp }
```

## Error Codes

### EVM Errors

- "CNYStablecoin: caller is not admin"
- "CNYStablecoin: account is blacklisted"
- "CNYStablecoin: mint to zero address"
- "CNYStablecoin: mint amount must be greater than 0"
- "CNYStablecoin: cannot mint to blacklisted address"
- "CNYStablecoin: burn from zero address"
- "CNYStablecoin: insufficient balance to burn"
- "CNYStablecoin: cannot blacklist zero address"
- "CNYStablecoin: cannot blacklist admin"
- "CNYStablecoin: account already blacklisted"
- "CNYStablecoin: account not blacklisted"
- "CNYStablecoin: new admin is zero address"
- "CNYStablecoin: new oracle is zero address"
- "CNYStablecoin: stale price data"
- "CNYStablecoin: invalid price data"
- "CNYStablecoin: price data too old"
- "Pausable: paused"

### Solana Errors

- `Unauthorized`: Caller is not admin
- `ContractPaused`: Contract is paused
- `AlreadyPaused`: Contract already paused
- `NotPaused`: Contract not paused
- `Blacklisted`: Address is blacklisted
- `AlreadyBlacklisted`: Address already blacklisted
- `NotBlacklisted`: Address not blacklisted
- `InvalidPriceData`: Invalid oracle price
- `StalePriceData`: Price data too old

## Usage Examples

### JavaScript (EVM)

```javascript
const { ethers } = require("ethers");

// Connect to contract
const contract = new ethers.Contract(address, abi, signer);

// Mint tokens
await contract.mint(recipientAddress, ethers.utils.parseEther("1000"));

// Check balance
const balance = await contract.balanceOf(address);

// Get price
const [price, timestamp] = await contract.getCNYPrice();

// Pause contract
await contract.pause();
```

### TypeScript (Solana)

```typescript
import * as anchor from "@coral-xyz/anchor";

// Initialize program
const program = anchor.workspace.CnyStablecoin;

// Mint tokens
await program.methods
  .mintTokens(new anchor.BN(1000000000))
  .accounts({
    state: statePDA,
    mint: mintPubkey,
    // ... other accounts
  })
  .rpc();

// Get price
await program.methods
  .getCnyPrice()
  .accounts({
    state: statePDA,
    priceOracle: oraclePubkey,
  })
  .rpc();
```

## Gas/Fee Estimates

### EVM Chains

- `mint`: ~80,000 gas
- `burn`: ~70,000 gas
- `transfer`: ~65,000 gas
- `pause`/`unpause`: ~30,000 gas
- `blacklist`/`unblacklist`: ~50,000 gas
- `updateAdmin`: ~30,000 gas

### Solana

- `mint_tokens`: ~0.000005 SOL
- `burn_tokens`: ~0.000005 SOL
- `pause`/`unpause`: ~0.000005 SOL
- `blacklist_address`: ~0.000005 SOL + account rent

## Security Considerations

1. **Admin Key Security**: Admin has full control - use hardware wallet or multi-sig
2. **Oracle Dependency**: Contract relies on oracle - ensure oracle is secure
3. **Blacklist Impact**: Blacklisted addresses lose all access
4. **Pause Impact**: Pausing stops all transfers
5. **No Upgrades**: Contracts not upgradeable - deploy carefully
6. **Reentrancy Protection**: All state-changing functions protected
7. **Price Staleness**: Prices older than 1 hour rejected

## Rate Limits & Considerations

- No built-in rate limits on minting/burning
- Admin should implement operational procedures
- Consider implementing daily mint/burn caps for production
- Monitor for unusual activity

## Testing

See test files for comprehensive examples:
- `test/CNYStablecoin.test.js`
- `test/CNYStablecoinTRC20.test.js`
- `tests/cny-stablecoin.ts` (Solana)
