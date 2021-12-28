require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

const data = require("./secrets.json");
const INFURA_API_KEY = data.INFURA_API_KEY;
const ROPSTEN_PRIVATE_KEY = data.ROPSTEN_PRIVATE_KEY;
const ETHERSCAN_KEY = data.ETHERSCAN_KEY;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  //defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      gasPrice: 878000000,
      mining: {
        auto: true,
        interval: 0,
      },
      blockGasLimit: 12000000,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [`${ROPSTEN_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
};
