// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {RewardDistributor} from "../src/RewardDistributor.sol";
interface VmDeploy {function envAddress(string calldata) external returns(address);function startBroadcast() external;function stopBroadcast() external;}
contract Deploy {
    VmDeploy constant vm = VmDeploy(address(uint160(uint256(keccak256("hevm cheat code")))));
    function run() external returns(RewardDistributor distributor) {
        require(block.chainid==11155111,"Sepolia only");
        address admin=vm.envAddress("REWARD_ADMIN_ADDRESS");address signer=vm.envAddress("REWARD_SIGNER_ADDRESS");
        vm.startBroadcast();distributor=new RewardDistributor(admin,signer);vm.stopBroadcast();
    }
}
