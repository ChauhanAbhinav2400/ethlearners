// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract LearningRewardToken is ERC20 {
    address public immutable distributor;
    error Unauthorized();
    constructor() ERC20("Ethereum Explorer Learning", "LEARN") { distributor = msg.sender; }
    function mint(address recipient, uint256 amount) external {
        if (msg.sender != distributor) revert Unauthorized();
        _mint(recipient, amount);
    }
}
