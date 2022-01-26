pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DevitaId is ERC1155, AccessControl {
  uint256 public currentTokenId = 0;
  address public tokenUser;
  uint256 public chainId;
  bool public initialized;
  bool public isMintable;

  constructor() ERC1155("") {}

  function initialize(
    address sender,
    address owner,
    string memory newuri,
    uint256 _chainId
  ) public {
    require(!initialized, "DevitaId can only be initialized once");
    _setupRole(DEFAULT_ADMIN_ROLE, owner);
    _setURI(newuri);
    tokenUser = sender;
    chainId = _chainId;
    isMintable = true;
    initialized = true;
  }

  modifier isInitialized() {
    require(initialized, "can only be called after initialization");
    _;
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC1155, AccessControl)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function burn() public isInitialized onlyRole(DEFAULT_ADMIN_ROLE) {
    _burn(tokenUser, currentTokenId, balanceOf(tokenUser, currentTokenId));
    isMintable = true;
  }

  function safeTransferFrom(
    address,
    address,
    uint256,
    uint256,
    bytes memory
  ) public pure override(ERC1155) {
    require(false, "can't transfer id");
  }

  function safeBatchTransferFrom(
    address,
    address,
    uint256[] memory,
    uint256[] memory,
    bytes memory
  ) public pure override(ERC1155) {
    require(false, "can't transfer id");
  }

  function mint(bytes memory data, address recipient)
    public
    isInitialized
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    require(isMintable, "token must be burnt first before it can be reminted");
    tokenUser = recipient;
    currentTokenId += 1;
    _mint(tokenUser, currentTokenId, 1, data);
    isMintable = false;
  }

  function mintNew(bytes memory data, address recipient)
    public
    isInitialized
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    burn();
    mint(data, recipient);
  }
}
