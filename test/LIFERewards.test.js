const { expect } = require("chai");
const { ethers, network, waffle } = require("hardhat");

describe("LIFERewards", () => {
  let accounts;
  let ownerAccount;
  let userAccounts;
  let taxAccount;
  let emptyAccount;

  let LIFEToken;
  let lifeToken;

  let LPLIFEToken;
  let lpLifeToken;

  let LIFERewards;
  let lifeRewards;

  const beforeEachSetUp = async () => {
    accounts = await ethers.getSigners();
    ownerAccount = accounts[0];
    taxAccount = accounts[1];
    emptyAccount = accounts[2];

    userAccounts = accounts.slice(3, 9);

    LIFEToken = await ethers.getContractFactory("LIFEToken");
    lifeToken = await LIFEToken.deploy(ethers.utils.parseEther("1000000"));
    await lifeToken.deployed();

    LPLIFEToken = await ethers.getContractFactory("LPLIFEToken");
    lpLifeToken = await LPLIFEToken.deploy(ethers.utils.parseEther("1000000"));
    await lpLifeToken.deployed();

    await lifeToken.transfer(
      ownerAccount.address,
      ethers.utils.parseEther("100000")
    );
    await lpLifeToken.transfer(
      ownerAccount.address,
      ethers.utils.parseEther("100000")
    );

    for (let i = 0; i < 6; i++) {
      await lifeToken.transfer(
        userAccounts[i].address,
        ethers.utils.parseEther("100000")
      );
      await lpLifeToken.transfer(
        userAccounts[i].address,
        ethers.utils.parseEther("100000")
      );
    }

    LIFERewards = await ethers.getContractFactory("LIFERewards");
    lifeRewards = await LIFERewards.deploy(
      lifeToken.address,
      taxAccount.address,
      lpLifeToken.address
    );
    await lifeRewards.deployed();
  };

  describe("Deploy", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("sets constructor variables", async () => {
      expect(await lifeRewards.rewardToken()).to.be.equal(lifeToken.address);
      expect(await lifeRewards.taxPool()).to.be.equal(taxAccount.address);
      expect(await lifeRewards.uni()).to.be.equal(lpLifeToken.address);
    });
  });

  describe("Stake", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Stake 0 LPLIFE", async () => {
      await expect(
        lifeRewards.connect(userAccounts[0]).stake(0)
      ).to.be.revertedWith("Cannot stake 0");
    });

    it("Stake a non-zero amount of LPLIFE", async () => {
      const oldBalance = await lpLifeToken.balanceOf(userAccounts[0].address);

      const approveTx = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const newBalance = await lpLifeToken.balanceOf(userAccounts[0].address);

      expect(oldBalance.sub(newBalance)).to.equal(
        ethers.utils.parseEther("100")
      );
    });

    it("Stake a non-zero amount of LPLIFE using an account with 0 LPLIFE", async () => {
      const approveTx = await lpLifeToken
        .connect(emptyAccount)
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx.wait();

      await expect(
        lifeRewards.connect(emptyAccount).stake(ethers.utils.parseEther("100"))
      ).to.be.revertedWith("SafeERC20: low-level call failed");
    });
  });

  describe("Withdraw", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Withdraw 0 LPLIFE", async () => {
      await expect(
        lifeRewards.connect(userAccounts[0]).withdraw(0)
      ).to.be.revertedWith("Cannot withdraw 0");
    });

    it("Withdraw a non-zero amount of LPLIFE", async () => {
      const oldBalance = await lpLifeToken.balanceOf(userAccounts[0].address);

      const approveTx = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const withdrawTx = await lifeRewards
        .connect(userAccounts[0])
        .withdraw(ethers.utils.parseEther("100"));
      await withdrawTx.wait();

      const newBalance = await lpLifeToken.balanceOf(userAccounts[0].address);

      expect(oldBalance).to.equal(newBalance);
    });

    it("Withdraw a non-zero amount of LPLIFE from a LPRewards contract with 0 LPLIFE", async () => {
      await expect(
        lifeRewards
          .connect(userAccounts[0])
          .withdraw(ethers.utils.parseEther("100"))
      ).to.be.revertedWith("SafeMath: subtraction overflow");
    });
  });

  describe("Setting reward distribution", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Set reward distributor to the LIFERewards contract owner as the LIFERewards contract owner", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const rewardDistributor = await lifeRewards.rewardDistribution();

      expect(rewardDistributor).to.equal(ownerAccount.address);
    });

    it("Set reward distributor to an account that is not the LIFERewards contract owner as the LIFERewards contract owner", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        userAccounts[0].address
      );
      await setRewardDistributionTx.wait();

      const rewardDistributor = await lifeRewards.rewardDistribution();

      expect(rewardDistributor).to.equal(userAccounts[0].address);
    });

    it("Set reward distributor to an account while not being the LIFERewards contract owner", async () => {
      await expect(
        lifeRewards
          .connect(userAccounts[0])
          .setRewardDistribution(ownerAccount.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Set initial reward", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Set initial reward as the reward distributor", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const balance = await lifeToken.balanceOf(lifeRewards.address);

      expect(balance).to.deep.equal(ethers.utils.parseEther("100"));
    });

    it("Set initial reward to 0 as the reward distributor", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.constants.Zero
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.constants.Zero
      );
      await initialRewardTx.wait();

      const balance = await lifeToken.balanceOf(lifeRewards.address);

      expect(balance).to.deep.equal(ethers.constants.Zero);
    });

    it("Set initial reward as an account that is not the reward distributor", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        userAccounts[0].address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      await expect(
        lifeRewards.initialRewardNotify(ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Caller is not reward distribution");
    });

    describe("test notifyRewardAmount", () => {
      let initialRewardTx;

      beforeEach(async () => {
        const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
          ownerAccount.address
        );
        await setRewardDistributionTx.wait();

        const approveTx = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("100")
        );
        await approveTx.wait();

        initialRewardTx = await lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("100")
        );
        await initialRewardTx.wait();
      });

      it("updates reward", async () => {
        expect(await lifeRewards.rewardPerTokenStored()).to.be.equal(0);
        expect(
          await lifeRewards.rewards(ethers.constants.AddressZero)
        ).to.be.equal(0);
        expect(
          await lifeRewards.userRewardPerTokenPaid(ethers.constants.AddressZero)
        ).to.be.equal(0);
      });

      it("notifies reward amount", async () => {
        const reward = ethers.utils.parseEther("100");
        const rewardRate = reward.div(await lifeRewards.DURATION());
        expect(await lifeRewards.rewardRate()).to.be.equal(rewardRate);

        const rewardBlock = await ethers.provider.getBlock(
          initialRewardTx.blockNumber
        );
        expect(await lifeRewards.lastUpdateTime()).to.be.equal(
          rewardBlock.timestamp
        );
        const periodFinish = ethers.BigNumber.from(rewardBlock.timestamp).add(
          await lifeRewards.DURATION()
        );
        expect(await lifeRewards.periodFinish()).to.be.equal(periodFinish);

        await expect(initialRewardTx)
          .to.emit(lifeRewards, "RewardAdded")
          .withArgs(ethers.utils.parseEther("100"));
      });

      it("set initial reward twice before duration ends", async () => {
        const previousPeriodFinish = await lifeRewards.periodFinish();
        const previousRewardRate = await lifeRewards.rewardRate();

        const approveTx2 = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("15")
        );
        await approveTx2.wait();
        const initialRewardTx2 = await lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("15")
        );
        await initialRewardTx2.wait();

        const rewardBlock2 = await ethers.provider.getBlock(
          initialRewardTx2.blockNumber
        );
        const remaining = previousPeriodFinish.sub(rewardBlock2.timestamp);
        const leftover = remaining.mul(previousRewardRate);
        const expectedRewardRate = ethers.utils
          .parseEther("15")
          .add(leftover)
          .div(await lifeRewards.DURATION());

        expect(await lifeRewards.rewardRate()).to.equal(expectedRewardRate);
      });

      it("set initial reward again after duration ends", async () => {
        await network.provider.send("evm_increaseTime", [10000000000]);
        const oldRewardPerToken = await lifeRewards.rewardPerToken();

        const approveTx2 = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("77")
        );
        await approveTx2.wait();
        const initialRewardTx2 = await lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("77")
        );
        await initialRewardTx2.wait();

        expect(await lifeRewards.rewardPerTokenStored()).to.be.equal(
          oldRewardPerToken
        );
        const expectedRewardRate = ethers.utils
          .parseEther("77")
          .div(await lifeRewards.DURATION());
        expect(await lifeRewards.rewardRate()).to.be.equal(expectedRewardRate);
      });
    });
  });

  describe("Last time reward applicable", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Get last time reward applicable when finish period is smaller than block timestamp", async () => {
      const lastTimeRewardApplicable =
        await lifeRewards.lastTimeRewardApplicable();

      const periodFinish = await lifeRewards.periodFinish();

      expect(lastTimeRewardApplicable).to.deep.equal(periodFinish);
    });

    it("Get last time reward applicable when block timestamp is smaller than finish period", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await network.provider.send("evm_increaseTime", [10000000000]);

      const approveTx3 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx3.wait();

      const stakeTx2 = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx2.wait();

      const getRewardsTx2 = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx2.wait();

      const lastTimeRewardApplicable =
        await lifeRewards.lastTimeRewardApplicable();

      const blockTimestamp = (await waffle.provider.getBlock()).timestamp;

      expect(lastTimeRewardApplicable).to.deep.equal(blockTimestamp);
    });
  });

  describe("Total supply", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Get total supply", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const totalSupply = await lifeRewards.totalSupply();

      expect(totalSupply).to.deep.equal(ethers.utils.parseEther("100"));
    });

    it("Get total supply when LPLIFE is 0", async () => {
      const totalSupply = await lifeRewards.totalSupply();

      expect(totalSupply).to.deep.equal(ethers.constants.Zero);
    });
  });

  describe("Reward per token", () => {
    it("Get reward per token", async () => {
      await beforeEachSetUp();

      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await network.provider.send("evm_increaseTime", [10000000000]);

      const rewardPerTokenStored = await lifeRewards.rewardPerTokenStored();
      const lastTimeRewardApplicable =
        await lifeRewards.lastTimeRewardApplicable();
      const lastUpdateTime = await lifeRewards.lastUpdateTime();
      const rewardRate = await lifeRewards.rewardRate();
      const totalSupply = await lifeRewards.totalSupply();
      const rewardPerTokenCalculated = rewardPerTokenStored.add(
        lastTimeRewardApplicable
          .sub(lastUpdateTime)
          .mul(rewardRate)
          .div(ethers.BigNumber.from("1").pow(ethers.BigNumber.from("18")))
          .div(totalSupply)
      );

      const rewardPerToken = await lifeRewards.rewardPerToken();

      expect(rewardPerToken).deep.equal(rewardPerTokenCalculated);
    });

    it("Get reward per token when total supply of LPLIFE is 0", async () => {
      accounts = await ethers.getSigners();
      ownerAccount = accounts[0];
      taxAccount = accounts[1];
      emptyAccount = accounts[2];

      userAccounts = accounts.slice(3, 9);

      LIFEToken = await ethers.getContractFactory("LIFEToken");
      lifeToken = await LIFEToken.deploy(ethers.utils.parseEther("1000000"));
      await lifeToken.deployed();

      LPLIFEToken = await ethers.getContractFactory("LPLIFEToken");
      lpLifeToken = await LPLIFEToken.deploy(ethers.constants.Zero);
      await lpLifeToken.deployed();

      await lifeToken.transfer(
        ownerAccount.address,
        ethers.utils.parseEther("100000")
      );

      for (let i = 0; i < 6; i++) {
        await lifeToken.transfer(
          userAccounts[i].address,
          ethers.utils.parseEther("100000")
        );
      }

      LIFERewards = await ethers.getContractFactory("LIFERewards");
      lifeRewards = await LIFERewards.deploy(
        lifeToken.address,
        taxAccount.address,
        lpLifeToken.address
      );
      await lifeRewards.deployed();

      const rewardPerTokenStored = await lifeRewards.rewardPerTokenStored();

      const rewardPerToken = await lifeRewards.rewardPerToken();

      expect(rewardPerToken).deep.equal(rewardPerTokenStored);
    });
  });

  describe("Earned rewards", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Get amount of earned rewards", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
      ethers.provider.send("evm_mine");

      let earned = await lifeRewards.earned(userAccounts[0].address);
      expect(earned.gt(ethers.BigNumber.from("0"))).to.equal(true);

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await ethers.provider.send("evm_increaseTime", [10000000000]);

      const approveTx3 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx3.wait();

      const stakeTx2 = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx2.wait();

      const earnedTx = await lifeRewards.earned(userAccounts[0].address);

      const balance = await lifeToken.balanceOf(userAccounts[0].address);
      const rewardPerToken = await lifeRewards.rewardPerToken();
      const userRewardPerTokenPaid = await lifeRewards.userRewardPerTokenPaid(
        userAccounts[0].address
      );
      const rewards = await lifeRewards.rewards(userAccounts[0].address);
      const calculateEarned = balance
        .mul(rewardPerToken.sub(userRewardPerTokenPaid))
        .div(ethers.BigNumber.from("1").pow(ethers.BigNumber.from("18")))
        .add(rewards);

      expect(earnedTx).to.deep.equal(calculateEarned);
    });

    it("Get amount of earned rewards when it is 0", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await network.provider.send("evm_increaseTime", [10000000000]);

      const earnedTx = await lifeRewards.earned(userAccounts[0].address);

      const balance = await lifeToken.balanceOf(userAccounts[0].address);
      const rewardPerToken = await lifeRewards.rewardPerToken();
      const userRewardPerTokenPaid = await lifeRewards.userRewardPerTokenPaid(
        userAccounts[0].address
      );
      const rewards = await lifeRewards.rewards(userAccounts[0].address);
      const calculateEarned = balance
        .mul(rewardPerToken.sub(userRewardPerTokenPaid))
        .div(ethers.BigNumber.from("1").pow(ethers.BigNumber.from("18")))
        .add(rewards);

      expect(earnedTx)
        .to.deep.equal(calculateEarned)
        .deep.equal(ethers.constants.Zero);
    });
  });

  describe("Get rewards", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Get rewards from a LIFERewards contract with 0 LIFE", async () => {
      const oldBalance = await lifeToken.balanceOf(userAccounts[0].address);

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      const newBalance = await lifeToken.balanceOf(userAccounts[0].address);

      expect(oldBalance).to.equal(newBalance);
    });

    it("Get rewards from a LIFERewards contract with an empty reward pool", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const oldBalance = await lifeToken.balanceOf(userAccounts[0].address);

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      const newBalance = await lifeToken.balanceOf(userAccounts[0].address);

      expect(oldBalance).to.deep.equal(newBalance);
    });

    it("Get rewards from a LIFERewards contract", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await network.provider.send("evm_increaseTime", [10000000000]);

      const approveTx3 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx3.wait();

      const stakeTx2 = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx2.wait();

      const oldBalance = await lifeToken.balanceOf(userAccounts[0].address);
      const earnedTx = await lifeRewards.earned(userAccounts[0].address);
      const tax = earnedTx
        .div(ethers.BigNumber.from("100"))
        .mul(ethers.BigNumber.from("2"));

      const getRewardsTx2 = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx2.wait();

      const newBalance = await lifeToken.balanceOf(userAccounts[0].address);
      const balanceDifference = newBalance.sub(oldBalance);
      const balanceDifferencePlusTax = balanceDifference.add(tax);

      expect(balanceDifferencePlusTax.eq(earnedTx)).to.be.true;
    });

    it("Get rewards from a LIFERewards contract with delay between earned() and getReward() with no calls in between", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await network.provider.send("evm_increaseTime", [10000000000]);

      const approveTx4 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx4.wait();

      const stakeTx2 = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx2.wait();

      const oldBalance = await lifeToken.balanceOf(userAccounts[0].address);
      const earnedTx = await lifeRewards.earned(userAccounts[0].address);
      const tax = earnedTx
        .div(ethers.BigNumber.from("100"))
        .mul(ethers.BigNumber.from("2"));

      await network.provider.send("evm_increaseTime", [10000000000]);

      const getRewardsTx2 = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx2.wait();

      const newBalance = await lifeToken.balanceOf(userAccounts[0].address);
      const balanceDifference = newBalance.sub(oldBalance);
      const balanceDifferencePlusTax = balanceDifference.add(tax);

      expect(balanceDifferencePlusTax.eq(earnedTx)).to.be.true;
    });
  });

  describe("Withdraw and get rewards", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Withdraw and get rewards for staking", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const oldLPLIFEBalance = await lpLifeToken.balanceOf(
        userAccounts[0].address
      );

      const approveTx2 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx2.wait();

      const stakeTx = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx.wait();

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await network.provider.send("evm_increaseTime", [10000000000]);

      const approveTx3 = await lpLifeToken
        .connect(userAccounts[0])
        .approve(lifeRewards.address, ethers.utils.parseEther("100"));
      await approveTx3.wait();

      const stakeTx2 = await lifeRewards
        .connect(userAccounts[0])
        .stake(ethers.utils.parseEther("100"));
      await stakeTx2.wait();

      const oldLIFEBalance = await lifeToken.balanceOf(userAccounts[0].address);
      const earnedTx = await lifeRewards.earned(userAccounts[0].address);
      const tax = earnedTx
        .div(ethers.BigNumber.from("100"))
        .mul(ethers.BigNumber.from("2"));

      const exitTx = await lifeRewards.connect(userAccounts[0]).exit();
      await exitTx.wait();

      const newLPLIFEBalance = await lpLifeToken.balanceOf(
        userAccounts[0].address
      );
      const newLIFEBalance = await lifeToken.balanceOf(userAccounts[0].address);
      const LIFEBalanceDifference = newLIFEBalance.sub(oldLIFEBalance);
      const LIFEBalanceDifferencePlusTax = LIFEBalanceDifference.add(tax);
      const LPLIFEBalanceDifference = newLPLIFEBalance.sub(oldLPLIFEBalance);

      expect(LIFEBalanceDifferencePlusTax.eq(earnedTx)).to.be.true;
      expect(LPLIFEBalanceDifference.eq(ethers.constants.Zero)).to.be.true;
    });

    it("Withdraw and get rewards without staking beforehand", async () => {
      const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardDistributionTx.wait();

      const approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100")
      );
      await approveTx.wait();

      const initialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("100")
      );
      await initialRewardTx.wait();

      const getRewardsTx = await lifeRewards
        .connect(userAccounts[0])
        .getReward();
      await getRewardsTx.wait();

      await network.provider.send("evm_increaseTime", [10000000000]);

      await expect(
        lifeRewards.connect(userAccounts[0]).exit()
      ).to.be.revertedWith("Cannot withdraw 0");
    });
  });

  describe("Events", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    describe("RewardAdded", () => {
      it("Trigger event from initialRewardNotify", async () => {
        const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
          ownerAccount.address
        );
        await setRewardDistributionTx.wait();

        const approveTx = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("100")
        );
        await approveTx.wait();

        const initialRewardTx = lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("100")
        );

        await expect(initialRewardTx)
          .to.emit(lifeRewards, "RewardAdded")
          .withArgs(ethers.utils.parseEther("100"));
      });

      it("Trigger event from getReward", async () => {
        const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
          ownerAccount.address
        );
        await setRewardDistributionTx.wait();

        const approveTx = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("100")
        );
        await approveTx.wait();

        const initialRewardTx = await lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("100")
        );
        await initialRewardTx.wait();

        const approveTx2 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx2.wait();

        const stakeTx = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx.wait();

        const getRewardsTx = await lifeRewards
          .connect(userAccounts[0])
          .getReward();
        await getRewardsTx.wait();

        await network.provider.send("evm_increaseTime", [10000000000]);

        const approveTx3 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx3.wait();

        const stakeTx2 = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx2.wait();

        const earnedTx = await lifeRewards.earned(userAccounts[0].address);

        const getRewardsTx2 = lifeRewards.connect(userAccounts[0]).getReward();

        // Event gets emitted with the endowment value (1% of reward) instead of the reward value
        await expect(getRewardsTx2)
          .to.emit(lifeRewards, "RewardAdded")
          .withArgs(earnedTx.div(ethers.BigNumber.from("100")));
      });
    });

    describe("Staked", () => {
      it("Trigger event from stake", async () => {
        const approveTx = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx.wait();

        const stakeTx = lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));

        await expect(stakeTx)
          .to.emit(lifeRewards, "Staked")
          .withArgs(userAccounts[0].address, ethers.utils.parseEther("100"));
      });
    });

    describe("Withdrawn", () => {
      it("Trigger event from withdraw", async () => {
        const approveTx = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx.wait();

        const stakeTx = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx.wait();

        const withdrawTx = lifeRewards
          .connect(userAccounts[0])
          .withdraw(ethers.utils.parseEther("100"));

        await expect(withdrawTx)
          .to.emit(lifeRewards, "Withdrawn")
          .withArgs(userAccounts[0].address, ethers.utils.parseEther("100"));
      });

      it("Trigger event from exit", async () => {
        const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
          ownerAccount.address
        );
        await setRewardDistributionTx.wait();

        const approveTx = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("100")
        );
        await approveTx.wait();

        const initialRewardTx = await lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("100")
        );
        await initialRewardTx.wait();

        const approveTx2 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx2.wait();

        const stakeTx = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx.wait();

        const getRewardsTx = await lifeRewards
          .connect(userAccounts[0])
          .getReward();
        await getRewardsTx.wait();

        await network.provider.send("evm_increaseTime", [10000000000]);

        const approveTx3 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx3.wait();

        const stakeTx2 = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx2.wait();

        const exitTx = lifeRewards.connect(userAccounts[0]).exit();

        await expect(exitTx)
          .to.emit(lifeRewards, "Withdrawn")
          .withArgs(userAccounts[0].address, ethers.utils.parseEther("200"));
      });
    });

    describe("RewardPaid", () => {
      it("Trigger event from getReward", async () => {
        const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
          ownerAccount.address
        );
        await setRewardDistributionTx.wait();

        const approveTx = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("100")
        );
        await approveTx.wait();

        const initialRewardTx = await lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("100")
        );
        await initialRewardTx.wait();

        const approveTx2 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx2.wait();

        const stakeTx = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx.wait();

        const getRewardsTx = await lifeRewards
          .connect(userAccounts[0])
          .getReward();
        await getRewardsTx.wait();

        await network.provider.send("evm_increaseTime", [10000000000]);

        const approveTx3 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx3.wait();

        const stakeTx2 = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx2.wait();

        const earnedTx = await lifeRewards.earned(userAccounts[0].address);

        const getRewardsTx2 = lifeRewards.connect(userAccounts[0]).getReward();

        await expect(getRewardsTx2)
          .to.emit(lifeRewards, "RewardPaid")
          .withArgs(userAccounts[0].address, earnedTx);
      });

      it("Trigger event from exit", async () => {
        const setRewardDistributionTx = await lifeRewards.setRewardDistribution(
          ownerAccount.address
        );
        await setRewardDistributionTx.wait();

        const approveTx = await lifeToken.approve(
          lifeRewards.address,
          ethers.utils.parseEther("100")
        );
        await approveTx.wait();

        const initialRewardTx = await lifeRewards.initialRewardNotify(
          ethers.utils.parseEther("100")
        );
        await initialRewardTx.wait();

        const approveTx2 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx2.wait();

        const stakeTx = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx.wait();

        const getRewardsTx = await lifeRewards
          .connect(userAccounts[0])
          .getReward();
        await getRewardsTx.wait();

        await network.provider.send("evm_increaseTime", [10000000000]);

        const approveTx3 = await lpLifeToken
          .connect(userAccounts[0])
          .approve(lifeRewards.address, ethers.utils.parseEther("100"));
        await approveTx3.wait();

        const stakeTx2 = await lifeRewards
          .connect(userAccounts[0])
          .stake(ethers.utils.parseEther("100"));
        await stakeTx2.wait();

        const earnedTx = await lifeRewards.earned(userAccounts[0].address);

        const exitTx = lifeRewards.connect(userAccounts[0]).exit();

        await expect(exitTx)
          .to.emit(lifeRewards, "RewardPaid")
          .withArgs(userAccounts[0].address, earnedTx);
      });
    });
  });
});
