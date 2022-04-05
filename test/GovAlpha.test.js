/*
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("GovernorAlpha", () => {
  let GovAlpha;
  let govAlpha;
  let LIFE;
  let life;
  let Timelock;
  let timelock;
  let accounts;
  let proposeTx;
  let lastTrx;
  let latestProposalId;
  let votingPeriod;
  let approvalPeriod;

  const ProposalState = {
    Created: 0,
    Pending: 1,
    Active: 2,
    Canceled: 3,
    Defeated: 4,
    Succeeded: 5,
    Queued: 6,
    Expired: 7,
    Executed: 8,
  };

  beforeEach(async function () {
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

    // deploy timelock
    Timelock = await ethers.getContractFactory("TimeLock");
    timelock = await Timelock.deploy();
    await timelock.deployed();

    //deploy gov alpha
    GovAlpha = await ethers.getContractFactory("DEVITAGovernor");
    govAlpha = await GovAlpha.deploy();
    await govAlpha.deployed();
    await govAlpha.initialize(timelock.address, life.address);

    votingPeriod = await govAlpha.votingPeriod();
    approvalPeriod = await govAlpha.approvalPeriod();

    // mint life tokens
    let mintTx = await life.mint(
      ownerAccount.address,
      ethers.utils.parseEther("1000000")
    );
    await mintTx.wait();

    let mintTx2 = await life.mint(
      userAccounts[1].address,
      ethers.utils.parseEther("1000000000")
    );
    await mintTx2.wait();
  });

  describe("GovernorAlpha initialization", function () {
    it("Check if initialize function sets variables", async function () {
      expect(await govAlpha.timelock()).to.be.equal(timelock.address);
      expect(await govAlpha.life()).to.be.equal(life.address);
      expect(await govAlpha.guardian()).to.be.equal(ownerAccount.address);
      expect(await govAlpha.admin()).to.be.equal(ownerAccount.address);

      expect(await govAlpha.quorumPercent()).to.be.equal(400);
      expect(await govAlpha.approvePercent()).to.be.equal(100);
      expect(await govAlpha.votingDelay()).to.be.equal(1);
      expect(await govAlpha.votingPeriod()).to.be.equal(17280);
      expect(await govAlpha.approvalPeriod()).to.be.equal(5760);
    });

    it("Check if initialize function reverts on second call", async function () {
      await expect(
        govAlpha.initialize(timelock.address, life.address)
      ).to.be.revertedWith("Contract instance has already been initialized");
    });

    it("reverts other functions if initialize function isn't called", async function () {
      let govAlpha2 = await GovAlpha.deploy();
      await govAlpha2.deployed();

      await expect(govAlpha2.quorumVotes()).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.approveVotes()).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.propose([], [], [], [], "")).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.approve(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.queue(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.execute(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.cancel(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.state(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.castVote(5, true)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2._setVotingDelay(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2._setVotingPeriod(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2._setApprovePercent(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2._setQuorumPercent(5)).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(
        govAlpha2._setPendingAdmin(userAccounts[3].address)
      ).to.be.revertedWith("can only be called after initialization");
      await expect(govAlpha2._acceptAdmin()).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(govAlpha2.__abdicate()).to.be.revertedWith(
        "can only be called after initialization"
      );
      await expect(
        govAlpha2.__queueSetTimelockPendingAdmin(userAccounts[3].address, 2)
      ).to.be.revertedWith("can only be called after initialization");
      await expect(
        govAlpha2.__executeSetTimelockPendingAdmin(userAccounts[3].address, 2)
      ).to.be.revertedWith("can only be called after initialization");
    });
  });

  describe("GovernorAlpha Propose!", function () {
    it("Check if initialized properly", async function () {
      // make sure balance has been minted properly
      let balanceOwner = await life.balanceOf(ownerAccount.address);
      expect(balanceOwner.toString()).to.equal("101000000000000000000000000"); // used to be "100000001000000000000000000000000"

      let balanceUser1 = await life.balanceOf(userAccounts[1].address);
      expect(balanceUser1.toString()).to.equal("1000000000000000000000000000");
    });

    it("Should reject propose with not enough balance", async function () {
      // proposal count should be 0
      let proposalCount = await govAlpha.proposalCount();
      expect(proposalCount.toString()).to.equal("0");

      // try proposing without balance
      try {
        let proposeTx = await govAlpha
          .connect(userAccounts[0])
          .propose(
            [ownerAccount.address],
            [5],
            ["hello"],
            [
              0x0000000000000000000000000000000000000000000000000000000061626364,
            ],
            "test description"
          );
        await proposeTx.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /POWERLEVEL UNDER 9000!!! Proposer balance below create threshold/
        );
      }
    });

    it("Should reject propose if a proposal exists", async function () {
      // propose with enough balance
      let proposeTx = await govAlpha
        .connect(ownerAccount)
        .propose(
          [ownerAccount.address],
          [5],
          ["hello"],
          [0x0000000000000000000000000000000000000000000000000000000061626364],
          "test description"
        );
      await proposeTx.wait();

      // proposal count should increase
      proposalCount = await govAlpha.proposalCount();
      expect(proposalCount.toString()).to.equal("1");

      // check that proposals have been updated
      // the first proposal should be the 0 address since it shouldnt exist
      let proposal = await govAlpha.proposals(0);
      expect(proposal[1]).to.equal(
        "0x0000000000000000000000000000000000000000"
      );

      // second proposal should have specific parameters ie the address of our proposer
      let proposal1 = await govAlpha.proposals(1);
      expect(proposal1[1]).to.equal(ownerAccount.address);

      // make sure latest proposal id of our proposer is correct
      // should be 1
      let latestProposalId = await govAlpha.latestProposalIds(
        ownerAccount.address
      );
      expect(latestProposalId.toString()).to.equal("1");

      // try proposing when proposer already has an active proposal
      try {
        let proposeTx2 = await govAlpha
          .connect(ownerAccount)
          .propose(
            [ownerAccount.address],
            [5],
            ["hello"],
            [
              0x0000000000000000000000000000000000000000000000000000000061626364,
            ],
            "test description"
          );
        await proposeTx2.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /one live proposal per proposer, found an already created proposal/
        );
      }
    });

    it("Should create two proposals for different users", async function () {
      // first proposer
      let proposeTx = await govAlpha
        .connect(ownerAccount)
        .propose(
          [ownerAccount.address],
          [5],
          ["hello"],
          [0x0000000000000000000000000000000000000000000000000000000061626364],
          "test description"
        );
      await proposeTx.wait();

      // create a second proposal by a seperate user
      let proposeTx2 = await govAlpha
        .connect(userAccounts[1])
        .propose(
          [ownerAccount.address],
          [5],
          ["hello"],
          [0x0000000000000000000000000000000000000000000000000000000061626364],
          "test description"
        );
      await proposeTx2.wait();

      // proposal count should increase
      proposalCount = await govAlpha.proposalCount();
      expect(proposalCount.toString()).to.equal("2");

      // second proposal should have specific parameters ie the address of our proposer
      let proposal2 = await govAlpha.proposals(2);
      expect(proposal2[1]).to.equal(userAccounts[1].address);

      // make sure latest proposal id of our proposer is correct
      // should be 1
      let latestProposalIdUser1 = await govAlpha.latestProposalIds(
        userAccounts[1].address
      );
      expect(latestProposalIdUser1.toString()).to.equal("2");
    });
  });

  describe("GovernorAlpha Approve!", function () {
    beforeEach(async function () {
      const setAdminTx = await timelock
        .connect(ownerAccount)
        .setPendingAdmin(govAlpha.address);
      await setAdminTx.wait();

      const acceptAdminTx = await govAlpha
        .connect(ownerAccount)
        ._acceptTimelockAdmin();
      await acceptAdminTx.wait();

      const trx3 = await life
        .connect(ownerAccount)
        .delegate(accounts[1].address);

      await trx3.wait();

      // propose with enough balance
      proposeTx = await govAlpha
        .connect(ownerAccount)
        .propose(
          [ownerAccount.address],
          [5],
          ["hello"],
          [0x0000000000000000000000000000000000000000000000000000000061626364],
          "test description"
        );
      await proposeTx.wait();

      lastTrx = proposeTx;

      // make sure latest proposal id of our proposer is correct
      // should be 1
      latestProposalId = await govAlpha.latestProposalIds(ownerAccount.address);
    });

    it("Should reject approver without enough votes", async () => {
      expect((await govAlpha.approveVotes()).toString()).to.not.equal("0");
      expect(
        (
          await life.getPriorVotes(
            ownerAccount.address,
            proposeTx.blockNumber - 1
          )
        ).toString()
      ).to.equal("0");

      try {
        let trx2 = await govAlpha
          .connect(ownerAccount)
          .approve(latestProposalId);
        await trx2.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::propose: approver votes below approval threshold/
        );
      }
    });

    it("Should reject approve for approved proposal", async () => {
      let trx1 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx1.wait();

      try {
        let trx2 = await govAlpha
          .connect(ownerAccount)
          .approve(latestProposalId);
        await trx2.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::add: proposal already approved/
        );
      }
    });

    it("Should reject approve for cancelled proposal", async () => {
      let trx1 = await govAlpha.connect(accounts[1]).cancel(latestProposalId);
      await trx1.wait();

      try {
        let trx2 = await govAlpha
          .connect(ownerAccount)
          .approve(latestProposalId);
        await trx2.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::add: proposal already approved/
        );
      }
    });

    it("Should get expired state for proposal past approval period", async () => {
      // wait 20 blocks so voting can end
      for (let i = 0; i < approvalPeriod; i++) {
        ethers.provider.send("evm_mine");
      }

      expect(await govAlpha.state(latestProposalId)).to.equal(
        ProposalState.Expired
      );
    });

    it("Should approve proposal", async () => {
      expect((await govAlpha.approveVotes()).toString()).to.not.equal("0");
      expect(
        (
          await life.getPriorVotes(accounts[1].address, lastTrx.blockNumber - 1)
        ).toString()
      ).to.not.equal("0");

      let trx2 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx2.wait();

      const proposal = await govAlpha.proposals(latestProposalId);
      const votingDelay = await govAlpha.votingDelay();
      const votingPeriod = await govAlpha.votingPeriod();
      const startBlock = votingDelay.add(lastTrx.blockNumber + 1);

      expect(proposal.approver).to.equal(accounts[1].address);
      expect(proposal.startBlock.toString()).to.equal(startBlock.toString());
      expect(proposal.endBlock.toString()).to.equal(
        startBlock.add(votingPeriod).toString()
      );
    });
  });

  describe("GovernorAlpha Queue!", function () {
    beforeEach(async function () {
      const setAdminTx = await timelock
        .connect(ownerAccount)
        .setPendingAdmin(govAlpha.address);
      await setAdminTx.wait();

      const acceptAdminTx = await govAlpha
        .connect(ownerAccount)
        ._acceptTimelockAdmin();
      await acceptAdminTx.wait();

      const trx3 = await life
        .connect(ownerAccount)
        .delegate(accounts[1].address);

      await trx3.wait();

      // propose with enough balance
      proposeTx = await govAlpha
        .connect(ownerAccount)
        .propose(
          [ownerAccount.address],
          [5],
          ["hello"],
          [0x0000000000000000000000000000000000000000000000000000000061626364],
          "test description"
        );
      await proposeTx.wait();

      lastTrx = proposeTx;

      // make sure latest proposal id of our proposer is correct
      // should be 1
      latestProposalId = await govAlpha.latestProposalIds(ownerAccount.address);
    });

    it("Voting should fail if its closed", async () => {
      // approve first
      let trx2 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx2.wait();

      try {
        let voteTx = await govAlpha
          .connect(ownerAccount)
          .castVote(latestProposalId, true);
        await voteTx.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::_castVote: voting is closed/
        );
      }
    });

    it("Vote testing", async () => {
      // approve first
      let trx2 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx2.wait();

      // wait 1 block
      ethers.provider.send("evm_mine");

      // vote
      let voteTx = await govAlpha
        .connect(ownerAccount)
        .castVote(latestProposalId, true);
      await voteTx.wait();
    });

    it("Should fail to queue if proposal has not succeeded yet", async () => {
      try {
        let queueTx = await govAlpha
          .connect(ownerAccount)
          .queue(latestProposalId);
        await queueTx.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::queue: proposal can only be queued if it is succeeded/
        );
      }
    });

    it("Should queue after proposal has succeeded ie 4% votes", async () => {
      // approve first
      let trx2 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx2.wait();

      // wait 1 block
      ethers.provider.send("evm_mine");

      // vote
      let voteTx = await govAlpha
        .connect(accounts[1])
        .castVote(latestProposalId, true);
      await voteTx.wait();

      let proposal = await govAlpha.proposals(latestProposalId);
      let startBlock = proposal[5].toString();
      let endBlock = proposal[6].toString();
      let votingPeriod = parseInt(await govAlpha.votingPeriod());

      expect(startBlock).to.equal(String(voteTx.blockNumber - 1));
      expect(endBlock).to.equal(String(voteTx.blockNumber + votingPeriod - 1));

      // proposal state should be active
      let proposalState = await govAlpha.state(latestProposalId);
      expect(proposalState).to.equal(ProposalState.Active);

      // wait 20 blocks so voting can end
      for (i = 0; i < votingPeriod; i++) {
        ethers.provider.send("evm_mine");
      }

      // proposal state should be succeeded
      let proposalState2 = await govAlpha.state(latestProposalId);
      expect(proposalState2).to.equal(ProposalState.Succeeded);

      let queueTx = await govAlpha
        .connect(ownerAccount)
        .queue(latestProposalId);
      await queueTx.wait();

      // proposal state should be queued
      let proposalState3 = await govAlpha.state(latestProposalId);
      expect(proposalState3).to.equal(ProposalState.Queued);
    });

    it("Should cancel when proposal not approved yet", async () => {
      // find TimeLock admin
      let timeLockAdmin = await timelock.admin();
      // timelock admin should be deployer ie owner account
      expect(govAlpha.address).to.equal(timeLockAdmin);

      // try to cancel a proposal when its just been proposed
      let cancelTx = await govAlpha
        .connect(ownerAccount)
        .cancel(latestProposalId);
      await cancelTx.wait();

      expect(await govAlpha.state(latestProposalId)).to.equal(
        ProposalState.Canceled
      );
    });
  });

  describe("GovernorAlpha Execute!", function () {
    beforeEach(async function () {
      const setAdminTx = await timelock
        .connect(ownerAccount)
        .setPendingAdmin(govAlpha.address);
      await setAdminTx.wait();

      const acceptAdminTx = await govAlpha
        .connect(ownerAccount)
        ._acceptTimelockAdmin();
      await acceptAdminTx.wait();

      const trx3 = await life
        .connect(ownerAccount)
        .delegate(accounts[1].address);
      await trx3.wait();

      // propose with enough balance
      proposeTx = await govAlpha
        .connect(ownerAccount)
        .propose(
          [life.address],
          [0],
          ["_acceptGov()"],
          [ethers.utils.solidityKeccak256([], [])],
          "Update Gov"
        );
      await proposeTx.wait();

      lastTrx = proposeTx;

      // make sure latest proposal id of our proposer is correct
      // should be 1
      latestProposalId = await govAlpha.latestProposalIds(ownerAccount.address);

      // approve first
      let trx2 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx2.wait();

      // wait 1 block
      ethers.provider.send("evm_mine");

      // vote
      let voteTx = await govAlpha
        .connect(accounts[1])
        .castVote(latestProposalId, true);
      await voteTx.wait();

      // wait 20 blocks so voting can end
      for (i = 0; i < votingPeriod; i++) {
        ethers.provider.send("evm_mine");
      }

      let queueTx = await govAlpha
        .connect(ownerAccount)
        .queue(latestProposalId);
      await queueTx.wait();
    });

    it("Should reject execute before delay period", async () => {
      await (
        await life.connect(ownerAccount)._setPendingGov(timelock.address)
      ).wait();

      try {
        let execute = await govAlpha
          .connect(ownerAccount)
          .execute(latestProposalId);
        await execute.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /Timelock::executeTransaction: Transaction hasn't surpassed time lock/
        );
      }
    });

    it("Should reject execute after grace period", async () => {
      await (
        await life.connect(ownerAccount)._setPendingGov(timelock.address)
      ).wait();

      // Timelock has 14 day grace period and min delay of 24 hours
      // 15 * 24 * 60 * 60 == 15 days
      ethers.provider.send("evm_increaseTime", [15 * 24 * 60 * 60]);

      try {
        let execute = await govAlpha
          .connect(ownerAccount)
          .execute(latestProposalId);
        await execute.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::execute: proposal can only be executed if it is queued/
        );
      }
    });

    it("Should revert transaction if execution is not successful", async () => {
      // Timelock has 14 day grace period and min delay of 24 hours
      // 10 * 24 * 60 * 60 == 10 days
      ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);

      try {
        let execute = await govAlpha
          .connect(ownerAccount)
          .execute(latestProposalId);
        await execute.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /Timelock::executeTransaction: Transaction execution reverted/
        );
      }
    });

    it("Should reject cancel on executed proposal", async () => {
      await (
        await life.connect(ownerAccount)._setPendingGov(timelock.address)
      ).wait();

      // Timelock has 14 day grace period and min delay of 24 hours
      // 10 * 24 * 60 * 60 == 10 days
      ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);

      let execute = await govAlpha
        .connect(ownerAccount)
        .execute(latestProposalId);
      await execute.wait();

      expect(await life.gov()).to.equal(timelock.address);
      try {
        let execute = await govAlpha
          .connect(ownerAccount)
          .cancel(latestProposalId);
        await execute.wait();
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::cancel: cannot cancel executed proposal/
        );
      }
    });

    it("Should reject cancel when proposer above threshold", async () => {
      // push approver above threshold
      let mintTx = await life.mint(
        accounts[1].address,
        ethers.utils.parseEther("1000000000000")
      );
      await mintTx.wait();

      try {
        let cancelTx = await govAlpha
          .connect(accounts[2])
          .cancel(latestProposalId);
        await cancelTx.wait();
      } catch (e) {
        expect(e.message).to.match(
          /DEVITAGovernor::cancel: proposer above threshold/
        );
      }
    });

    it("Should cancel if the msg.sender is the guardian even if proposer is above threshold", async () => {
      // push approver above threshold
      let mintTx = await life.mint(
        accounts[1].address,
        ethers.utils.parseEther("1000000000000")
      );
      await mintTx.wait();

      let cancelTx = await govAlpha
        .connect(ownerAccount)
        .cancel(latestProposalId);
      await cancelTx.wait();

      let proposalState = await govAlpha.state(latestProposalId);
      expect(proposalState).to.equal(ProposalState.Canceled);
    });

    it("Should cancel if the msg.sender is the proposer even if proposer is above threshold", async () => {
      // push approver above threshold
      let mintTx = await life.mint(
        accounts[1].address,
        ethers.utils.parseEther("100000000000000")
      );
      await mintTx.wait();

      // propose with another proposer
      proposeTx = await govAlpha
        .connect(accounts[1])
        .propose(
          [life.address],
          [0],
          ["_acceptGov()"],
          [ethers.utils.solidityKeccak256([], [])],
          "Update Gov"
        );
      await proposeTx.wait();

      // get proposal id
      latestProposalId = await govAlpha.latestProposalIds(accounts[1].address);

      let cancelTx = await govAlpha
        .connect(accounts[1])
        .cancel(latestProposalId);
      await cancelTx.wait();

      let proposalState = await govAlpha.state(latestProposalId);
      expect(proposalState).to.equal(ProposalState.Canceled);
    });

    it("Should reject proposal if voting delay is above limit", async () => {
      await (await govAlpha._setPendingAdmin(timelock.address)).wait();

      const abi = new ethers.utils.AbiCoder();

      // propose with enough balance
      proposeTx = await govAlpha.connect(ownerAccount).propose(
        [
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
        ],
        [0, 0, 0, 0, 0, 0],
        [
          "_acceptAdmin()",
          "_setVotingDelay(uint256)",
          "_setVotingPeriod(uint256)",
          "_setApprovePercent(uint256)",
          "_setQuorumPercent(uint256)",
          "_setPendingAdmin(address)",
        ],

        [
          abi.encode([], []),
          abi.encode(["uint256"], [50000]),
          abi.encode(["uint256"], [34560]),
          abi.encode(["uint256"], [200]),
          abi.encode(["uint256"], [800]),
          abi.encode(["address"], [ownerAccount.address]),
        ],
        "Call all setters"
      );
      await proposeTx.wait();

      lastTrx = proposeTx;

      // make sure latest proposal id of our proposer is correct
      // should be 1
      latestProposalId = await govAlpha.latestProposalIds(ownerAccount.address);

      // approve first
      let trx2 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx2.wait();

      // wait 1 block
      ethers.provider.send("evm_mine");

      // vote
      let voteTx = await govAlpha
        .connect(accounts[1])
        .castVote(latestProposalId, true);
      await voteTx.wait();

      // wait 20 blocks so voting can end
      for (i = 0; i < votingPeriod; i++) {
        ethers.provider.send("evm_mine");
      }

      let queueTx = await govAlpha
        .connect(ownerAccount)
        .queue(latestProposalId);
      await queueTx.wait();

      // Timelock has 14 day grace period and min delay of 24 hours
      // 10 * 24 * 60 * 60 == 10 days
      ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);

      try {
        let execute = await govAlpha
          .connect(ownerAccount)
          .execute(latestProposalId);
        await execute.wait();
        assert(false);
      } catch (e) {
        expect(e.message).to.match(
          /Timelock::executeTransaction: Transaction execution reverted/
        );
      }

      expect(await govAlpha.admin()).to.not.equal(timelock.address);
      expect((await govAlpha.votingDelay()).toString()).to.not.equal("10");
      expect((await govAlpha.votingPeriod()).toString()).to.not.equal("34560");
      expect((await govAlpha.approvePercent()).toString()).to.not.equal("200");
      expect((await govAlpha.quorumPercent()).toString()).to.not.equal("800");
      expect(await govAlpha.pendingAdmin()).to.not.equal(ownerAccount.address);

      // proposal should be executed
      expect(await govAlpha.state(latestProposalId)).to.equal(
        ProposalState.Queued
      );
    });

    it("Should update DEVITA gov address through proposal", async () => {
      await (
        await life.connect(ownerAccount)._setPendingGov(timelock.address)
      ).wait();

      // Timelock has 14 day grace period and min delay of 24 hours
      // 10 * 24 * 60 * 60 == 10 days
      ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);

      let execute = await govAlpha
        .connect(ownerAccount)
        .execute(latestProposalId);
      await execute.wait();

      expect(await life.gov()).to.equal(timelock.address);

      // proposal should be executed
      expect(await govAlpha.state(latestProposalId)).to.equal(
        ProposalState.Executed
      );
    });

    it("Should call gov setters through proposal", async () => {
      await (await govAlpha._setPendingAdmin(timelock.address)).wait();

      const abi = new ethers.utils.AbiCoder();

      // propose with enough balance
      proposeTx = await govAlpha.connect(ownerAccount).propose(
        [
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
          govAlpha.address,
        ],
        [0, 0, 0, 0, 0, 0],
        [
          "_acceptAdmin()",
          "_setVotingDelay(uint256)",
          "_setVotingPeriod(uint256)",
          "_setApprovePercent(uint256)",
          "_setQuorumPercent(uint256)",
          "_setPendingAdmin(address)",
        ],

        [
          abi.encode([], []),
          abi.encode(["uint256"], [10]),
          abi.encode(["uint256"], [34560]),
          abi.encode(["uint256"], [200]),
          abi.encode(["uint256"], [800]),
          abi.encode(["address"], [ownerAccount.address]),
        ],
        "Call all setters"
      );
      await proposeTx.wait();

      lastTrx = proposeTx;

      // make sure latest proposal id of our proposer is correct
      // should be 1
      latestProposalId = await govAlpha.latestProposalIds(ownerAccount.address);

      // approve first
      let trx2 = await govAlpha.connect(accounts[1]).approve(latestProposalId);
      await trx2.wait();

      // wait 1 block
      ethers.provider.send("evm_mine");

      // vote
      let voteTx = await govAlpha
        .connect(accounts[1])
        .castVote(latestProposalId, true);
      await voteTx.wait();

      // wait 20 blocks so voting can end
      for (i = 0; i < votingPeriod; i++) {
        ethers.provider.send("evm_mine");
      }

      let queueTx = await govAlpha
        .connect(ownerAccount)
        .queue(latestProposalId);
      await queueTx.wait();

      // Timelock has 14 day grace period and min delay of 24 hours
      // 10 * 24 * 60 * 60 == 10 days
      ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);

      let execute = await govAlpha
        .connect(ownerAccount)
        .execute(latestProposalId);
      await execute.wait();

      expect(await govAlpha.admin()).to.equal(timelock.address);
      expect((await govAlpha.votingDelay()).toString()).to.equal("10");
      expect((await govAlpha.votingPeriod()).toString()).to.equal("34560");
      expect((await govAlpha.approvePercent()).toString()).to.equal("200");
      expect((await govAlpha.quorumPercent()).toString()).to.equal("800");
      expect(await govAlpha.pendingAdmin()).to.equal(ownerAccount.address);

      // proposal should be executed
      expect(await govAlpha.state(latestProposalId)).to.equal(
        ProposalState.Executed
      );
    });
  });
});
*/
