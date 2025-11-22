// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "lib/forge-std/src/Script.sol";
import {GroupAccessControl} from "../src/GroupAccessControl.sol";
import {MockZKVerifier} from "../src/mocks/MockZKVerifier.sol";
import {StrictMockZKVerifier} from "../src/mocks/MockZKVerifier.sol";

/// @title DeployGroupAccessControl
/// @notice Script to deploy GroupAccessControl with mock verifier (for testing)
contract DeployGroupAccessControl is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy mock verifier (for testing - replace with actual Noir verifier in production)
        MockZKVerifier verifier = new MockZKVerifier();

        // Deploy GroupAccessControl
        GroupAccessControl groupAccessControl = new GroupAccessControl(address(verifier));

        console.log("MockZKVerifier deployed at:", address(verifier));
        console.log("GroupAccessControl deployed at:", address(groupAccessControl));

        vm.stopBroadcast();
    }
}

/// @title DeployWithStrictVerifier
/// @notice Script to deploy GroupAccessControl with strict mock verifier (for testing)
contract DeployWithStrictVerifier is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy strict mock verifier (for testing - replace with actual Noir verifier in production)
        StrictMockZKVerifier verifier = new StrictMockZKVerifier();

        // Deploy GroupAccessControl
        GroupAccessControl groupAccessControl = new GroupAccessControl(address(verifier));

        console.log("StrictMockZKVerifier deployed at:", address(verifier));
        console.log("GroupAccessControl deployed at:", address(groupAccessControl));

        vm.stopBroadcast();
    }
}

/// @title DeployWithRealVerifier
/// @notice Script to deploy GroupAccessControl with actual Noir verifier
/// @dev Update the verifier address with the actual deployed verifier contract from Noir
contract DeployWithRealVerifier is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // TODO: Replace with actual Noir verifier contract address
        // To generate the verifier from your Noir circuit:
        // 1. Compile your circuit: nargo compile
        // 2. Generate verifier: nargo codegen-verifier
        // 3. Deploy the generated verifier contract
        // 4. Use that address here
        address verifierAddress = vm.envAddress("ZK_VERIFIER_ADDRESS");
        require(verifierAddress != address(0), "DeployWithRealVerifier: ZK_VERIFIER_ADDRESS not set");

        // Deploy GroupAccessControl
        GroupAccessControl groupAccessControl = new GroupAccessControl(verifierAddress);

        console.log("Using ZK Verifier at:", verifierAddress);
        console.log("GroupAccessControl deployed at:", address(groupAccessControl));

        vm.stopBroadcast();
    }
}

