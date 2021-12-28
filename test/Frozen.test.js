const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Frozen", () => {
  let LIFE;
  let life;
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
  });

  it("Should not make owner frozen by default", async () => {
    expect(await life.isFrozen(ownerAccount.address)).be.false;
  });

  describe("Testing setting frozen role", () => {
    it("only guardian or governor can freeze target funds", async () => {
      //set new account as guardian and gov
      await life._setGuardian(userAccounts[1].address);
      await life._setPendingGov(userAccounts[1].address);
      await life.connect(userAccounts[1])._acceptGov();

      try {
        expect(await life.freezeTargetFunds(userAccounts[1].address));
      } catch (e) {
        expect(e.message).to.match(/not guardian or governor/);
      }
    });

    it("test freeze target funds", async () => {
      await expect(life.freezeTargetFunds(userAccounts[1].address))
        .to.emit(life, "AccountFrozen")
        .withArgs(userAccounts[1].address);

      expect(await life.isFrozen(userAccounts[1].address)).be.true;
      expect(await life.isFrozen(ownerAccount.address)).be.false;
    });

    it("should not allow freezing the same target in a short timespan", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      try {
        await life.freezeTargetFunds(userAccounts[1].address);
      } catch (e) {
        expect(e.message).to.match(/Target was Frozen recently/);
        expect(await life.isFrozen(userAccounts[1].address)).be.true;
      }
    });

    it("should allow freezing different targets in short timespan", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      await life.freezeTargetFunds(userAccounts[2].address);
      expect(await life.isFrozen(userAccounts[1].address)).be.true;
      expect(await life.isFrozen(userAccounts[2].address)).be.true;
    });

    it("should not allow unfreezing a target and freezing them again in a short timespan", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      await life.unfreezeTargetFunds(userAccounts[1].address);

      try {
        await life.freezeTargetFunds(userAccounts[1].address);
      } catch (e) {
        expect(e.message).to.match(/Target was Frozen recently/);
        expect(await life.isFrozen(userAccounts[1].address)).be.false;
      }
    });

    it("should allow unfreezing a target and freezing them again after two weeks", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      await life.unfreezeTargetFunds(userAccounts[1].address);

      await network.provider.send("evm_increaseTime", [15 * 24 * 60 * 60]); // increase block time to 15 days later
      await life.freezeTargetFunds(userAccounts[1].address);
      expect(await life.isFrozen(userAccounts[1].address)).be.true;
    });
  });

  describe("Testing removing frozen role", () => {
    it("only guardian or governor can unfreeze target funds", async () => {
      //set new account as guardian and gov
      await life._setGuardian(userAccounts[1].address);
      await life._setPendingGov(userAccounts[1].address);
      await life.connect(userAccounts[1])._acceptGov();

      try {
        expect(await life.unfreezeTargetFunds(userAccounts[1].address));
      } catch (e) {
        expect(e.message).to.match(/not guardian or governor/);
      }
    });

    it("should allow you to unfreeze", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      await expect(life.unfreezeTargetFunds(userAccounts[1].address))
        .to.emit(life, "AccountUnfrozen")
        .withArgs(userAccounts[1].address);

      expect(await life.isFrozen(userAccounts[1].address)).be.false;
    });
  });

  describe("Testing Transfer when address is frozen and unfrozen", () => {
    beforeEach(async () => {
      let mintTx2 = await life.mint(
        userAccounts[1].address,
        ethers.utils.parseEther("1000000000")
      );
      await mintTx2.wait();
    });

    it("should not allow transfer when frozen", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      try {
        await life
          .connect(userAccounts[1])
          .transfer(ownerAccount.address, 1000000000);
      } catch (e) {
        expect(e.message).to.match(/Frozen: Sender's tranfers are frozen/);
      }
    });

    it("should allow transfers when address is unfrozen", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      await life.unfreezeTargetFunds(userAccounts[1].address);

      await expect(
        life.connect(userAccounts[1]).transfer(ownerAccount.address, 1000000000)
      )
        .to.emit(life, "Transfer")
        .withArgs(userAccounts[1].address, ownerAccount.address, 1000000000);
    });
  });

  describe("Testing TransferFrom when address is frozen and unfrozen", () => {
    beforeEach(async () => {
      let mintTx2 = await life.mint(
        userAccounts[1].address,
        ethers.utils.parseEther("1000000000")
      );
      await mintTx2.wait();
    });

    it("should not allow transferFrom when frozen", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      await life
        .connect(userAccounts[1])
        .approve(ownerAccount.address, 1000000000);

      try {
        await life.transferFrom(
          userAccounts[1].address,
          ownerAccount.address,
          1000000000
        );
      } catch (e) {
        expect(e.message).to.match(/Frozen: Sender's tranfers are frozen/);
      }
    });

    it("should allow transferFrom when address is unfrozen", async () => {
      await life.freezeTargetFunds(userAccounts[1].address);
      await life.unfreezeTargetFunds(userAccounts[1].address);
      await life
        .connect(userAccounts[1])
        .approve(ownerAccount.address, 1000000000);

      await expect(
        life.transferFrom(
          userAccounts[1].address,
          ownerAccount.address,
          1000000000
        )
      )
        .to.emit(life, "Transfer")
        .withArgs(userAccounts[1].address, ownerAccount.address, 1000000000);
    });
  });
});
