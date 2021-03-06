// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // deploy LIFE.sol
  const Life = await hre.ethers.getContractFactory("LIFE");
  const life = await Life.deploy();
  await life.deployed();
  console.log("Life deployed to:", life.address);

  // deploy TimeLock.sol
  const TimeLock = await hre.ethers.getContractFactory("TimeLock");
  const timeLock = await TimeLock.deploy();
  await timeLock.deployed();
  console.log("TimeLock deployed to:", timeLock.address);

  // deploy GovernorAlpha.sol
  const GovernorAlpha = await hre.ethers.getContractFactory("DEVITAGovernor");
  const governorAlpha = await hre.upgrades.deployProxy(GovernorAlpha, [
    timeLock.address,
    life.address,
  ]);
  await governorAlpha.deployed();
  console.log("DEVITAGovernor proxy deployed to:", governorAlpha.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
