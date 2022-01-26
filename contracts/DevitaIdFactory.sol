pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./DevitaId.sol";
import "./DevitaIdStorage.sol";

contract DevitaIdFactory {
  address public devitaIdMaster;
  mapping(address => bool) public hasMinted;
  address private owner;
  address private devitaIdStorage;

  event DevitaIdCreated(address indexed newAddress);

  constructor(
    address _master,
    address _owner,
    address idStorage
  ) {
    devitaIdMaster = _master;
    owner = _owner;
    devitaIdStorage = idStorage;
  }

  function createToken(bytes32 salt, uint256 chainId) external {
    require(
      !hasMinted[msg.sender],
      "DevitaId contract can only be minted once"
    );
    address newToken = Clones.cloneDeterministic(devitaIdMaster, salt);
    DevitaId(newToken).initialize(
      msg.sender,
      owner,
      "https://devita.com/api/id/{id}.json",
      chainId
    );
    emit DevitaIdCreated(newToken);
    hasMinted[msg.sender] = true;
    DevitaIdStorage(devitaIdStorage).addUserTokenId(msg.sender, newToken);
  }

  function getTokenAddress(bytes32 salt) external view returns (address) {
    return Clones.predictDeterministicAddress(devitaIdMaster, salt);
  }
}
