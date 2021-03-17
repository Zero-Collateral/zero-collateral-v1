pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

// Commons and Libraries
import "@openzeppelin/contracts-ethereum-package/contracts/utils/Address.sol";
import "../util/AddressLib.sol";
import "../util/LogicVersionLib.sol";
import "../util/LogicVersionsConsts.sol";
import "../util/TellerCommon.sol";

// Interfaces
import "../interfaces/LogicVersionsRegistryInterface.sol";
import "../interfaces/IBaseProxy.sol";
import "../interfaces/SettingsInterface.sol";

/**
    @notice It manages all the logic contract versions, mapping each one to a logic name (or key).
    @author develop@teller.finance
 */
contract LogicVersionsRegistry is LogicVersionsRegistryInterface {
    using LogicVersionLib for LogicVersionLib.LogicVersion;
    using Address for address;

    /* State Variables */

    /**
     * @notice It is the only address that may make changes in the contract.
     */
    address public owner;

    /**
     * @notice It represents the logic names for the DynamicProxy contracts.
     */
    LogicVersionsConsts public consts;

    /**
        @notice It represents a mapping to identify a logic name (key) and the current logic address and version.

        i.e.:
            bytes32("EtherCollateralLoans") => { logic: "0x123...789", version: 1 }.
            bytes32("LendingPool") => { logic: "0x456...987", version: 3 }.
     */
    mapping(bytes32 => LogicVersionLib.LogicVersion) internal logicVersions;

    /** Modifiers */

    /**
     * @notice It checks that the sender is the owner address.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    /** External Functions */
    /**
        @notice It creates multiple logic versions.
        @param newLogicVersions lists of the new logic versions to create.
     */
    function createLogicVersions(
        TellerCommon.LogicVersionRequest[] calldata newLogicVersions
    ) external onlyOwner {
        _createLogicVersions(newLogicVersions);
    }

    /**
        @notice It update a current logic address given a logic name.
        @param logicName logic name to update.
        @param newLogic the new logic address to set.
     */
    function updateLogicAddress(bytes32 logicName, address newLogic)
        external
        onlyOwner
    {
        (address oldLogic, uint256 oldVersion, uint256 newVersion) =
            logicVersions[logicName].update(newLogic);

        emit LogicVersionUpdated(
            logicName,
            msg.sender,
            oldLogic,
            newLogic,
            oldVersion,
            newVersion
        );
    }

    /**
        @notice It rollbacks a logic to a previous version.
        @param logicName logic name to rollback.
        @param previousVersion the previous version to be used.
     */
    function rollbackLogicVersion(bytes32 logicName, uint256 previousVersion)
        external
        onlyOwner
    {
        (uint256 currentVersion, address previousLogic, address newLogic) =
            logicVersions[logicName].rollback(previousVersion);

        emit LogicVersionRollbacked(
            logicName,
            msg.sender,
            previousLogic,
            newLogic,
            currentVersion,
            previousVersion
        );
    }

    /**
        @notice Transfers ownership of the contract to a new account (`newOwner`).
        @dev Can only be called by the current owner.
        @param newOwner The address that should be the new owner.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    /**
        @notice It gets the current logic version for a given logic name.
        @param logicName to get.
        @return the current logic version.
     */
    function getLogicVersion(bytes32 logicName)
        external
        view
        returns (
            uint256 currentVersion,
            uint256 latestVersion,
            address logic
        )
    {
        LogicVersionLib.LogicVersion storage logicVersion =
            logicVersions[logicName];

        currentVersion = logicVersion.currentVersion;
        latestVersion = logicVersion.latestVersion;
        logic = logicVersion.logicVersions[currentVersion];
    }

    /**
        @notice It tests whether a logic name is already configured.
        @param logicName logic name to test.
        @return true if the logic version is already configured. Otherwise it returns false.
     */
    function hasLogicVersion(bytes32 logicName) external view returns (bool) {
        return logicVersions[logicName].exists;
    }

    /**
        @notice It initializes this logic versions constants.
        @param aOwner address of the owner of the registry.
        @param initialLogicVersions lists of the new logic versions to create.
     */
    function initialize(
        address aOwner,
        TellerCommon.LogicVersionRequest[] calldata initialLogicVersions
    ) external {
        require(owner == address(0), "ALREADY_INIT");
        owner = aOwner;
        consts = new LogicVersionsConsts();
        _createLogicVersions(initialLogicVersions);
    }

    /** Internal functions */
    /**
        @notice It creates a new logic version given a logic name and address.
        @param logicName logic name to create.
        @param logic the logic address value for the given logic name.
     */
    function _createLogicVersion(bytes32 logicName, address logic) internal {
        require(logicName != "", "LOGIC_NAME_MUST_BE_PROVIDED");
        logicVersions[logicName].initialize(logic);

        emit LogicVersionCreated(logicName, msg.sender, logic, 0);
    }

    /**
        @notice It creates multiple logic versions.
        @param logicVersions lists of the logic versions to create.
     */
    function _createLogicVersions(
        TellerCommon.LogicVersionRequest[] memory logicVersions
    ) internal {
        for (uint256 index; index < logicVersions.length; index++) {
            _createLogicVersion(
                logicVersions[index].logicName,
                logicVersions[index].logic
            );
        }
    }
}
