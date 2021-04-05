// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../storage.sol";

abstract contract mod_whenPaused_Pausable_v1 is sto_Pausable {
    modifier whenPaused(address context) {
        require(pausableStorage().paused[context], "NOT_PAUSED");
        _;
    }
}