const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LIFERewards Admin Testing", () => {
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

  describe("Admin Methods", () => {
    beforeEach(async () => {
      await beforeEachSetUp();
    });

    it("Cannot set rewards distributor as the zero address", async () => {
      let setRewardsDistTx = lifeRewards.setRewardDistribution(
        ethers.constants.AddressZero
      );

      expect(setRewardsDistTx).to.be.revertedWith("Cannot be zero address");
    });

    it("Set Rewards Distributor", async () => {
      let setRewardsDistTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardsDistTx.wait();

      let rewardsDistributor = await lifeRewards.rewardDistribution();

      expect(rewardsDistributor).to.equal(ownerAccount.address);
    });

    it("Only owner can set ", async () => {
      let setRewardsDistTx = lifeRewards
        .connect(userAccounts[0])
        .setRewardDistribution(ownerAccount.address);

      await expect(setRewardsDistTx).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Set intial rewards", async () => {
      let setRewardsDistTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardsDistTx.wait();

      let rewardsDistributor = await lifeRewards.rewardDistribution();

      expect(rewardsDistributor).to.equal(ownerAccount.address);

      let approveTx = await lifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100000")
      );
      await approveTx.wait();

      let intialRewardTx = await lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("1000")
      );
      await intialRewardTx.wait();

      let lifeRewardsBalance = await lifeToken.balanceOf(lifeRewards.address);
      expect(lifeRewardsBalance).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Only Distributor set rewards", async () => {
      let setRewardsDistTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardsDistTx.wait();

      let rewardsDistributor = await lifeRewards.rewardDistribution();

      expect(rewardsDistributor).to.equal(ownerAccount.address);

      let intialRewardTx = lifeRewards
        .connect(userAccounts[0])
        .initialRewardNotify(ethers.utils.parseEther("1000"));

      await expect(intialRewardTx).to.be.revertedWith(
        "Caller is not reward distribution"
      );
    });

    it("Should not distribute rewards unless enough balance", async () => {
      let setRewardsDistTx = await lifeRewards.setRewardDistribution(
        ownerAccount.address
      );
      await setRewardsDistTx.wait();

      let rewardsDistributor = await lifeRewards.rewardDistribution();

      expect(rewardsDistributor).to.equal(ownerAccount.address);

      let approveTx = await lpLifeToken.approve(
        lifeRewards.address,
        ethers.utils.parseEther("100000")
      );
      await approveTx.wait();

      let balanceLife = await lifeToken.balanceOf(ownerAccount.address);

      let transferTx = await lifeToken.transfer(
        userAccounts[0].address,
        balanceLife
      );
      await transferTx.wait();

      let intialRewardTx = lifeRewards.initialRewardNotify(
        ethers.utils.parseEther("1000")
      );

      await expect(intialRewardTx).to.be.revertedWith(
        "SafeERC20: low-level call failed"
      );
    });
  });
});
