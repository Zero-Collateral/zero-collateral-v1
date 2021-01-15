const withData = require('leche').withData;
const {
  t,
  getLatestTimestamp,
  ONE_DAY,
  THIRTY_DAYS,
  NULL_ADDRESS,
} = require('../utils/consts');
const settingsNames = require('../utils/platformSettingsNames');
const { createLoanRequest, createUnsignedLoanResponse } = require('../utils/structs');
const { createLoanResponseSig, hashLoanTermsRequest } = require('../utils/hashes');
const ethUtil = require('ethereumjs-util');
const { loanTermsConsensus } = require('../utils/events');

const BigNumber = require('bignumber.js');
const chains = require('../utils/chains');
const { createTestSettingsInstance } = require('../utils/settings-helper');

// Mock contracts
const Mock = artifacts.require('./mock/util/Mock.sol');

// Smart contracts
const LoanTermsConsensus = artifacts.require('./mock/base/LoanTermsConsensusMock.sol');
const Settings = artifacts.require('./base/Settings.sol');

contract('LoanTermsConsensusProcessRequestTest', function (accounts) {
  const owner = accounts[0];
  let instance;
  let settings;
  let loansInstance;
  const nodeOne = accounts[2];
  const nodeTwo = accounts[3];
  const nodeThree = accounts[4];
  const nodeFour = accounts[5];
  const nodeSix = accounts[6];
  const borrower = accounts[9];
  const requestNonce = 142;

  let currentTime;
  let loanRequest;
  let responseOne = createUnsignedLoanResponse(
    nodeOne,
    0,
    1350,
    6834,
    BigNumber('90000000000000000000000').toFixed(),
    0,
    NULL_ADDRESS
  );
  let responseTwo = createUnsignedLoanResponse(
    nodeTwo,
    0,
    1376,
    6666,
    BigNumber('91500000000000000000000').toFixed(),
    0,
    NULL_ADDRESS
  );
  let responseThree = createUnsignedLoanResponse(
    nodeThree,
    0,
    1376,
    6666,
    BigNumber('91500000000000000000000').toFixed(),
    4,
    NULL_ADDRESS
  );
  let responseFour = createUnsignedLoanResponse(
    nodeFour,
    0,
    1398,
    7040,
    BigNumber('92500000000000000000000').toFixed(),
    0,
    NULL_ADDRESS
  );
  let responseFive = createUnsignedLoanResponse(
    nodeThree,
    0,
    1400,
    6840,
    BigNumber('94000000000000000000000').toFixed(),
    0,
    NULL_ADDRESS
  );
  let responseExpired = createUnsignedLoanResponse(
    nodeSix,
    0,
    1400,
    6840,
    BigNumber('94000000000000000000000').toFixed(),
    0,
    NULL_ADDRESS
  );
  let responseInvalidChainId = createUnsignedLoanResponse(
    nodeThree,
    0,
    1400,
    6840,
    BigNumber('94000000000000000000000').toFixed(),
    3,
    NULL_ADDRESS
  );

  beforeEach('Setup the response times and signatures', async () => {
    instance = await LoanTermsConsensus.new();
    currentTime = await getLatestTimestamp();
    loansInstance = await Mock.new();

    loanRequest = createLoanRequest(
      borrower,
      NULL_ADDRESS,
      requestNonce,
      15029398,
      THIRTY_DAYS,
      45612478,
      instance.address
    );

    responseOne.consensusAddress = instance.address;
    responseTwo.consensusAddress = instance.address;
    responseThree.consensusAddress = instance.address;
    responseFour.consensusAddress = instance.address;
    responseFive.consensusAddress = instance.address;
    responseExpired.consensusAddress = instance.address;
    responseInvalidChainId.consensusAddress = instance.address;

    responseOne.responseTime = currentTime - 2 * ONE_DAY;
    responseTwo.responseTime = currentTime - 25 * ONE_DAY;
    responseThree.responseTime = currentTime - 29 * ONE_DAY;
    responseFour.responseTime = currentTime - ONE_DAY;
    responseFive.responseTime = currentTime - 15 * ONE_DAY;
    responseExpired.responseTime = currentTime - 31 * ONE_DAY;
    responseInvalidChainId.responseTime = currentTime - 15 * ONE_DAY;

    const chainId = chains.mainnet;
    const invalidChainId = chains.ropsten;
    const requestHash = ethUtil.bufferToHex(
      hashLoanTermsRequest(loanRequest, loansInstance.address, chainId)
    );

    responseOne = await createLoanResponseSig(
      web3,
      nodeOne,
      responseOne,
      requestHash,
      chainId
    );
    responseTwo = await createLoanResponseSig(
      web3,
      nodeTwo,
      responseTwo,
      requestHash,
      chainId
    );
    responseThree = await createLoanResponseSig(
      web3,
      nodeThree,
      responseThree,
      requestHash,
      chainId
    );
    responseFour = await createLoanResponseSig(
      web3,
      nodeFour,
      responseFour,
      requestHash,
      chainId
    );
    responseFive = await createLoanResponseSig(
      web3,
      nodeThree,
      responseFive,
      requestHash,
      chainId
    );
    responseExpired = await createLoanResponseSig(
      web3,
      nodeSix,
      responseExpired,
      requestHash,
      chainId
    );
    responseInvalidChainId = await createLoanResponseSig(
      web3,
      nodeThree,
      responseInvalidChainId,
      requestHash,
      invalidChainId
    );
  });

  withData(
    {
      _1_insufficient_responses: [
        10000,
        320,
        undefined,
        undefined,
        [responseOne, responseTwo],
        true,
        'INSUFFICIENT_NUMBER_OF_RESPONSES',
      ],
      _2_one_response_successful: [
        2000,
        320,
        undefined,
        undefined,
        [responseOne],
        false,
        undefined,
      ],
      _3_responses_just_over_tolerance: [
        8000,
        310,
        undefined,
        undefined,
        [responseOne, responseTwo, responseThree, responseFour],
        true,
        'RESPONSES_TOO_VARIED',
      ],
      _4_responses_just_within_tolerance: [
        8000,
        320,
        undefined,
        undefined,
        [responseOne, responseTwo, responseFour, responseFive],
        false,
        undefined,
      ],
      _5_zero_tolerance: [
        4000,
        0,
        undefined,
        undefined,
        [responseTwo, responseThree],
        false,
        undefined,
      ],
      _6_two_responses_same_signer: [
        // responseThree and five have the same signer
        8000,
        320,
        undefined,
        undefined,
        [responseOne, responseThree, responseTwo, responseFive],
        true,
        'SIGNER_ALREADY_SUBMITTED',
      ],
      _7_expired_response: [
        8000,
        320,
        undefined,
        undefined,
        [responseOne, responseTwo, responseFour, responseExpired],
        true,
        'RESPONSE_EXPIRED',
      ],
      _8_signer_nonce_taken: [
        6000,
        320,
        { nonce: 0, signer: nodeOne },
        undefined,
        [responseFive, responseOne, responseTwo],
        true,
        'SIGNER_NONCE_TAKEN',
      ],
      _9_responses_invalid_sig_chainid: [
        8000,
        320,
        undefined,
        undefined,
        [responseOne, responseTwo, responseFour, responseInvalidChainId],
        true,
        'SIGNATURE_INVALID',
      ],
      _10_borrower_nonce_taken: [
        6000,
        360,
        undefined,
        { nonce: requestNonce, borrower: borrower },
        [responseFive, responseOne, responseTwo],
        true,
        'LOAN_TERMS_REQUEST_NONCE_TAKEN',
      ],
    },
    function (
      reqSubmissionsPercentage,
      tolerance,
      signerNonceTaken,
      requestNonceTaken,
      responses,
      mustFail,
      expectedErrorMessage
    ) {
      it(
        t(
          'user',
          'processRequest',
          'Should accept/not accept node request/responses',
          mustFail
        ),
        async function () {
          // set up contract
          settings = await createTestSettingsInstance(
            Settings,
            { from: owner, Mock },
            {
              [settingsNames.RequiredSubmissionsPercentage]: reqSubmissionsPercentage,
              [settingsNames.MaximumTolerance]: tolerance,
              [settingsNames.ResponseExpiryLength]: THIRTY_DAYS,
              [settingsNames.TermsExpiryTime]: THIRTY_DAYS,
              [settingsNames.LiquidateEthPrice]: 9500,
            }
          );
          await instance.initialize(owner, loansInstance.address, settings.address);

          await instance.addSigner(nodeOne);
          await instance.addSigner(nodeTwo);
          await instance.addSigner(nodeThree);
          await instance.addSigner(nodeFour);
          await instance.addSigner(nodeSix);

          if (signerNonceTaken !== undefined) {
            await instance.mockSignerNonce(
              signerNonceTaken.signer,
              signerNonceTaken.nonce,
              true
            );
          }

          if (requestNonceTaken !== undefined) {
            await instance.mockRequestNonce(
              requestNonceTaken.borrower,
              requestNonceTaken.nonce,
              true
            );
          }
          const currentRequestLoanTermsTimestamp = await getLatestTimestamp();

          try {
            const result = await instance.processRequest(loanRequest, responses, {
              from: owner,
            });

            assert(!mustFail, 'It should have failed because data is invalid.');

            const lastLoanTermRequest = await instance.borrowerToLastLoanTermRequest(
              borrower
            );
            assert(
              // due to the full unit tests suite takes time to execute, it is possible that there is a very small difference in the times.
              parseInt(currentRequestLoanTermsTimestamp.toString()) ==
                parseInt(lastLoanTermRequest.toString()) ||
                parseInt(currentRequestLoanTermsTimestamp.toString()) ==
                  parseInt(lastLoanTermRequest.toString()) + 1 ||
                parseInt(currentRequestLoanTermsTimestamp.toString()) + 1 ==
                  parseInt(lastLoanTermRequest.toString()),
              'Last request loan terms timestamp must be equals.'
            );

            let totalInterestRate = 0;
            let totalCollateralRatio = 0;
            let totalMaxLoanAmount = BigNumber('0');

            responses.forEach((response) => {
              loanTermsConsensus
                .termsSubmitted(result)
                .emitted(
                  response.signer,
                  borrower,
                  requestNonce,
                  response.signature.signerNonce,
                  response.interestRate,
                  response.collateralRatio,
                  response.maxLoanAmount
                );

              totalInterestRate += response.interestRate;
              totalCollateralRatio += response.collateralRatio;
              totalMaxLoanAmount = totalMaxLoanAmount.plus(response.maxLoanAmount);
            });

            loanTermsConsensus
              .termsAccepted(result)
              .emitted(
                borrower,
                requestNonce,
                Math.floor(totalInterestRate / responses.length),
                Math.floor(totalCollateralRatio / responses.length),
                totalMaxLoanAmount.div(responses.length).toFixed()
              );
          } catch (error) {
            assert(mustFail, 'Should not have failed');
            assert.equal(error.reason, expectedErrorMessage);
          }
        }
      );
    }
  );
});
