// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

// Interfaces
import "../TellerNFT.sol";
import { ITellerDiamond } from "../../shared/interfaces/ITellerDiamond.sol";

// Address utility
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

contract PolyTellerNFT is TellerNFT {
    bytes32 DEPOSITOR = keccak256("DEPOSITOR");

    // limit batching of tokens due to gas limit restrictions
    uint256 public constant BATCH_LIMIT = 20;

    // Link to the contract metadata
    string private _metadataBaseURI;

    // Hash to the contract metadata located on the {_metadataBaseURI}
    string private _contractURIHash;

    // only the depositor
    modifier onlyDepositor() {
        require(hasRole(DEPOSITOR, msg.sender), "TellerNFT: not depositor");
        _;
    }

    event WithdrawnBatch(address indexed user, uint256[] tokenIds);
    event TransferWithMetadata(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId,
        bytes metaData
    );

    /**
     * @notice it initializes the PolyTellerNFT by calling the TellerNFT with a
     * a set of minters and additionally adding a DEPOSITOR role for the ChildChainManager
     * address
     * @param minters additional minters to add on the TellerNFT storage
     */
    function initialize(address[] calldata minters)
        external
        override
        initializer
    {
        // super.initialize(minters);
        __ERC721_init("Teller NFT", "TNFT");
        __AccessControl_init();

        for (uint256 i; i < minters.length; i++) {
            _setupRole(MINTER, minters[i]);
        }

        _metadataBaseURI = "https://gateway.pinata.cloud/ipfs/";
        _contractURIHash = "QmWAfQFFwptzRUCdF2cBFJhcB2gfHJMd7TQt64dZUysk3R";

        // sets up a role for child chain manager to be the depositor
        // TODO: uncomment below when mapping is complete
        // _setupRole(DEPOSITOR, 0x195fe6EE6639665CCeB15BCCeB9980FC445DFa0B);

        // for mock tests
        _setupRole(DEPOSITOR, 0xAFe87013dc96edE1E116a288D80FcaA0eFFE5fe5);
    }

    /**
     * @notice called when token is deposited on root chain
     * @dev Should be callable only by ChildChainManager
     * Should handle deposit by minting the required tokenId for user
     * Make sure minting is done only by this function
     * @param user user address for whom deposit is being done
     * @param depositData abi encoded tokenId
     */
    function deposit(address user, bytes memory depositData)
        external
        onlyDepositor
    {
        // deposit single
        if (depositData.length == 32) {
            uint256 tokenId = abi.decode(depositData, (uint256));
            _mint(user, tokenId);
            // deposit batch
        } else {
            uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));
            uint256 length = tokenIds.length;
            for (uint256 i; i < length; i++) {
                _mint(user, tokenIds[i]);
            }
        }
    }

    /**
     * @notice called when user wants to withdraw multiple tokens back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param tokenIds tokenId list to withdraw
     */
    function withdrawBatch(uint256[] calldata tokenIds) external {
        address diamondAddress = 0xc14D994fe7C5858c93936cc3bD42bb9467d6fB2C;
        // unstake first then withdraw
        uint256 length = tokenIds.length;
        require(length <= BATCH_LIMIT, "ChildERC721: EXCEEDS_BATCH_LIMIT");
        for (uint256 i; i < length; i++) {
            uint256 tokenId = tokenIds[i];
            require(
                _msgSender() == ownerOf(tokenId),
                string(
                    abi.encodePacked(
                        "ChildERC721: INVALID_TOKEN_OWNER ",
                        tokenId
                    )
                )
            );
            _burn(tokenId);
        }
        emit WithdrawnBatch(_msgSender(), tokenIds);
    }

    /**
     * @notice called when user wants to withdraw token back to root chain with arbitrary metadata
     * @dev Should handle withraw by burning user's token.
     *
     * This transaction will be verified when exiting on root chain
     *
     * @param tokenId tokenId to withdraw
     */
    function withdrawWithMetadata(uint256 tokenId) external {
        require(
            _msgSender() == ownerOf(tokenId),
            "ChildERC721: INVALID_TOKEN_OWNER"
        );

        // Encoding metadata associated with tokenId & emitting event
        emit TransferWithMetadata(
            _msgSender(),
            address(0),
            tokenId,
            this.encodeTokenMetadata(tokenId)
        );

        _burn(tokenId);
    }

    /**
     * @notice This method is supposed to be called by client when withdrawing token with metadata
     * and pass return value of this function as second paramter of `withdrawWithMetadata` method
     *
     * It can be overridden by clients to encode data in a different form, which needs to
     * be decoded back by them correctly during exiting
     *
     * @param tokenId Token for which URI to be fetched
     */
    function encodeTokenMetadata(uint256 tokenId)
        external
        view
        virtual
        returns (bytes memory)
    {
        // You're always free to change this default implementation
        // and pack more data in byte array which can be decoded back
        // in L1
        return abi.encode(tokenURI(tokenId));
    }
}
