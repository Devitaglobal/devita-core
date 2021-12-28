// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./openzeppelin/SafeMath.sol";
import "./openzeppelin/IERC20.sol";

contract Vesting {
  using SafeMath for uint256;
  address public benefactor;
  address public deployer;
  uint256 public lastUnlock;
  uint256 public nextUnlock;
  uint256 public constant interval = 30 days; // 30 days between each unlock
  uint256 public constant totalCycles = 24; // The vesting is divided into 24 months
  uint256 public currentCycle = 0;
  uint256 public distributionAmount; // Amount to be distributed each cycle
  bool public initialized = false;
  IERC20 token;

  constructor(address _token, address _benefactor) {
    token = IERC20(_token);
    deployer = msg.sender;
    benefactor = _benefactor;
  }

  function initialize() public {
    // Initialize is separate from constructor to allow timer to be started at a later date (after tokens are loaded)
    require(msg.sender == deployer, "Can only be initialized by deployer");
    require(initialized == false, "Already initialized");
    initialized = true;
    lastUnlock = block.timestamp;
    nextUnlock = lastUnlock.add(interval);
    uint256 balance = token.balanceOf(address(this));
    require(balance > 0, "Tokens are not loaded yet"); // Check to ensure tokens are loaded into contract
    distributionAmount = balance.div(totalCycles);
  }

  function distribute()
    public
  // This can be called by anyone and will distribute the tokens to benefactor, as long as Distribution is possible
  {
    require(initialized == true, "Vesting not initialized yet");
    require(block.timestamp >= nextUnlock, "No tokens to distribute yet");
    require(currentCycle < totalCycles, "Distribution Completed");
    lastUnlock = nextUnlock;
    nextUnlock = nextUnlock.add(interval); // Allows backlogs of unlocked tokens to be distributed later for example, could distribute twice if waited for 2 months (given interval is 1 month)
    currentCycle = currentCycle.add(1);
    token.transfer(benefactor, distributionAmount);
  }

  function recoverLeftover()
    public
  // Only callable once distribute has been called X amount of times (sucessfully), where X is the number of cycles above, if case of roundup leftovers
  {
    require(currentCycle == totalCycles, "Distribution not completed");
    uint256 leftOverBalance = token.balanceOf(address(this));
    token.transfer(benefactor, leftOverBalance);
  }
}
