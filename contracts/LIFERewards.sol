pragma solidity ^0.5.0;

import "./LPTokenWrapper.sol";
import "./IRewardDistributionRecipient.sol";
import "./libraries/Math.sol";

contract LIFERewards is LPTokenWrapper, IRewardDistributionRecipient {
    IERC20 public rewardToken;
    address public taxPool;
    uint256 public constant DURATION = 14 days;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(
        address _token,
        address _taxPool,
        address _lp
    ) public LPTokenWrapper(_lp) {
        rewardToken = IERC20(_token);
        taxPool = _taxPool;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply() == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable()
                    .sub(lastUpdateTime)
                    .mul(rewardRate)
                    .mul(1e18)
                    .div(totalSupply())
            );
    }

    function earned(address account) public view returns (uint256) {
        return
            balanceOf(account)
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    // stake visibility is public as overriding LPTokenWrapper's stake() function
    function stake(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        super.stake(amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        super.withdraw(amount);
        emit Withdrawn(msg.sender, amount);
    }

    function exit() external {
        withdraw(balanceOf(msg.sender));
        getReward();
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            release(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function release(address recipient, uint256 amount) internal {
        uint256 reward = amount;
        uint256 endowment = amount.mul(1).div(100);
        reward = reward.sub(endowment.mul(2)); // 1% tax to taxPool, 1% re-injected into pool
        rewardToken.safeTransfer(taxPool, endowment);
        rewardToken.safeTransfer(address(this), endowment);
        notifyRewardAmount(endowment);
        rewardToken.safeTransfer(recipient, reward);
    }

    function initialRewardNotify(uint256 reward)
        external
        onlyRewardDistribution
    {
        rewardToken.safeTransferFrom(msg.sender, address(this), reward);
        notifyRewardAmount(reward);
    }

    function notifyRewardAmount(uint256 reward)
        internal
        updateReward(address(0))
    {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(DURATION);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(DURATION);
        }
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(DURATION);
        emit RewardAdded(reward);
    }
}
