pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

// Contracts
import "./InitializeableDynamicProxy.sol";

/**
    @notice It is a dynamic proxy contract for any contract. It uses the logic versions registry to get a logic contract address.
    @notice It extends BaseUpgradeable to get access to the settings.

    @author develop@teller.finance
 */
contract DynamicProxy is InitializeableDynamicProxy {
    /**
        @notice It creates a new dynamic proxy given a logic registry contract and a logic name.
        @param logicRegistryAddress the settings contract address.
        @param aLogicName the settings contract address.
     */
    constructor(address logicRegistryAddress, bytes32 aLogicName) public {
        _initialize(logicRegistryAddress, aLogicName);
    }
}
