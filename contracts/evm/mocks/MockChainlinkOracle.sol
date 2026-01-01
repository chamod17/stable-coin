// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockChainlinkOracle
 * @dev Mock Chainlink oracle for testing purposes
 */
contract MockChainlinkOracle {
    int256 private _answer;
    uint256 private _updatedAt;
    uint80 private _roundId;

    constructor() {
        _answer = 14000000; // Default: 0.14 USD per CNY
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }

    function setLatestAnswer(int256 answer) external {
        _answer = answer;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    function setUpdatedAt(uint256 timestamp) external {
        _updatedAt = timestamp;
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }
}
