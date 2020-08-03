// JS Libraries
const withData = require('leche').withData;
const { t } = require('../utils/consts');
const { hashLoanTermsRequest, hashLoanTermsResponse } = require('../utils/hashes');
const { createLoanRequest, createUnsignedLoanResponse } = require('../utils/structs');
const ethUtil = require('ethereumjs-util')

// Smart contracts
const Mock = artifacts.require("./mock/util/Mock.sol");
const SignatureLibMock = artifacts.require("./mock/util/SignatureLibMock.sol");

// constants
const { NULL_ADDRESS } = require('../utils/consts');
const chains = require('../utils/chains');

contract('SignatureLibHashLoanRequestTest', function (accounts) {
    const loansAddress = accounts[4];
    let consensusInstance;
    let instance;

    beforeEach('Setup for each test', async () => {
        instance = await SignatureLibMock.new();
        consensusInstance = await Mock.new();
    });

    withData({
        _1_mainnet_first_test_hashLoanRequest: [chains.mainnet, accounts[2], accounts[1], 234764, 344673177, 34467317723, 234534],
        _2_ropsten_test_hashLoanRequest: [chains.ropsten, accounts[3], accounts[4], 254864, 345673177, 34467317723, 234534],
        _3_mainnet_second_test_hashLoanRequest: [chains.mainnet, NULL_ADDRESS, NULL_ADDRESS, 0, 0, 0, 0],
    }, function(
        chainId,
        borrower,
        recipient,
        requestNonce,
        amount,
        duration,
        requestTime,
    ) {    
        it(t('user', 'hashRequest', 'Should correctly calculate the hash for a request', false), async function() {
            const request = createLoanRequest(borrower, recipient, requestNonce, amount, duration, requestTime, instance.address)
            let expectedResult = ethUtil.bufferToHex(
                hashLoanTermsRequest(
                    request,
                    loansAddress,
                    chainId,
                )
            );

            // Invocation
            await instance.mockChainId(chainId);
            await instance.setLoanRequestHash(request, loansAddress);
            const result = await instance.getHashedLoanRequest(request);

            assert.equal(
                result,
                expectedResult,
                'Result should have been ' + expectedResult
                );
        });
    });

    withData({
        _4_mainnet_first_test_hashResponse: [chains.mainnet, accounts[2], 34552, 234764, 344673177, 34467317723, 345345, 34],
        _5_mainnet_second_test_hashResponse: [chains.mainnet, NULL_ADDRESS, 0, 0, 0, 0, 0],
    }, function(
        chainId,
        signer,
        responseTime,
        interestRate,
        collateralRatio,
        maxLoanAmount,
        signerNonce,
    ) {    
        it(t('user', 'hashResponse', 'Should correctly calculate the hash for a response', false), async function() {
            const response = createUnsignedLoanResponse(signer, responseTime, interestRate, collateralRatio, maxLoanAmount, signerNonce, instance.address)
            const request = createLoanRequest(NULL_ADDRESS, NULL_ADDRESS, 52345, 2345234, 234534, 34534, consensusInstance.address)
            const requestHash = ethUtil.bufferToHex(hashLoanTermsRequest(request, accounts[4], chainId))

            const expectedHash = ethUtil.bufferToHex(
                hashLoanTermsResponse(
                    response,
                    requestHash,
                    chainId,
                )
            )

            // Invocation
            await instance.mockChainId(chainId);
            await instance.setLoanRequestHash(request, loansAddress);
            await instance.setHashLoanResponse(response);
            const result = await instance.getHashedLoanResponse(response);

            assert.equal(
                result,
                expectedHash,
                'Result should have been ' + expectedHash
                );
        });
    });
});