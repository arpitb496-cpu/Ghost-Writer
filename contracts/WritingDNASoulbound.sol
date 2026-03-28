// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Writing DNA Soulbound NFT
/// @notice Non-transferable ERC721 that commits a keccak256 hash of the user's Writing DNA profile.
/// @dev Transfers and burns are disabled. One token per address; hash can be updated on-chain.
interface IERC5192 {
    event Locked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

contract WritingDNASoulbound is ERC721, IERC5192 {
    uint256 private _nextTokenId;
    mapping(address => uint256) public tokenOfOwner;
    mapping(uint256 => bytes32) public dnaHashOf;

    error SoulboundCannotTransfer();
    error SoulboundCannotBurn();
    error AlreadyMinted();
    error NoToken();

    constructor() ERC721("Writing DNA Soulbound", "WNDNA") {}

    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    function mint(bytes32 dnaHash) external {
        if (tokenOfOwner[msg.sender] != 0) revert AlreadyMinted();
        uint256 tokenId = ++_nextTokenId;
        tokenOfOwner[msg.sender] = tokenId;
        dnaHashOf[tokenId] = dnaHash;
        _safeMint(msg.sender, tokenId);
        emit Locked(tokenId);
    }

    function updateDNAHash(bytes32 newHash) external {
        uint256 tid = tokenOfOwner[msg.sender];
        if (tid == 0) revert NoToken();
        dnaHashOf[tid] = newHash;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return "";
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundCannotTransfer();
        if (from != address(0) && to == address(0)) revert SoulboundCannotBurn();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }
}
