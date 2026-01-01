// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title CNYStablecoin
 * @dev CNY-pegged stablecoin with admin controls, pause, and blacklist features
 * Supports ERC20 standard for Ethereum and EVM-compatible chains
 * Uses Chainlink oracle for CNY/USD price feed
 */
contract CNYStablecoin is ERC20, Pausable, ReentrancyGuard {
    
    // State variables
    address public admin;
    AggregatorV3Interface public priceOracle;
    mapping(address => bool) public blacklisted;
    
    // Constants
    uint256 private constant PRICE_DECIMALS = 8;
    uint256 private constant STALENESS_THRESHOLD = 3600; // 1 hour
    
    // Events
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event Minted(address indexed to, uint256 amount, address indexed admin);
    event Burned(address indexed from, uint256 amount, address indexed admin);
    event Blacklisted(address indexed account, address indexed admin);
    event Unblacklisted(address indexed account, address indexed admin);
    event PriceUpdated(int256 price, uint256 timestamp);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "CNYStablecoin: caller is not admin");
        _;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "CNYStablecoin: account is blacklisted");
        _;
    }
    
    /**
     * @dev Constructor to initialize the stablecoin
     * @param _admin Address of the admin wallet
     * @param _priceOracle Address of the Chainlink CNY/USD price oracle
     */
    constructor(
        address _admin,
        address _priceOracle
    ) ERC20("CNY Stablecoin", "CNYS") {
        require(_admin != address(0), "CNYStablecoin: admin is zero address");
        require(_priceOracle != address(0), "CNYStablecoin: oracle is zero address");
        
        admin = _admin;
        priceOracle = AggregatorV3Interface(_priceOracle);
    }
    
    /**
     * @dev Returns the number of decimals used for the token
     * @return Number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    /**
     * @dev Get the current CNY/USD price from the oracle
     * @return price The current CNY/USD price
     * @return timestamp The timestamp of the price
     */
    function getCNYPrice() public view returns (int256 price, uint256 timestamp) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceOracle.latestRoundData();
        
        require(answeredInRound >= roundId, "CNYStablecoin: stale price data");
        require(answer > 0, "CNYStablecoin: invalid price data");
        require(updatedAt > 0, "CNYStablecoin: invalid timestamp");
        require(block.timestamp - updatedAt <= STALENESS_THRESHOLD, "CNYStablecoin: price data too old");
        
        return (answer, updatedAt);
    }
    
    /**
     * @dev Mint new tokens (admin only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "CNYStablecoin: mint to zero address");
        require(amount > 0, "CNYStablecoin: mint amount must be greater than 0");
        require(!blacklisted[to], "CNYStablecoin: cannot mint to blacklisted address");
        
        _mint(to, amount);
        emit Minted(to, amount, msg.sender);
    }
    
    /**
     * @dev Burn tokens (admin only)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyAdmin nonReentrant {
        require(from != address(0), "CNYStablecoin: burn from zero address");
        require(amount > 0, "CNYStablecoin: burn amount must be greater than 0");
        require(balanceOf(from) >= amount, "CNYStablecoin: insufficient balance to burn");
        
        _burn(from, amount);
        emit Burned(from, amount, msg.sender);
    }
    
    /**
     * @dev Pause all token transfers (admin only)
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers (admin only)
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @dev Add address to blacklist (admin only)
     * @param account Address to blacklist
     */
    function blacklist(address account) external onlyAdmin {
        require(account != address(0), "CNYStablecoin: cannot blacklist zero address");
        require(account != admin, "CNYStablecoin: cannot blacklist admin");
        require(!blacklisted[account], "CNYStablecoin: account already blacklisted");
        
        blacklisted[account] = true;
        emit Blacklisted(account, msg.sender);
    }
    
    /**
     * @dev Remove address from blacklist (admin only)
     * @param account Address to unblacklist
     */
    function unblacklist(address account) external onlyAdmin {
        require(blacklisted[account], "CNYStablecoin: account not blacklisted");
        
        blacklisted[account] = false;
        emit Unblacklisted(account, msg.sender);
    }
    
    /**
     * @dev Update admin address (admin only)
     * @param newAdmin Address of the new admin
     */
    function updateAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "CNYStablecoin: new admin is zero address");
        require(newAdmin != admin, "CNYStablecoin: new admin is same as current admin");
        
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminUpdated(oldAdmin, newAdmin);
    }
    
    /**
     * @dev Update oracle address (admin only)
     * @param newOracle Address of the new price oracle
     */
    function updateOracle(address newOracle) external onlyAdmin {
        require(newOracle != address(0), "CNYStablecoin: new oracle is zero address");
        require(newOracle != address(priceOracle), "CNYStablecoin: new oracle is same as current oracle");
        
        address oldOracle = address(priceOracle);
        priceOracle = AggregatorV3Interface(newOracle);
        emit OracleUpdated(oldOracle, newOracle);
    }
    
    /**
     * @dev Override transfer to add pause and blacklist checks
     */
    function transfer(address to, uint256 amount)
        public
        override
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(to)
        returns (bool)
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to add pause and blacklist checks
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        whenNotPaused
        notBlacklisted(from)
        notBlacklisted(to)
        notBlacklisted(msg.sender)
        returns (bool)
    {
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Override approve to add pause and blacklist checks
     */
    function approve(address spender, uint256 amount)
        public
        override
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(spender)
        returns (bool)
    {
        return super.approve(spender, amount);
    }
}
