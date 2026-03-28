// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {StyleLeaderboard} from "./StyleLeaderboard.sol";
import {Test} from "forge-std/Test.sol";

contract StyleLeaderboardTest is Test {
    StyleLeaderboard internal lb;
    address internal a = address(0xA11CE);
    address internal b = address(0xB0B);

    function setUp() public {
        lb = new StyleLeaderboard();
    }

    function test_PublishAndCount() public {
        vm.prank(a);
        lb.publish(keccak256("dna1"), 1, 1200);
        assertEq(lb.participantCount(), 1);
        assertEq(lb.participantAt(0), a);
        (bytes32 h, uint8 f, uint32 w, uint64 t, uint32 p) = lb.entries(a);
        assertEq(h, keccak256("dna1"));
        assertEq(f, 1);
        assertEq(w, 1200);
        assertGt(t, 0);
        assertEq(p, 1);
    }

    function test_ActivityRankPublishing() public {
        vm.prank(a);
        lb.publish(keccak256("a"), 0, 500);
        vm.prank(a);
        lb.publish(keccak256("a2"), 0, 600);
        vm.prank(b);
        lb.publish(keccak256("b"), 2, 9000);

        (, , , , uint32 pa) = lb.entries(a);
        (, , , , uint32 pb) = lb.entries(b);
        assertEq(pa, 2);
        assertEq(pb, 1);
    }

    function test_RevertBadFormality() public {
        vm.prank(a);
        vm.expectRevert(StyleLeaderboard.InvalidFormality.selector);
        lb.publish(keccak256("x"), 3, 100);
    }

    function test_RevertZeroWords() public {
        vm.prank(a);
        vm.expectRevert(StyleLeaderboard.ZeroWordCount.selector);
        lb.publish(keccak256("x"), 0, 0);
    }
}
