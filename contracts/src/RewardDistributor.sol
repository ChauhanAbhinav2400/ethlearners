// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {LearningRewardToken} from "./LearningRewardToken.sol";
contract RewardDistributor is AccessControlDefaultAdminRules, Pausable {
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    uint256 public constant REWARD_AMOUNT = 10 ether;
    LearningRewardToken public immutable token;
    mapping(bytes32 => address) public recipients;
    error DuplicateReward();
    error InvalidReward();
    event RewardDistributed(bytes32 indexed rewardId, address indexed recipient, uint256 amount);
    constructor(address admin, address signer) AccessControlDefaultAdminRules(2 days, admin) {
        if (signer == address(0)) revert InvalidReward();
        token = new LearningRewardToken();
        _grantRole(DISTRIBUTOR_ROLE, signer);
    }
    function distribute(bytes32 rewardId, address recipient, uint256 amount) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        if (rewardId == bytes32(0) || recipient == address(0) || amount != REWARD_AMOUNT) revert InvalidReward();
        if (recipients[rewardId] != address(0)) revert DuplicateReward();
        recipients[rewardId] = recipient;
        token.mint(recipient, amount);
        emit RewardDistributed(rewardId, recipient, amount);
    }
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
