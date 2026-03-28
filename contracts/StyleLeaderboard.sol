// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title GhostWriter Style Leaderboard (Monad)
/// @notice Anonymous registry: wallet + DNA hash + coarse style + training word count + activity.
/// @dev No prose, samples, or names — only public commitments suitable for a leaderboard.
contract StyleLeaderboard {
    struct StyleEntry {
        bytes32 dnaHash;
        /// @dev 0 = casual, 1 = professional, 2 = academic
        uint8 formality;
        /// @dev Words analyzed when building the profile (aggregate stat only).
        uint32 wordCount;
        uint64 lastPublishedAt;
        /// @dev Incremented on each publish — primary “most active” score.
        uint32 publishCount;
    }

    mapping(address => StyleEntry) public entries;
    address[] private _participants;
    mapping(address => bool) private _registered;

    error InvalidFormality();
    error ZeroWordCount();

    event StylePublished(
        address indexed wallet,
        bytes32 indexed dnaHash,
        uint8 formality,
        uint32 wordCount,
        uint32 publishCount
    );

    function publish(bytes32 dnaHash, uint8 formality, uint32 wordCount) external {
        if (formality > 2) revert InvalidFormality();
        if (wordCount == 0) revert ZeroWordCount();

        if (!_registered[msg.sender]) {
            _registered[msg.sender] = true;
            _participants.push(msg.sender);
        }

        StyleEntry storage e = entries[msg.sender];
        e.dnaHash = dnaHash;
        e.formality = formality;
        e.wordCount = wordCount;
        e.lastPublishedAt = uint64(block.timestamp);
        e.publishCount += 1;

        emit StylePublished(msg.sender, dnaHash, formality, wordCount, e.publishCount);
    }

    function participantCount() external view returns (uint256) {
        return _participants.length;
    }

    function participantAt(uint256 index) external view returns (address) {
        return _participants[index];
    }
}
