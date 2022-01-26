pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract DevitaIdStorage is AccessControl {
  mapping(address => address) private userTokenId;

  constructor(address owner) {
    _setupRole(DEFAULT_ADMIN_ROLE, owner);
  }

  function readUserTokenId(address user)
    public
    view
    onlyRole(DEFAULT_ADMIN_ROLE)
    returns (address)
  {
    return userTokenId[user];
  }

  function addUserTokenId(address user, address tokenId)
    public
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    require(tokenId != address(0), "tokenId cannot be 0 address");
    userTokenId[user] = tokenId;
  }

  function removeUserTokenId(address user) public onlyRole(DEFAULT_ADMIN_ROLE) {
    userTokenId[user] = address(0);
  }
}
