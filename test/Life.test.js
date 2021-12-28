const { expect, assert } = require('chai')
const { ethers } = require('hardhat')

describe('Life', () => {
  let LIFE
  let life
  let accounts
  let ownerAccount
  let userAccounts
  let mintTx
  let initTx

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    ownerAccount = accounts[0]
    userAccounts = accounts.slice(1, 14)

    // Deploy life token
    LIFE = await ethers.getContractFactory('LIFE')
    life = await LIFE.deploy()
    await life.deployed()

    // initialize life token
    initTx = await life[
      'initialize(string,string,uint8,address,uint256,uint256)'
    ](
      'LIFE Token',
      'LIFE',
      18,
      ownerAccount.address,
      ethers.utils.parseEther('100000000'),
      ethers.utils.parseEther('500000000000000000'),
    )
    await initTx.wait()

    // mint life tokens
    mintTx = await life.mint(
      ownerAccount.address,
      ethers.utils.parseEther('1000000'),
    )
    await mintTx.wait()

    let mintTx2 = await life.mint(
      userAccounts[1].address,
      ethers.utils.parseEther('1000000000'),
    )
    await mintTx2.wait()
  })

  describe('Check if initialized properly', () => {
    it('Check if balance is initialized properly', async () => {
      let balanceOwner = await life.balanceOf(ownerAccount.address)
      expect(balanceOwner.toString()).to.equal('101000000000000000000000000')

      let balanceUser1 = await life.balanceOf(userAccounts[1].address)
      expect(balanceUser1.toString()).to.equal('1000000000000000000000000000')
    })
  })

  describe('Testing Pause Functionality', () => {
    it('Only guardian or gov can pause', async () => {
      try {
        let pauseTx = await life.connect(accounts[1]).pause()
        await pauseTx.wait()
      } catch (e) {
        expect(e.message).to.match(/not guardian or governor/)
      }
    })
    it('Only guardian or gov can unpause', async () => {
      try {
        let unpauseTx = await life.connect(accounts[1]).unpause()
        await unpauseTx.wait()
      } catch (e) {
        expect(e.message).to.match(/not guardian or governor/)
      }
    })
    it('Pause minting', async () => {
      let pauseTx = await life.pause()
      await pauseTx.wait()

      try {
        // mint life tokens
        mintTx = await life.mint(
          ownerAccount.address,
          ethers.utils.parseEther('1000000'),
        )
        await mintTx.wait()
      } catch (e) {
        expect(e.message).to.match(/Pausable: paused/)
      }
    })
    it('Pause transfer', async () => {
      let pauseTx = await life.pause()
      await pauseTx.wait()

      try {
        let transferTx = await life.transfer(
          accounts[1].address,
          ethers.utils.parseEther('100'),
        )
        await transferTx.wait()
      } catch (e) {
        expect(e.message).to.match(/Pausable: paused/)
      }
    })
    it('Pause transfer from', async () => {
      let pauseTx = await life.pause()
      await pauseTx.wait()

      try {
        let transferFromTx = await life.transferFrom(
          accounts[1].address,
          ownerAccount.address,
          ethers.utils.parseEther('100'),
        )
        await transferFromTx.wait()
      } catch (e) {
        expect(e.message).to.match(/Pausable: paused/)
      }
    })
    it('Pause and unpause', async () => {
      let pauseTx = await life.pause()
      await pauseTx.wait()

      try {
        // mint life tokens
        mintTx = await life.mint(
          ownerAccount.address,
          ethers.utils.parseEther('1000000'),
        )
        await mintTx.wait()
      } catch (e) {
        expect(e.message).to.match(/Pausable: paused/)
      }

      let unpauseTx = await life.unpause()
      await unpauseTx.wait()

      // mint life tokens
      mintTx2 = await life.mint(
        ownerAccount.address,
        ethers.utils.parseEther('1000000'),
      )
      await mintTx2.wait()

      let transferTx = await life.transfer(
        accounts[1].address,
        ethers.utils.parseEther('1000000'),
      )
      await transferTx.wait()

      let balanceOwner = await life.balanceOf(ownerAccount.address)
      expect(balanceOwner.toString()).to.equal('101000000000000000000000000')
      let balance1 = await life.balanceOf(accounts[1].address)
      expect(balance1.toString()).to.equal('1000000000000000000000000')
    })
  })

  describe('Testing transfers', () => {
    it('Cannot transfer to self or zero address', async () => {
      try {
        let transferTx = await life.transfer(
          life.address,
          ethers.utils.parseEther('100'),
        )
        await transferTx.wait()
      } catch (e) {
        expect(e.message).to.match(
          /Transaction reverted without a reason string/,
        )
      }
    })
    it('Cannot transfer to self or zero address', async () => {
      try {
        let transferTx = await life.transfer(
          ethers.constants.AddressZero,
          ethers.utils.parseEther('100'),
        )
        await transferTx.wait()
      } catch (e) {
        expect(e.message).to.match(
          /Transaction reverted without a reason string/,
        )
      }
    })
    it('Transfer', async () => {
      let transferTx = await life.transfer(
        accounts[2].address,
        ethers.utils.parseEther('1000000'),
      )
      await transferTx.wait()

      let balanceOwner = await life.balanceOf(ownerAccount.address)
      expect(balanceOwner.toString()).to.equal('100000000000000000000000000')
      let balance1 = await life.balanceOf(accounts[2].address)
      expect(balance1.toString()).to.equal('1001000000000000000000000000')
    })
  })

  describe('Testing transfer from', () => {
    it('Invalid transfer', async () => {
      try {
        let transferFromTx = await life.transferFrom(
          accounts[0].address,
          life.address,
          ethers.utils.parseEther('100'),
        )
        await transferFromTx.wait()
      } catch (e) {
        expect(e.message).to.match(
          /Transaction reverted without a reason string/,
        )
      }
    })
    it('Cannot transfer from to zero address', async () => {
      try {
        let transferFromTx = await life.transferFrom(
          ethers.constants.AddressZero,
          accounts[0].address,
          ethers.utils.parseEther('100'),
        )
        await transferFromTx.wait()
      } catch (e) {
        expect(e.message).to.match(/Roles: account is the zero address/)
      }
    })
    it('Transfer and make sure votes move', async () => {
      let approveTx = await life.approve(
        accounts[2].address,
        ethers.constants.MaxUint256,
      )
      await approveTx.wait()

      let delegateTx = await life.delegate(ownerAccount.address)
      await delegateTx.wait()

      let transferTx = await life
        .connect(accounts[2])
        .transferFrom(
          accounts[0].address,
          accounts[2].address,
          ethers.utils.parseEther('1000000'),
        )
      await transferTx.wait()

      let balanceOwner = await life.balanceOf(ownerAccount.address)
      expect(balanceOwner.toString()).to.equal('100000000000000000000000000')
      let balance1 = await life.balanceOf(accounts[2].address)
      expect(balance1.toString()).to.equal('1001000000000000000000000000')

      // check votes
      let delegateeOwner = await life.delegates(ownerAccount.address)
      let delegatee2 = await life.delegates(accounts[2].address)

      expect(delegateeOwner).to.equal(ownerAccount.address)
      expect(delegatee2).to.equal(ethers.constants.AddressZero)
    })
  })

  describe('Testing Burn', () => {
    it('Burn', async () => {
      let burnTx = await life.burn(ethers.utils.parseEther('100'))
      await burnTx.wait()

      let balanceOwner = await life.balanceOf(ownerAccount.address)
      expect(balanceOwner.toString()).to.equal('100999900000000000000000000')
    })
  })

  describe('Testing Rescue', () => {
    it('Rescue should only be called by governance', async () => {
      try {
        let rescueTx = await life
          .connect(accounts[2])
          .rescueTokens(
            life.address,
            accounts[0].address,
            ethers.utils.parseEther('100'),
          )
        await rescueTx.wait()
      } catch (e) {
        expect(e.message).to.match(/only governance/)
      }
    })
    it('Rescue tokens', async () => {
      // mint life tokens
      mintTx = await life.mint(life.address, ethers.utils.parseEther('1000000'))
      await mintTx.wait()

      let rescueTx = await life.rescueTokens(
        life.address,
        accounts[0].address,
        ethers.utils.parseEther('1000000'),
      )
      await rescueTx.wait()

      let balanceOwner = await life.balanceOf(ownerAccount.address)
      expect(balanceOwner.toString()).to.equal('102000000000000000000000000')
    })
  })

  describe('Guardian Testing', () => {
    it('Set new guardian', async () => {
      let setGuardianTx = await life._setGuardian(accounts[2].address)
      await setGuardianTx.wait()

      let guardian = await life.guardian()
      expect(guardian.toString()).to.equal(accounts[2].address)
    })
    it('Can only call when not expired', async () => {
      await network.provider.send("evm_increaseTime", [78 * 7 * 24 * 60 * 60])
      try {
        let setGuardianTx = await life._setGuardian(accounts[0].address)
        await setGuardianTx.wait()
      } catch (e) {
        expect(e.message).to.match(/Transaction reverted without a reason string/)
      }
    })
  })
})
