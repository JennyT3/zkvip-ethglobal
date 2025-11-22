// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "lib/forge-std/src/Test.sol";
import {GroupAccessControl} from "../src/GroupAccessControl.sol";
import {MockZKVerifier} from "../src/mocks/MockZKVerifier.sol";
import {StrictMockZKVerifier} from "../src/mocks/MockZKVerifier.sol";

contract GroupAccessControlTest is Test {
    GroupAccessControl public groupAccessControl;
    MockZKVerifier public verifier;

    address public user = address(0x1);
    address public owner = address(this);
    bytes32 public constant GROUP_ID = keccak256("VIP_BUILDERS");
    uint256 public constant GROUP_THRESHOLD = 1e18; // 1 WLD (with 18 decimals)

    function setUp() public {
        // Deploy mock verifier
        verifier = new MockZKVerifier();

        // Deploy GroupAccessControl
        groupAccessControl = new GroupAccessControl(address(verifier));

        // Set group threshold
        groupAccessControl.setGroupThreshold(GROUP_ID, GROUP_THRESHOLD);
    }

    function test_SetGroupThreshold() public {
        bytes32 newGroupId = keccak256("NEW_GROUP");
        uint256 newThreshold = 2e18;

        groupAccessControl.setGroupThreshold(newGroupId, newThreshold);

        assertEq(groupAccessControl.getGroupThreshold(newGroupId), newThreshold);
    }

    function test_SetGroupThresholdsBatch() public {
        bytes32[] memory groupIds = new bytes32[](2);
        groupIds[0] = keccak256("GROUP_1");
        groupIds[1] = keccak256("GROUP_2");

        uint256[] memory thresholds = new uint256[](2);
        thresholds[0] = 1e18;
        thresholds[1] = 2e18;

        groupAccessControl.setGroupThresholdsBatch(groupIds, thresholds);

        assertEq(groupAccessControl.getGroupThreshold(groupIds[0]), thresholds[0]);
        assertEq(groupAccessControl.getGroupThreshold(groupIds[1]), thresholds[1]);
    }

    function test_VerifyProofAndGrantAccess() public {
        uint256 nonce = 12345;
        uint256 threshold = GROUP_THRESHOLD;
        
        // Mock proof and public inputs
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = threshold;

        // Verify proof and grant access
        vm.prank(user);
        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );

        // Check access was granted
        assertTrue(groupAccessControl.hasAccess(user, GROUP_ID));
        assertTrue(groupAccessControl.isNonceUsed(user, nonce));
    }

    function test_VerifyProofFailsIfNonceReused() public {
        uint256 nonce = 12345;
        uint256 threshold = GROUP_THRESHOLD;
        
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = threshold;

        // First verification succeeds
        vm.prank(user);
        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );

        // Second verification with same nonce should fail
        vm.prank(user);
        vm.expectRevert("GroupAccessControl: nonce already used");
        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );
    }

    function test_VerifyProofFailsIfThresholdBelowRequirement() public {
        uint256 nonce = 12346;
        uint256 threshold = GROUP_THRESHOLD - 1; // Below requirement
        
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = threshold;

        vm.prank(user);
        vm.expectRevert("GroupAccessControl: threshold below group requirement");
        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );
    }

    function test_VerifyProofFailsIfGroupDoesNotExist() public {
        bytes32 nonExistentGroup = keccak256("NON_EXISTENT");
        uint256 nonce = 12347;
        uint256 threshold = 1e18;
        
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = threshold;

        vm.prank(user);
        vm.expectRevert("GroupAccessControl: group does not exist");
        groupAccessControl.verifyProofAndGrantAccess(
            nonExistentGroup,
            threshold,
            nonce,
            proof,
            publicInputs
        );
    }

    function test_VerifyProofFailsIfPublicInputMismatch() public {
        uint256 nonce = 12348;
        uint256 threshold = GROUP_THRESHOLD;
        uint256 wrongPublicInput = GROUP_THRESHOLD + 1;
        
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = wrongPublicInput;

        vm.prank(user);
        vm.expectRevert("GroupAccessControl: public input threshold mismatch");
        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );
    }

    function test_RevokeAccess() public {
        uint256 nonce = 12349;
        uint256 threshold = GROUP_THRESHOLD;
        
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = threshold;

        // Grant access first
        vm.prank(user);
        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );

        assertTrue(groupAccessControl.hasAccess(user, GROUP_ID));

        // Revoke access
        groupAccessControl.revokeAccess(user, GROUP_ID);

        assertFalse(groupAccessControl.hasAccess(user, GROUP_ID));
    }

    function test_RevokeAccessFailsIfUserDoesNotHaveAccess() public {
        vm.expectRevert("GroupAccessControl: user does not have access");
        groupAccessControl.revokeAccess(user, GROUP_ID);
    }

    function test_CheckAccess() public {
        uint256 nonce = 12350;
        uint256 threshold = GROUP_THRESHOLD;
        
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = threshold;

        // Initially no access
        assertFalse(groupAccessControl.checkAccess(user, GROUP_ID));

        // Grant access
        vm.prank(user);
        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );

        // Now has access
        assertTrue(groupAccessControl.checkAccess(user, GROUP_ID));
    }

    function test_EventEmittedOnAccessGranted() public {
        uint256 nonce = 12351;
        uint256 threshold = GROUP_THRESHOLD;
        
        bytes memory proof = abi.encodePacked("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = threshold;

        vm.prank(user);
        vm.expectEmit(true, true, false, false);
        emit GroupAccessControl.AccessGranted(user, GROUP_ID, threshold, nonce);

        groupAccessControl.verifyProofAndGrantAccess(
            GROUP_ID,
            threshold,
            nonce,
            proof,
            publicInputs
        );
    }

    function test_EventEmittedOnGroupThresholdSet() public {
        bytes32 newGroupId = keccak256("NEW_GROUP");
        uint256 newThreshold = 5e18;

        vm.expectEmit(true, true, false, false);
        emit GroupAccessControl.GroupThresholdSet(newGroupId, newThreshold, owner);

        groupAccessControl.setGroupThreshold(newGroupId, newThreshold);
    }

    function test_MultipleGroupsDifferentThresholds() public {
        bytes32 group1 = keccak256("GROUP_1");
        bytes32 group2 = keccak256("GROUP_2");
        bytes32 group3 = keccak256("GROUP_3");

        groupAccessControl.setGroupThreshold(group1, 1e18);
        groupAccessControl.setGroupThreshold(group2, 2e18);
        groupAccessControl.setGroupThreshold(group3, 5e18);

        assertEq(groupAccessControl.getGroupThreshold(group1), 1e18);
        assertEq(groupAccessControl.getGroupThreshold(group2), 2e18);
        assertEq(groupAccessControl.getGroupThreshold(group3), 5e18);
    }

    function test_UserCanJoinMultipleGroups() public {
        bytes32 group1 = keccak256("GROUP_1");
        bytes32 group2 = keccak256("GROUP_2");

        groupAccessControl.setGroupThreshold(group1, 1e18);
        groupAccessControl.setGroupThreshold(group2, 1e18);

        uint256 nonce1 = 12352;
        uint256 nonce2 = 12353;
        
        bytes memory proof1 = abi.encodePacked("mock_proof_1");
        bytes memory proof2 = abi.encodePacked("mock_proof_2");
        
        uint256[] memory publicInputs1 = new uint256[](1);
        publicInputs1[0] = 1e18;
        
        uint256[] memory publicInputs2 = new uint256[](1);
        publicInputs2[0] = 1e18;

        // Join group 1
        vm.prank(user);
        groupAccessControl.verifyProofAndGrantAccess(
            group1,
            1e18,
            nonce1,
            proof1,
            publicInputs1
        );

        // Join group 2
        vm.prank(user);
        groupAccessControl.verifyProofAndGrantAccess(
            group2,
            1e18,
            nonce2,
            proof2,
            publicInputs2
        );

        assertTrue(groupAccessControl.hasAccess(user, group1));
        assertTrue(groupAccessControl.hasAccess(user, group2));
    }
}

