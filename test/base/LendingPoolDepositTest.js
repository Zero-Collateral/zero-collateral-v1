// JS Libraries
const withData = require('leche').withData;
const { t } = require('../utils/consts');
const { lendingPool } = require('../utils/events');
const ERC20InterfaceEncoder = require('../utils/encoders/ERC20InterfaceEncoder');
const MintableInterfaceEncoder = require('../utils/encoders/MintableInterfaceEncoder');
const CompoundInterfaceEncoder = require('../utils/encoders/CompoundInterfaceEncoder');

// Mock contracts
const Mock = artifacts.require("./mock/util/Mock.sol");

// Smart contracts
const Lenders = artifacts.require("./base/Lenders.sol");
const LendingPool = artifacts.require("./base/LendingPool.sol");

contract('LendingPoolDepositTest', function (accounts) {
    const erc20InterfaceEncoder = new ERC20InterfaceEncoder(web3);
    const mintableInterfaceEncoder = new MintableInterfaceEncoder(web3);
    const compoundInterfaceEncoder = new CompoundInterfaceEncoder(web3);

    let instance;
    let zTokenInstance;
    let daiInstance;
    let lendersInstance;
    let loansInstance;
    let interestConsensusInstance;
    let cTokenInstance;

    beforeEach('Setup for each test', async () => {
        zTokenInstance = await Mock.new();
        daiInstance = await Mock.new();
        loansInstance = await Mock.new();
        interestConsensusInstance = await Mock.new();
        instance = await LendingPool.new();
        const settingsInstance = await Mock.new();
        cTokenInstance = await Mock.new()

        lendersInstance = await Lenders.new(
          zTokenInstance.address,
          instance.address,
          interestConsensusInstance.address
        );

        await instance.initialize(
            zTokenInstance.address,
            daiInstance.address,
            lendersInstance.address,
            loansInstance.address,
            cTokenInstance.address,
            settingsInstance.address,
        );
    });

    withData({
        _1_basic: [accounts[0], true, true, 1, false, undefined, false],
        _2_notTransferFromEnoughBalance: [accounts[2], false, true, 100, false, "TransferFrom wasn't successful.", true],
        _3_notDepositIntoCompound: [accounts[2], true, true, 100, true, "COMPOUND_DEPOSIT_ERROR", true],
        _4_notMint: [accounts[0], true, false, 60, false, 'Mint was not successful.', true],
    }, function(
        recipient,
        transferFrom,
        mint,
        amountToDeposit,
        compoundFails,
        expectedErrorMessage,
        mustFail
    ) {
        it(t('user', 'deposit', 'Should able (or not) to deposit DAIs.', mustFail), async function() {
            // Setup
            const encodeTransferFrom = erc20InterfaceEncoder.encodeTransferFrom();
            await daiInstance.givenMethodReturnBool(encodeTransferFrom, transferFrom);
            const encodeMint = mintableInterfaceEncoder.encodeMint();
            await zTokenInstance.givenMethodReturnBool(encodeMint, mint);

            const mintResponse = compoundFails ? 1 : 0
            const encodeCompMint = compoundInterfaceEncoder.encodeMint();
            await cTokenInstance.givenMethodReturnUint(encodeCompMint, mintResponse)

            try {
                // Invocation
                const result = await instance.deposit(amountToDeposit, { from: recipient });

                // Assertions
                assert(!mustFail, 'It should have failed because data is invalid.');
                assert(result);
                lendingPool
                    .tokenDeposited(result)
                    .emitted(recipient, amountToDeposit);
            } catch (error) {
                // Assertions
                assert(mustFail);
                assert(error);
                assert.equal(error.reason, expectedErrorMessage);
            }
        });
    });
});
