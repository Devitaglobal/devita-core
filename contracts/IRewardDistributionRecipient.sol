pragma solidity ^0.5.0;

import "./Ownable.sol";

contract IRewardDistributionRecipient is Ownable {
    address public rewardDistribution;

    function notifyRewardAmount(uint256 reward) internal;

    modifier onlyRewardDistribution() {
        require(
            _msgSender() == rewardDistribution,
            "Caller is not reward distribution"
        );
        _;
    }

    function setRewardDistribution(address _rewardDistribution)
        external
        onlyOwner
    {
        require(_rewardDistribution != address(0), "Cannot be zero address");

        rewardDistribution = _rewardDistribution;
    }
}
