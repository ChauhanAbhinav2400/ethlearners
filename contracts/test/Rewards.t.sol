// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {RewardDistributor} from "../src/RewardDistributor.sol";
import {LearningRewardToken} from "../src/LearningRewardToken.sol";
interface Vm {function prank(address) external; function expectRevert() external; function expectEmit(bool,bool,bool,bool) external;}
contract RewardsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    RewardDistributor distributor;
    LearningRewardToken token;
    address learner = address(0x123);
    event RewardDistributed(bytes32 indexed rewardId,address indexed recipient,uint256 amount);
    function setUp() public { distributor=new RewardDistributor(address(this),address(this)); token=distributor.token(); }
    function testAuthorizedRewardAndEvent() public {vm.expectEmit(true,true,false,true);emit RewardDistributed(bytes32(uint256(1)),learner,10 ether);distributor.distribute(bytes32(uint256(1)),learner,10 ether);require(token.balanceOf(learner)==10 ether);require(token.totalSupply()==10 ether);}
    function testUnauthorizedDistribution() public {vm.prank(learner);vm.expectRevert();distributor.distribute(bytes32(uint256(1)),learner,10 ether);}
    function testOnlyDistributorMints() public {vm.expectRevert();token.mint(learner,10 ether);}
    function testDuplicateReward() public {distributor.distribute(bytes32(uint256(1)),learner,10 ether);vm.expectRevert();distributor.distribute(bytes32(uint256(1)),address(0x456),10 ether);}
    function testWrongAmount() public {vm.expectRevert();distributor.distribute(bytes32(uint256(1)),learner,11 ether);}
    function testZeroDestination() public {vm.expectRevert();distributor.distribute(bytes32(uint256(1)),address(0),10 ether);}
    function testPauseAndAccessControl() public {vm.prank(learner);vm.expectRevert();distributor.pause();distributor.pause();vm.expectRevert();distributor.distribute(bytes32(uint256(1)),learner,10 ether);}
    function testTransferAndAllowance() public {distributor.distribute(bytes32(uint256(1)),learner,10 ether);vm.prank(learner);token.approve(address(this),3 ether);token.transferFrom(learner,address(0x456),3 ether);require(token.balanceOf(learner)==7 ether);require(token.allowance(learner,address(this))==0);}
}
