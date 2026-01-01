// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CNYStablecoinTRC20
 * @dev CNY-pegged stablecoin for Tron blockchain (TRC20 standard)
 * Includes admin controls, pause, and blacklist features
 * Note: TRC20 is compatible with ERC20, but deployed on Tron network
 */
contract CNYStablecoinTRC20 is ERC20, Pausable, ReentrancyGuard {
    
    // State variables
    address public admin;
    address public priceOracle;
    mapping(address => bool) public blacklisted;
    
    // Constants
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
        require(msg.sender == admin, "CNYStablecoinTRC20: caller is not admin");
        _;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "CNYStablecoinTRC20: account is blacklisted");
        _;
    }
    
    /**
     * @dev Constructor to initialize the TRC20 stablecoin
     * @param _admin Address of the admin wallet
     * @param _priceOracle Address of the price oracle (can be updated later)
     */
    constructor(
        address _admin,
        address _priceOracle
    ) ERC20("CNY Stablecoin", "CNYS") {
        require(_admin != address(0), "CNYStablecoinTRC20: admin is zero address");
        
        admin = _admin;
        priceOracle = _priceOracle;
    }
    
    /**
     * @dev Returns the number of decimals used for the token
     * @return Number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    /**
     * @dev Get the current price oracle address
     * @return Address of the price oracle
     */
    function getPriceOracle() public view returns (address) {
        return priceOracle;
    }
    
    /**
     * @dev Mint new tokens (admin only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "CNYStablecoinTRC20: mint to zero address");
        require(amount > 0, "CNYStablecoinTRC20: mint amount must be greater than 0");
        require(!blacklisted[to], "CNYStablecoinTRC20: cannot mint to blacklisted address");
        
        _mint(to, amount);
        emit Minted(to, amount, msg.sender);
    }
    
    /**
     * @dev Burn tokens (admin only)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyAdmin nonReentrant {
        require(from != address(0), "CNYStablecoinTRC20: burn from zero address");
        require(amount > 0, "CNYStablecoinTRC20: burn amount must be greater than 0");
        require(balanceOf(from) >= amount, "CNYStablecoinTRC20: insufficient balance to burn");
        
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
        require(account != address(0), "CNYStablecoinTRC20: cannot blacklist zero address");
        require(account != admin, "CNYStablecoinTRC20: cannot blacklist admin");
        require(!blacklisted[account], "CNYStablecoinTRC20: account already blacklisted");
        
        blacklisted[account] = true;
        emit Blacklisted(account, msg.sender);
    }
    
    /**
     * @dev Remove address from blacklist (admin only)
     * @param account Address to unblacklist
     */
    function unblacklist(address account) external onlyAdmin {
        require(blacklisted[account], "CNYStablecoinTRC20: account not blacklisted");
        
        blacklisted[account] = false;
        emit Unblacklisted(account, msg.sender);
    }
    
    /**
     * @dev Update admin address (admin only)
     * @param newAdmin Address of the new admin
     */
    function updateAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "CNYStablecoinTRC20: new admin is zero address");
        require(newAdmin != admin, "CNYStablecoinTRC20: new admin is same as current admin");
        
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminUpdated(oldAdmin, newAdmin);
    }
    
    /**
     * @dev Update oracle address (admin only)
     * @param newOracle Address of the new price oracle
     */
    function updateOracle(address newOracle) external onlyAdmin {
        require(newOracle != address(0), "CNYStablecoinTRC20: new oracle is zero address");
        require(newOracle != priceOracle, "CNYStablecoinTRC20: new oracle is same as current oracle");
        
        address oldOracle = priceOracle;
        priceOracle = newOracle;
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
