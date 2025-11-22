// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IZKVerifier} from "./interfaces/IZKVerifier.sol";

/// @title GroupAccessControl
/// @notice Smart contract that validates ZK proofs for group access based on WLD token balance
/// @dev Uses Zero-Knowledge proofs to verify users have minimum WLD balance without revealing actual balance
contract GroupAccessControl is Ownable {
    /// @notice The ZK verifier contract that validates proofs
    IZKVerifier public immutable verifier;

    /// @notice Mapping of user address => nonce => used status (prevents replay attacks)
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    /// @notice Mapping of groupId => minimum WLD threshold required (in wei, 18 decimals)
    mapping(bytes32 => uint256) public groupThresholds;

    /// @notice Mapping of user address => groupId => access granted status
    mapping(address => mapping(bytes32 => bool)) public hasAccess;

    /// @notice Emitted when a user successfully verifies their proof and gains access
    /// @param user The address of the user who verified
    /// @param groupId The group identifier
    /// @param threshold The minimum WLD threshold required
    /// @param nonce The nonce used for this verification
    event AccessGranted(
        address indexed user,
        bytes32 indexed groupId,
        uint256 threshold,
        uint256 nonce
    );

    /// @notice Emitted when a group threshold is set
    /// @param groupId The group identifier
    /// @param threshold The minimum WLD threshold required (in wei)
    /// @param setBy The address that set the threshold
    event GroupThresholdSet(
        bytes32 indexed groupId,
        uint256 threshold,
        address indexed setBy
    );

    /// @notice Emitted when access is revoked from a user
    /// @param user The address of the user
    /// @param groupId The group identifier
    /// @param revokedBy The address that revoked the access
    event AccessRevoked(
        address indexed user,
        bytes32 indexed groupId,
        address indexed revokedBy
    );

    /// @notice Initialize the GroupAccessControl contract
    /// @param _verifier The address of the ZK verifier contract
    constructor(address _verifier) Ownable(msg.sender) {
        require(_verifier != address(0), "GroupAccessControl: invalid verifier address");
        verifier = IZKVerifier(_verifier);
    }

    /// @notice Set the minimum WLD threshold for a group
    /// @param groupId The group identifier
    /// @param threshold The minimum WLD required (in wei, 18 decimals)
    /// @dev Only owner can set thresholds
    function setGroupThreshold(bytes32 groupId, uint256 threshold) external onlyOwner {
        groupThresholds[groupId] = threshold;
        emit GroupThresholdSet(groupId, threshold, msg.sender);
    }

    /// @notice Batch set thresholds for multiple groups
    /// @param groupIds Array of group identifiers
    /// @param thresholds Array of minimum WLD thresholds (in wei)
    /// @dev Only owner can set thresholds
    function setGroupThresholdsBatch(
        bytes32[] calldata groupIds,
        uint256[] calldata thresholds
    ) external onlyOwner {
        require(
            groupIds.length == thresholds.length,
            "GroupAccessControl: arrays length mismatch"
        );

        for (uint256 i = 0; i < groupIds.length; ) {
            groupThresholds[groupIds[i]] = thresholds[i];
            emit GroupThresholdSet(groupIds[i], thresholds[i], msg.sender);

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Verify ZK proof and grant access to a group
    /// @param groupId The group identifier
    /// @param threshold The minimum WLD threshold being proved (must match group threshold)
    /// @param nonce The nonce used for this proof (prevents replay attacks)
    /// @param proof The serialized ZK proof bytes
    /// @param publicInputs The public inputs to the circuit (must contain threshold as Field)
    /// @dev The publicInputs should contain the threshold value that was used in the proof
    /// @dev The nonce must not have been used before by this user
    function verifyProofAndGrantAccess(
        bytes32 groupId,
        uint256 threshold,
        uint256 nonce,
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external {
        address user = msg.sender;

        // Validate group exists and threshold matches
        uint256 requiredThreshold = groupThresholds[groupId];
        require(requiredThreshold > 0, "GroupAccessControl: group does not exist");
        require(
            threshold >= requiredThreshold,
            "GroupAccessControl: threshold below group requirement"
        );

        // Prevent replay attacks
        require(!usedNonces[user][nonce], "GroupAccessControl: nonce already used");

        // Verify that publicInputs contain the threshold
        require(
            publicInputs.length > 0,
            "GroupAccessControl: invalid public inputs"
        );
        
        // The public input should be the threshold (converted to Field)
        // In Noir, the public output is threshold as Field
        // The circuit returns threshold as Field, which we compare directly
        uint256 publicThreshold = publicInputs[0];
        
        // The public threshold must match the provided threshold
        // Since we scale by 1e18 in the frontend, we need to account for that
        // The circuit receives thresholdScaled (threshold * 1e18) and balanceScaled (balance * 1e18)
        // The public output is the threshold (as Field), which will be the scaled value
        require(
            publicThreshold == threshold,
            "GroupAccessControl: public input threshold mismatch"
        );

        // Verify the ZK proof
        bool isValid = verifier.verify(proof, publicInputs);
        require(isValid, "GroupAccessControl: invalid proof");

        // Mark nonce as used
        usedNonces[user][nonce] = true;

        // Grant access
        hasAccess[user][groupId] = true;

        emit AccessGranted(user, groupId, threshold, nonce);
    }

    /// @notice Revoke access from a user for a specific group
    /// @param user The address of the user
    /// @param groupId The group identifier
    /// @dev Only owner can revoke access
    function revokeAccess(address user, bytes32 groupId) external onlyOwner {
        require(hasAccess[user][groupId], "GroupAccessControl: user does not have access");
        hasAccess[user][groupId] = false;
        emit AccessRevoked(user, groupId, msg.sender);
    }

    /// @notice Check if a user has access to a group
    /// @param user The address of the user
    /// @param groupId The group identifier
    /// @return Whether the user has access
    function checkAccess(address user, bytes32 groupId) external view returns (bool) {
        return hasAccess[user][groupId];
    }

    /// @notice Get the threshold required for a group
    /// @param groupId The group identifier
    /// @return The minimum WLD threshold required (in wei)
    function getGroupThreshold(bytes32 groupId) external view returns (uint256) {
        return groupThresholds[groupId];
    }

    /// @notice Check if a nonce has been used by a user
    /// @param user The address of the user
    /// @param nonce The nonce to check
    /// @return Whether the nonce has been used
    function isNonceUsed(address user, uint256 nonce) external view returns (bool) {
        return usedNonces[user][nonce];
    }
}

