const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vesting", () => {
  let LIFE;
  let life;
  let VESTING;
  let vesting;
  let accounts;
  let ownerAccount;
  let userAccounts;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    ownerAccount = accounts[0];
    userAccounts = accounts.slice(1, 14);

    // Deploy life token
    LIFE = await ethers.getContractFactory("LIFE");
    life = await LIFE.deploy();
    await life.deployed();

    // initialize life token
    let initTx = await life[
      "initialize(string,string,uint8,address,uint256,uint256)"
    ](
      "LIFE Token",
      "LIFE",
      18,
      ownerAccount.address,
      ethers.utils.parseEther("100000000"),
      ethers.utils.parseEther("500000000000000000")
    );
    await initTx.wait();

    // Deploy Vesting Contract
    VESTING = await ethers.getContractFactory("Vesting");
    vesting = await VESTING.deploy(life.address, userAccounts[1].address);
    await vesting.deployed();
  });

  describe("Vesting Deployment", () => {
    it("sets the correct deployer", async () => {
      expect(await vesting.deployer()).to.equal(ownerAccount.address);
    });

    it("sets the correct benefactor", async () => {
      expect(await vesting.benefactor()).to.equal(userAccounts[1].address);
    });
  });

  describe("testing initialize function", () => {
    it("reverts transaction if sender is not deployer", async () => {
      await expect(
        vesting.connect(userAccounts[1]).initialize()
      ).to.be.revertedWith("Can only be initialized by deployer");
    });

    it("reverts transaction if contract was previously initialized", async () => {
      await life.transfer(vesting.address, 100000);

      await vesting.initialize();
      await expect(vesting.initialize()).to.be.revertedWith(
        "Already initialized"
      );
    });

    it("reverts transaction if balance of vesting contract is 0", async () => {
      await expect(vesting.initialize()).to.be.revertedWith(
        "Tokens are not loaded yet"
      );
    });

    it("initializes variables correctly when function call succeeds", async () => {
      await life.transfer(vesting.address, 100000);
      const initTx = await vesting.initialize();
      await initTx.wait();
      const initBlock = await ethers.provider.getBlock(initTx.blockNumber);

      expect(await vesting.initialized()).be.true;
      expect(await vesting.lastUnlock()).to.equal(initBlock.timestamp);
      expect(await vesting.nextUnlock()).to.equal(
        initBlock.timestamp + 2592000
      ); //init timestamp + 30days in seconds

      expect(await vesting.distributionAmount()).to.equal(
        parseInt(100000 / 24)
      ); //vesting balance / 24
    });
  });

  describe("testing distribute function", () => {
    beforeEach(async () => {
      await life.transfer(vesting.address, 100000);
    });

    it("reverts transaction if contract isn't initialized", async () => {
      await expect(vesting.distribute()).to.be.revertedWith(
        "Vesting not initialized yet"
      );
    });

    it("reverts transaction if block.timestamp is less than nextUnlock", async () => {
      await vesting.initialize();
      await expect(vesting.distribute()).to.be.revertedWith(
        "No tokens to distribute yet"
      );
    });

    it("reverts transaction if current cycles is or equal to total cycles", async () => {
      await vesting.initialize();
      for (let i = 0; i < 24; i++) {
        await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // increase block time to 30 days later
        await vesting.distribute();
      }
      await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // increase block time to 30 days later
      await expect(vesting.distribute()).to.be.revertedWith(
        "Distribution Completed"
      );
    });

    it("sets variables correctly and transfers correct number of tokens after one call", async () => {
      await vesting.initialize();
      await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // increase block time to 30 days later
      const nextUnlock = await vesting.nextUnlock();
      const currentCycle = await vesting.currentCycle();
      const benefactorBalance = await life.balanceOf(userAccounts[1].address);
      await vesting.distribute();

      expect(await vesting.lastUnlock()).to.equal(nextUnlock);
      expect(await vesting.nextUnlock()).to.equal(nextUnlock.add(2592000)); //nextUnlock + 30days in seconds
      expect(await vesting.currentCycle()).to.equal(currentCycle.add(1));
      expect(await life.balanceOf(userAccounts[1].address)).to.equal(
        benefactorBalance.add(await vesting.distributionAmount())
      );
    });

    it("sets variables correctly and transfers correct number of tokens after 24 calls", async () => {
      await vesting.initialize();
      for (let i = 0; i < 24; i++) {
        await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // increase block time to 30 days later
        await vesting.distribute();
      }

      expect(await life.balanceOf(userAccounts[1].address)).to.equal(
        (await vesting.distributionAmount()) * 24
      );
    });
  });

  describe("testing recoverLeftover function", () => {
    beforeEach(async () => {
      await life.transfer(vesting.address, 100000);
    });

    it("reverts transaction if distribute has not be called 24 times", async () => {
      //test recoverLeftover before initialize
      await expect(vesting.recoverLeftover()).to.be.revertedWith(
        "Distribution not completed"
      );

      await vesting.initialize();
      for (let i = 0; i < 23; i++) {
        await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // increase block time to 30 days later
        await vesting.distribute();
      }
      //test recoverLeftover after initialize and 23 distribute calls
      await expect(vesting.recoverLeftover()).to.be.revertedWith(
        "Distribution not completed"
      );
    });

    it("transfers correct number of tokens", async () => {
      await vesting.initialize();
      for (let i = 0; i < 24; i++) {
        await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // increase block time to 30 days later
        await vesting.distribute();
      }

      const benefactorBalance = await life.balanceOf(userAccounts[1].address);
      const vestingBalance = await life.balanceOf(vesting.address);
      await vesting.recoverLeftover();

      expect(await life.balanceOf(vesting.address)).to.be.equal(0);
      expect(await life.balanceOf(userAccounts[1].address)).be.equal(
        benefactorBalance.add(vestingBalance)
      );
    });

    it("transfers tokens if more are deposited after recovering from leftovers", async () => {
      await vesting.initialize();
      for (let i = 0; i < 24; i++) {
        await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // increase block time to 30 days later
        await vesting.distribute();
      }

      await vesting.recoverLeftover();
      await life.transfer(vesting.address, 100000);
      const benefactorBalance = await life.balanceOf(userAccounts[1].address);
      await vesting.recoverLeftover();
      expect(await life.balanceOf(vesting.address)).to.be.equal(0);
      expect(await life.balanceOf(userAccounts[1].address)).be.equal(
        benefactorBalance.add(100000)
      );
    });
  });
});
