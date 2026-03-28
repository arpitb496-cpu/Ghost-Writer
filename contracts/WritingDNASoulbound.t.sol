// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {WritingDNASoulbound} from "./WritingDNASoulbound.sol";
import {Test} from "forge-std/Test.sol";

contract WritingDNASoulboundTest is Test {
    WritingDNASoulbound internal sbt;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        sbt = new WritingDNASoulbound();
    }

    function test_MintSetsHashAndOwner() public {
        bytes32 h = keccak256("dna-v1");
        vm.prank(alice);
        sbt.mint(h);

        assertEq(sbt.tokenOfOwner(alice), 1);
        assertEq(sbt.dnaHashOf(1), h);
        assertEq(sbt.ownerOf(1), alice);
        assertTrue(sbt.locked(1));
    }

    function test_RevertMintTwice() public {
        vm.startPrank(alice);
        sbt.mint(keccak256("a"));
        vm.expectRevert(WritingDNASoulbound.AlreadyMinted.selector);
        sbt.mint(keccak256("b"));
        vm.stopPrank();
    }

    function test_UpdateDNAHash() public {
        bytes32 h1 = keccak256("one");
        bytes32 h2 = keccak256("two");
        vm.prank(alice);
        sbt.mint(h1);
        vm.prank(alice);
        sbt.updateDNAHash(h2);
        assertEq(sbt.dnaHashOf(1), h2);
    }

    function test_RevertTransfer() public {
        vm.prank(alice);
        sbt.mint(keccak256("x"));
        vm.prank(alice);
        vm.expectRevert(WritingDNASoulbound.SoulboundCannotTransfer.selector);
        sbt.transferFrom(alice, bob, 1);
    }
}
