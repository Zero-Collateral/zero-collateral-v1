/*
    Copyright 2020 Fabrx Labs Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
pragma solidity 0.5.17;

import "../../base/Initializable.sol";

/**
    This contract is created ONLY for testing purposes.
 */
contract InitializableModifiersMock is Initializable {
    
    /** State Variables */

    /** Constructor */

    function _externalIsNotInitialized() isNotInitialized() external {}

    function _externalIsInitialized() isInitialized() external {}

    function _externalInitialize() external {
        initialize();
    }

}
