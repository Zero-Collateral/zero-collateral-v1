pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

import "../util/AssetSettingsLib.sol";
import "../util/PlatformSettingsLib.sol";
import "./EscrowFactoryInterface.sol";

/**
    @notice This interface defines all function to manage the platform configuration.

    @author develop@teller.finance
 */
interface SettingsInterface {
    /**
        @notice This event is emitted when a new platform setting is created.
        @param settingName new setting name.
        @param sender address that created it.
        @param value value for the new setting.
     */
    event PlatformSettingCreated(
        bytes32 indexed settingName,
        address indexed sender,
        uint256 value,
        uint256 minValue,
        uint256 maxValue
    );

    /**
        @notice This event is emitted when a current platform setting is removed.
        @param settingName setting name removed.
        @param sender address that removed it.
     */
    event PlatformSettingRemoved(
        bytes32 indexed settingName,
        uint256 lastValue,
        address indexed sender
    );

    /**
        @notice This event is emitted when a platform setting is updated.
        @param settingName settings name updated.
        @param sender address that updated it.
        @param oldValue old value for the setting.
        @param newValue new value for the setting.
     */
    event PlatformSettingUpdated(
        bytes32 indexed settingName,
        address indexed sender,
        uint256 oldValue,
        uint256 newValue
    );

    /**
        @notice This event is emitted when a lending pool is paused.
        @param account address that paused the lending pool.
        @param lendingPoolAddress lending pool address which was paused.
     */
    event LendingPoolPaused(address indexed account, address indexed lendingPoolAddress);

    /**
        @notice This event is emitted when a lending pool is unpaused.
        @param account address that paused the lending pool.
        @param lendingPoolAddress lending pool address which was unpaused.
     */
    event LendingPoolUnpaused(
        address indexed account,
        address indexed lendingPoolAddress
    );

    /**
        @notice This event is emitted when an new asset settings is created.
        @param sender the transaction sender address.
        @param assetAddress the asset address used to create the settings.
        @param cTokenAddress cToken address to configure for the asset.
        @param maxLoanAmount max loan amount to configure for the asset.
     */
    event AssetSettingsCreated(
        address indexed sender,
        address indexed assetAddress,
        address cTokenAddress,
        uint256 maxLoanAmount
    );

    /**
        @notice This event is emitted when an asset settings is removed.
        @param sender the transaction sender address.
        @param assetAddress the asset address used to remove the settings.
     */
    event AssetSettingsRemoved(address indexed sender, address indexed assetAddress);

    /**
        @notice This event is emitted when an asset settings (address type) is updated.
        @param assetSettingName asset setting name updated.
        @param sender the transaction sender address.
        @param assetAddress the asset address used to update the asset settings.
        @param oldValue old value used for the asset setting.
        @param newValue the value updated.
     */
    event AssetSettingsAddressUpdated(
        bytes32 indexed assetSettingName,
        address indexed sender,
        address indexed assetAddress,
        address oldValue,
        address newValue
    );

    /**
        @notice This event is emitted when an asset settings (uint256 type) is updated.
        @param assetSettingName asset setting name updated.
        @param sender the transaction sender address.
        @param assetAddress the asset address used to update the asset settings.
        @param oldValue old value used for the asset setting.
        @param newValue the value updated.
     */
    event AssetSettingsUintUpdated(
        bytes32 indexed assetSettingName,
        address indexed sender,
        address indexed assetAddress,
        uint256 oldValue,
        uint256 newValue
    );

    /**
        @notice This event is emitted when the escrow factory is updated.
        @param sender the transaction sender address.
        @param oldValue the old value used for the escrow factory address.
        @param newValue the value updated.
     */
    event EscrowFactoryUpdated(
        address indexed sender,
        address oldValue,
        address newValue
    );

    /**
        @notice It creates a new platform setting given a setting name, value, min and max values.
        @param settingName setting name to create.
        @param value the initial value for the given setting name.
        @param minValue the min value for the setting.
        @param maxValue the max value for the setting.
     */
    function createPlatformSetting(
        bytes32 settingName,
        uint256 value,
        uint256 minValue,
        uint256 maxValue
    ) external;

    /**
        @notice It updates an existent platform setting given a setting name.
        @notice It only allows to update the value (not the min or max values).
        @notice In case you need to update the min or max values, you need to remove it, and create it again.
        @param settingName setting name to update.
        @param newValue the new value to set.
     */
    function updatePlatformSetting(bytes32 settingName, uint256 newValue) external;

    /**
        @notice Removes a current platform setting given a setting name.
        @param settingName to remove.
     */
    function removePlatformSetting(bytes32 settingName) external;

    /**
        @notice It gets the current platform setting for a given setting name
        @param settingName to get.
        @return the current platform setting.
     */
    function getPlatformSetting(bytes32 settingName)
        external
        view
        returns (PlatformSettingsLib.PlatformSetting memory);

    /**
        @notice It gets the current platform setting value for a given setting name
        @param settingName to get.
        @return the current platform setting value.
     */
    function getPlatformSettingValue(bytes32 settingName) external view returns (uint256);

    /**
        @notice It tests whether a setting name is already configured.
        @param settingName setting name to test.
        @return true if the setting is already configured. Otherwise it returns false.
     */
    function hasPlatformSetting(bytes32 settingName) external view returns (bool);

    /**
        @notice It gets whether the platform is paused or not.
        @return true if platform is paused. Otherwise it returns false.
     */
    function isPaused() external view returns (bool);

    /**
        @notice It gets whether a lending pool is paused or not.
        @param lendingPoolAddress lending pool address to test.
        @return true if the lending pool is paused. Otherwise it returns false.
     */
    function lendingPoolPaused(address lendingPoolAddress) external view returns (bool);

    /**
        @notice It pauses a specific lending pool.
        @param lendingPoolAddress lending pool address to pause.
     */
    function pauseLendingPool(address lendingPoolAddress) external;

    /**
        @notice It unpauses a specific lending pool.
        @param lendingPoolAddress lending pool address to unpause.
     */
    function unpauseLendingPool(address lendingPoolAddress) external;

    /**
        @notice It creates a new asset settings in the platform.
        @param assetAddress asset address used to create the new setting.
        @param cTokenAddress cToken address used to configure the asset setting.
        @param maxLoanAmount the max loan amount used to configure the asset setting.
     */
    function createAssetSettings(
        address assetAddress,
        address cTokenAddress,
        uint256 maxLoanAmount
    ) external;

    /**
        @notice It removes all the asset settings for a specific asset address.
        @param assetAddress asset address used to remove the asset settings.
     */
    function removeAssetSettings(address assetAddress) external;

    /**
        @notice It updates the maximum loan amount for a specific asset address.
        @param assetAddress asset address to configure.
        @param newMaxLoanAmount the new maximum loan amount to configure.
     */
    function updateMaxLoanAmount(address assetAddress, uint256 newMaxLoanAmount) external;

    /**
        @notice It updates the cToken address for a specific asset address.
        @param assetAddress asset address to configure.
        @param newCTokenAddress the new cToken address to configure.
     */
    function updateCTokenAddress(address assetAddress, address newCTokenAddress) external;

    /**
        @notice Gets the current asset addresses list.
        @return the asset addresses list.
     */
    function getAssets() external view returns (address[] memory);

    /**
        @notice Get the current asset settings for a given asset address.
        @param assetAddress asset address used to get the current settings.
        @return the current asset settings.
     */
    function getAssetSettings(address assetAddress)
        external
        view
        returns (AssetSettingsLib.AssetSettings memory);

    /**
        @notice Tests whether amount exceeds the current maximum loan amount for a specific asset settings.
        @param assetAddress asset address to test the setting.
        @param amount amount to test.
        @return true if amount exceeds current max loan amout. Otherwise it returns false.
     */
    function exceedsMaxLoanAmount(address assetAddress, uint256 amount)
        external
        view
        returns (bool);

    /**
        @notice Tests whether an account has the pauser role.
        @param account account to test.
        @return true if account has the pauser role. Otherwise it returns false.
     */
    function hasPauserRole(address account) external view returns (bool);

    /**
        @notice Get the current escrow factory contract.
        @return the current escrow factory contract.
     */
    function getEscrowFactory() external view returns (EscrowFactoryInterface);

    /**
        @notice Sets a new escrow factory contract.
        @param newEscrowFactoryAddress contract address of new escrow factory.
     */
    function setEscrowFactory(address newEscrowFactoryAddress) external;
}
