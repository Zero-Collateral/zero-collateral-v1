import { expect } from "chai"
import { Signer } from "ethers"
import hre, { ethers } from "hardhat"

import { TellerNFTDictionary } from "../../types/typechain"

let dictionaryContract: TellerNFTDictionary
let signerAccount: Signer

describe.only('TellerNFTDictionary', () => {
  let dictionary: TellerNFTDictionary
  let deployer: Signer
  it('Should deploy the dictionary', async () => {
    const Dictionary = await ethers.getContractFactory('TellerNFTDictionary')

    before(async () => {
      deployer = await hre.getNamedSigner('deployer')

      dictionaryContract = await Dictionary.deploy() as TellerNFTDictionary

      await dictionaryContract.deployed()

      const type = await dictionaryContract.stakeableTokenType()
      expect(type).to.equal(
        '0x2213d707f04cdfd263a540394e2a26bbf3a63d6ad89a37f534d2ee35bdfe0d38'
      )
    })

    it('Should add token tier mappings', async () => {
      // setTokenTierMappingCompressed

      const tokenTiers = [
        0, 12, 2, 6, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2,
        1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1,
        0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0,
        3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
        2, 1,
      ]

      const tokenTierMappingCompressed = []

      const tokenTierMappingLengthMax = tokenTiers.length / 32

      for (let i = 0; i < tokenTierMappingLengthMax; i++) {
        let newRow = '0x'

        for (let j = 0; j < 32; j++) {
          const tokenId = i * 32 + j

          if (tokenId < tokenTiers.length) {
            const tierLevelHexBytes = tokenTiers[tokenId].toString(16)

            newRow += tierLevelHexBytes.padStart(2, '0')
          } else {
            newRow += '00'
          }
        }

        tokenTierMappingCompressed.push(newRow)
      }

      await dictionaryContract.setAllTokenTierMappings(
        tokenTierMappingCompressed,
        { from: await signerAccount.getAddress() }
      )

      await dictionary
        .connect(deployer)
        .setAllTokenTierMappings(tokenTierMappingCompressed)

      let tokenTierIndex = await dictionary.getTokenTierIndex('1')
      tokenTierIndex.should.equal(12)

      tokenTierIndex = await dictionary.getTokenTierIndex('2')
      tokenTierIndex.should.equal(2)

      tokenTierIndex = await dictionary.getTokenTierIndex('0')
      tokenTierIndex.should.equal(0)

      tokenTierIndex = await dictionary.getTokenTierIndex('3')
      tokenTierIndex.should.equal(6)

      tokenTierIndex = await dictionary.getTokenTierIndex('44')
      tokenTierIndex.should.equal(0)

      await dictionary.connect(deployer).setTokenTierForTokenId(44, 11)

      tokenTierIndex = await dictionary.getTokenTierIndex('44')
      tokenTierIndex.should.equal(11)
    })

    it('Should add tier data', async () => {
      const Tier0 = {
        baseLoanSize: '2500000000000000000000',
        hashes: [
          'QmeL8KzMzHXgMUXWNEjTk5aWbWvHWqjmbpE8AjE47p366e',
          'QmZcwPGf3GfLUBZpy722kgT6yLLUde6fytDRDq3r7FfZtW',
          'QmZQT2o2pTVU5s8Q9iJU5dNi3o18Xm8Xy2FGBAbj3T9f3o',
          'QmTheQh5CcJrZVT9diSaBcJSQBENe9sk2rucNPnxNPkzm8',
          'QmPWWrGZaKVTxUF7pGE25xbiwVZefD4kbi52jaKnuQ4nzp',
          'QmaBGT6RMnuHj81CRMEhLv1WRffzQje1MD8jG6KAGdxdbH',
          'QmNixErgSC6Xu1Pu2KH4m7PBvXMMdqVMH6fEDdLXWnJn7G',
          'QmXB1oArPyHsxePno6AXUMqbEDJTWCBUSmodjJmEYp4YRb',
          'QmUiBrZQ9nEwX7JswPudR2rYzrHLpoGqTfdRGd3S9gDmBr',
          'QmNsXvprKiq3Yd5dYf5JaCCUJ7kveCx8sJukS94ZZkqVro',
          'QmWF3z1wK72XAAwdH7XD2pceDfgkUTbefokDtTPmJveZmR',
          'QmUPaWYc92fjyRTZrAH2pWG6FibWLTS9x4ZiZHvttQoMmQ',
          'QmXsPyFPa8cUbW7puziizkizoo3vCeYLG6MoWFb8xzuNxX',
          'QmVMA8JytaJkNni7TdgXNaJi6k8tbDW1Pbt3SfmPSLTJnN',
          'QmdcrimdE1q3HEU57u1GEwm4cxH2SNnrqcJK4z2a2bB14Y',
          'QmeSPtb6Qu9m9piX38igLWGKuNJKXgd1pvCxZH9A2gGeR2',
          'QmUNQ7pSJjwzdzFyr9RuH1dZoj7kKmRJGUC6ti1Que8FDg',
          'QmU4MGXdfVdohsE7TL8XBTBdfuhtrPUM9B2A9U4N7AKWAp',
          'QmVR7jJrKzDAeSejU8baDZScgJ6pFc4KGqreeqkytkyzTY',
          'QmVraE3NYsTv2mENa7Wv5ZNJRgD9X5fuDU9wfnxDVmVRrm',
          'QmXfBXftm7HaDr6YUEruL2ivfpRyMW6UndRuhQ1TgcjbYX',
          'QmQHSFeexH3AmUcviCNkyHD1eqHFBVRdHCAeyBAfDaaVgQ',
          'QmUT59247c7BmheSanY7C78CSvjyrC6PDL2sMJJE2zaRy3',
          'QmdANMtQmBhj8aVoLUkohgwWLpdVvSn4xF1Ht9Q5YzXnS3',
          'QmZABrffv7PJu9XhT5J5FVS7xq4xeE7exSDDa9u5KmWrq2',
          'QmUgRy8xGsg4tXbeZFsKHesbRh3ijEqiZv5MkRFEBD4Q9V',
          'QmVb7YNZ3bCXgvZbuZvXfTTn9DWHywFqtA3tigrh9SkNMh',
          'QmWJZL44Tds1fXMH6M7UERU4gyaeuiMSJGjqvuumzK83RQ',
          'QmRfxX27ifBjmNpkUbnYVuawBgPWgkuQKfGocc9gqB7heT',
          'QmSuFXx7Tkwf9wkW6omZymJgX7BkdVVmMubQQ96iRw6XsG',
          'QmXq4wRV5hzK63PJ98yiyPb4RzhE4Z1CbScFYF2eaA6wLm',
          'QmWduUWv4eqJvL5xK6uwdurbGafXzYEQp7X881YjoPS8ae',
          'QmaL8xB6s1DSvVrcbtcvAdhdpwXjrgBfAi9og2rwofThKD',
          'QmNWizjUQQ8bqUALB3d716eTXFyzd6qTvwTRwUrZPd5HE7',
        ],
        contributionAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        contributionSize: '1000000000000000000',
        contributionMultiplier: '150',
      }

      const Tier1 = {
        baseLoanSize: '12500000000000000000000',
        hashes: [
          'QmZwLzEXRj1AkUUnXRTzJ9gNmNpEYikK8CA2BF3iR6bRy7',
          'QmR57UdzDdY1sEksKdjx9A5jxZtppf5DCfyxUXmdY8hhvC',
          'QmXuBs5RyknukxGHiu7E6VxW23jo7AjArtjZkCAp3PijPu',
          'QmbwYqEiZqQy9P7VW94rseYW82cPfPjqdxNYkpgfGYyrQJ',
          'QmWirksGkNPKrpGwyQAiWp8Mn9J2wTrpELx6SrYVSbSGRA',
          'Qmf7b9Bx78J9uT76GojRPHDBQweUUrw62wrQSBWKTvJ7h1',
          'QmbCW7QyUJUz9YzNPNYmAQKVPDjXj9f3MEoRo5nJXTfoAs',
          'QmaRfkDFifrVvtb4r9tCNd4aryEEmXH6G3QC2NubBDQt1L',
          'QmZajQdXpmv7daayZuo695Q6hxYcVd62u88uuc51Gu31hy',
          'QmSJ8naxn2uttveiXBJPoFbNs7Rcx974GriJMex7KrpG3p',
          'QmfYKKBV7MyXSZqAvC19F6RoPj3N1McXkX3Kx727xDy8dX',
          'QmRtDGSxq61f2QJ3MQAa9XfQs3NTCpUo4KkUCkKKDNRcEy',
          'QmUvWfVXjonXyG2nrcJT11nCqb1T8kbmoutBaLirAtGCSe',
          'QmYJz8YUsjYVojdWyp33kSC2duuNFZ2BCHbGJ1dpjMeLdo',
          'QmNUV4wZLMnv96xT4D2FZ5MYP1G1Li5RMw8ChjEKdP14xt',
          'QmZ7BPAhzjQC36FqoAyQKFdrJ2ffPTA3vDWiMpKXSpWdTc',
          'QmUL4R3ozqaBF4R2tGzr81bQGTbLa4DouChr7gqrU2uv9f',
          'QmeW62sbcGWGnPdpYSuDuQ1E5U42hTHZq3an1abkuhYeX9',
          'QmPQcRE3oAGxNRNPWSsu6xYoNfxfzA9FTT6mvzVqag69N4',
          'QmQBxj3YZdYtCzV9SwHLvPM7JKTLGVxYCLpDeqNj5f81rK',
          'QmdfuijWeifYMjAqotsHixmU6LSUCiTTbCPu5N8mj2bygm',
          'Qmbj6dnX3A3v6vvhBu7zWa8FhfDcfGFNLVYgTjwFNSu6kK',
          'Qmdm7b8nvrP7J2hnPBsLCKeoQBH43EZP6qP1KN1RXUyXAe',
          'QmYJiVbHg183Rz5VJWc4afnYvDcbr8Q5QzcxUwpjZzkhiY',
          'QmXW3MYd33cFx6SP5fB65zjY2yHJLnw1cFKG8vQYYVKex7',
          'QmUpiFt8QbWJmaN5RLpQQuJk11qKmZK3m9i19qqKT77zkt',
          'Qme95oDQAaXpRfynDrvHAciJDJ6HMZcNrUsjgdeACWBCT2',
          'Qme3ikr6ny3ebjGya71zonvLwbrCoyMZQiahE11RQYrPgU',
          'QmQXKMnZoaHJaQBikifA5fndtuiAbhewBF2Y6LGwvhLS49',
          'QmS8ppfgecmEdkPYp35eobCTyukKRFfksjvR9AjAhYQrex',
          'QmcThqRVndERLLE8XAoFaZtE8TYMa3uXXyhLUEneKyD7Va',
          'QmYa9wYcHHr5Z1McS2qJttKAcH3rUmaqS6L2mQUmAu7Rqh',
          'QmfDnGm1rx4Ry5xNmJUSkaDXG4bnkT5y3A3MqeWpAAP8iu',
          'QmZRVPrPATGAmaHSsrsWXkzAhgx3gPPpc2AvivoH7NCzss',
          'QmPkuaAtevPDupAT5zQrMPTGJmyGaZHjMgmakJEHyQkobh',
          'QmeqooGjX6HdzvsdPugDY7Jqv21kuSPhRssVBiXuLCc39C',
          'Qmbv7jdYwip7SUippg6YwvmeFiwtu3RWc2C2MUNeHpYBPd',
          'QmeFYLq9ncdHWwkdFAvAo7hLmheNXVavsMX4kdGrc91nMh',
          'QmSxrUSMQZKtD21mH3MD4g5UyX2TRYn9QVhH5oQyDuSdm8',
          'Qmd56od5X59KqFvvtbhxv9HFxcLFW9mxBRZbk4Q9Rrt1kP',
          'QmZZ3DiMCo3E5VPyQbN1kLqX29DNYBwGpX3gJpLy6oQyMt',
          'Qmd5rgR7ZmeYD61RqugJ1CyD54uqmLpT6zP9vBpEBjmSZK',
          'QmUTfqeFQKYyPmN8pu7ruGiW48ZGB7nrwQhtm83xC9Jx3o',
          'QmUD1hxNoKzZ4QKMG5iwUePFeuA8Zrf3gfYxCERzAGANts',
          'QmNuFSLJUEE2cfEwgvF6mLmE1HPkpLSugqRezPPMvWTyxY',
          'QmXHvDdaBaQmpGyKjqmVRbfV2do8fuv2FEK8ktttTqJ1m1',
          'QmR2U83TTsfEb1Cg3vkqTmCqaChnwCwfDvHX2JeAKB1ewG',
          'QmbRSZjWcqiyQQdx53bHvtfqoY3hmSJyRCtpUxjaowtcCr',
          'Qmd1wS1XkToTVhc5ChaegdNG36ejhjfVMzERrU7rd6CahJ',
          'QmRxwYKYSppdCVuLqL5Gz7wU5F8eeDxA7gQaWhRRAdchMB',
          'QmTakunsnyGDgxApAJpsG89D1ECnsgYEYf643eEYDgFKvw',
          'QmdL9TRskxmunqfv8U12YYXJSwX4qkJsJ6FY7PL8yR2h3c',
          'Qmdch17auw5eF7rWaoK3NELP7r7pwb7UVMQ5jgam9yVkHv',
          'QmPXztPihEUtvewRZoyoAG3P7Jy9njCGLeUWAj5JQLFC9p',
          'QmVkNDTcbaKUcU4CBUPaurUBgGiHkthXLk7hEiSrNE69Jh',
          'QmXG2JJWGebVNdMmYrayvEGqwzX5MVBXZeCRHBt2g7muVJ',
          'QmT7Hid52Y1WUeqzajCksx82F975HydqLSe5eDaZc5yahE',
          'QmWojPLMfwZMZWfAWgBenVxdCfMvkTDG7jaSYXthwbmKit',
          'QmW8Wkya6WesT7AcbLhFv2pJTsR4fQ8wauiT6yACdWtcEa',
          'QmWxNXKddvaUvMMPoqxBSRW4tRSBq7HpJiHGVKQ12DpqDr',
          'QmdSn54JgSfQu8FRzeDwKLSNt4mHw6cYESoKKxu543sHBf',
          'QmY9G9n5erhoxPwC65eDGLAmeAzEnTvgh2Pw3oTcJgeMwY',
          'QmNsstma16pQddxZV4qY9poyd453EsXACWp7dqypNRhp8D',
          'QmQSnWFWA3n3JSgZsyrmNa8z26gwJXmhPqw1iSsAnNV9Lw',
        ],
        contributionAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        contributionSize: '5000000000000000000',
        contributionMultiplier: '150',
      }

      const Tier2 = {
        baseLoanSize: '25000000000000000000000',
        hashes: [
          'QmNg9Y1U9GcvmhcuDgRqLYTV9buW3VkdcrgbDvGdQXZ451',
          'QmRqmehqoSrxsQJGsxSYxrEuDFgynjei5QKBKVDtHyFWcq',
          'Qmax3BYajuSU3QTKJ2UYPbAjkJGPZVqL6dpVhuwa3A2PQT',
          'QmZgeCRsf6G3QEJ43whYb2n7gTD9KQZJbprWWXx2jrCk9z',
          'QmUyzz1VL9A7o776WSr2ATga9L85TboZ1waefPqkiZJ74R',
          'QmNpM8h8Q3dPBndjLrphHKkj1WUap7qXH3hqEGyhtb7RkC',
          'QmXaCUut5HzLNuTeRJLFh4xqdLLFmwjQMQ6uRmkfguzuJP',
          'QmS43NVGsc95xBRMJVMKVW8D6pwPPAf76abxaatVsfFhC1',
          'QmQU2K98Ky8Xa2nNnT9vm1KkhUAyGgTqm5WR9W3gyDTt9t',
          'QmXr25ZM3R8K43Gp24MSNyMYbaoa4dbNEXsQLMT4AGzic4',
          'QmPubCjoEsKKqpucSWvAJf4GHnjtbkqx1strHkPmWRCkdM',
          'QmZcVZY2dHkXmzDG7jVYjwyRkHjX6E1Ly9fRX8eox16C5s',
          'QmQmp4RMTUr7PNLEHQQvGP1jAXrjjaAZYgUftY4NhxtUB1',
          'QmRU8RSUuHCfcSp2n8EGukPLBdL7JAtabmd1oZwmHDy4hC',
          'QmU4JsYSmBb6F9ndJUpuZFWQyTxhdm4ZJppmeEjAYwvfg9',
          'QmfXNnuuEA4nsqe5KrmRAx1S6qt9jSVnzw5EwZqSh4vihN',
          'Qmb3iBpFN17R3bYguy6hQdb4Annijipz2nWG4GkvmUHPk7',
          'QmWMTLfuqKNYLjh6Xy4GvyR8U4cJps4eST9K3yJ6QqqLEG',
          'QmfYLNeNx1GYNSCa2TWxUDvF81yGuahoVNqymwNztGSzCZ',
          'QmRgP3KVHo9UKF73iz7SZ26SpSoQrCJyiJLwVaTQ9SkGSt',
          'QmeWtq9n6qYToECMGrU1EZG7LYzTkJMq96KMzETMFQJtgo',
          'QmSCEMFHMi2Jnwnqpdtn6rNof7M6EGy7q5nVyMt7Uq8qk2',
          'QmTa8jYFawebeNx8L9XzKyjboktZVeYDV1m36LBS9MnMg6',
          'QmcUsmW8aN8AHfoKgFuMg6AUHWGFhwsKv4GAF385UdxZ4c',
          'QmPYiEZRDbtVVyE6CmMsXeeDPMu7CzxsNTyYhmqjWZn7qt',
          'QmPW2wP5HGRN8hbcEwFdY58UbWCePb3uGYiHQWJV6JtZEZ',
          'QmcKWcCTMxcAmfrY4CJ9S3oE2CyxwLVrxA73pqLDZXoTNf',
          'QmQPaxgXf5CW44i1nPAxvV53FM1PF8UQJXtNk3axM4yJeX',
          'QmeEcbxpwXtDpZDoWSiL5jLuPFQebgGxUdyytwwcEke2Hy',
          'QmPBhM1v3m6qko5obwPFmkdPqYCycaN7FzuRT2M5vZkqya',
          'QmUJvT9zaD2SM8h7CftHSL9pYwq3Hg8Dq6neG14MFPwWVR',
          'QmavxtXyLNW8kqSVycXxB6mUJiHiRdXrbXA7dvWj7wAYth',
          'QmX74NW5YZYTnX24mDzMfnTAKbphtV2vd8QRQ3ds8n47SG',
          'Qmdvv61ntow9sgTt1VabpPpBPg5YEK24CRHnB4VTFKiy5m',
          'Qmex5bWCFQ7tRj1hhoNRxkP1NeHheqdP68p8UZpDBKmvSo',
          'QmXffz7ck5GLtQWnkjbeSUPSiCJXJMuauPeQaHzmeuFkb4',
          'Qmc4xxqLhCDhfqcc1ZVhM5E83UZEmc9q13ipw6kqDT6XXg',
          'QmbsTcK4MiFZv1S5Bs8ihhWFuLfZstVBy3BdKYvSSxa4Yv',
          'QmSYH4LDXgRWbL1ieKRCaDvVdAYdZnEcNCG9BYA9jzYsGK',
          'QmfEzY1CXaX4CahEym8pPMqM6ErTfjNfpe3dta449rf4YR',
          'QmPmdRJtQVhnpZp1kgjrsR7Jqhf4pTKcKgnS4dX1fGhGaV',
          'Qme4yqyjexHbQF7Aep3gSpVu7qdTejXPh59pLth61bJ9k9',
          'QmeiFjHnpa7on3Gq1iSdTjc97Tc6dxUrG6HY7bmrsvjyMW',
          'QmYGCzLQkFZCcXJ5X4ZL3JegnCzscHidC8T67EuVLfYCsc',
          'QmNdFj6fxHgYAzGiFhrGKCqgZNz2h7Cg8ySZYVMJ1bYQWo',
          'QmeJJGz9JxKxBYQ3eo2oTJw648Uao9iHaoCyrPZynBSHh1',
          'QmSgioV2r92KEf2a5PLCEri5gkFgyxe7S87K6pCkKVMrr3',
          'QmcTE5isKSbXCDDCS2LoayyYpYMuoowXtPjTvro5hrmioh',
          'Qmd6Dzhu5bWpPKja35LHL872i8bTgBddAFpHpXzKxvHbJ3',
          'QmU4Sb39Q6UKTwKtW7uAp85rhTRid726TzjWhNMm4tT312',
          'QmPosaecCZeSfN2rPSUvz8Qg5Cz5ZPrF2tVRGsPiKecn6S',
          'QmVoswF2yzYURKrqKvWMYmJZkeSCo6CD2ntmkBzbvAhHXz',
          'QmTZNBfQSnxDaZvPuCnUcDRRJhpGcuv6S5zBi1cCYdtkV7',
          'QmS2TDeDxVbxLmkqv9Py6iibzhWhymykjjiswQxNFbzFmT',
          'QmcQUGsdj2U8i6EqTt8uQsGdghYYfHUZU2rZwddwniEUSA',
          'QmX7Y5K2gFtHpT9xskoYvSyTkGtazAboqU47QNbnjBiMFr',
          'QmaEP1vhnDnVD1GCf9NVuHdCcR5MWc6Kd6v8q6tpDy5BJY',
          'QmeuTi152Zt5v7Rvipj6UBFBUEq2PJ69rXEdCDsCtiH3MB',
          'QmNcHqxeWzsDADdux8bkYh2XMVv7cWZdRUVUTpS8WDqmG8',
          'QmVTxh7DX88PqQF9tpzcqkpW868ApAqYydHnmjKHDJCyUh',
          'QmPuNivsbijk5Privi24CtmDjG4S2u6VCWmBJc4quCspcf',
          'QmTJWh3EPf5t9zv3ygcVu1UcufrQjRLVQnUdqxAkfD6NSQ',
          'QmZQHRVp16qnYDKq21GjN5TTwGb21fvGYLAd1Jpe69mko7',
          'QmPfytLRxQQumN9tVgjcS7EX7EPjvVjGEKAgQ3apfD44uU',
          'QmVipjPMCBChaanQLzn7iawjGd9gn72UU6xu3QhW6mQQam',
          'QmUXuFYReGXVw5EiHkw9QgVMcXeNHshAtp2JJRQ6TR9bVq',
          'QmWSjp8VXT9r62BX4BahGKx9m8z2qPqTW7MepEU1jEAVWd',
          'QmeVCQWxPUw6N9E83jCZkCqNGvezBXac6CYt8vBjW3K8n2',
          'QmNR4t3quXH5Tf9g9rLJELFhdWozTPqmrGpxkiBLgrxGMC',
        ],
        contributionAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        contributionSize: '10000000000000000000',
        contributionMultiplier: '150',
      }

      await dictionaryContract.setTier(0, Tier0, { from: await signerAccount.getAddress() })
      await dictionaryContract.setTier(1, Tier1, { from: await signerAccount.getAddress() })
      await dictionaryContract.setTier(2, Tier2, { from: await signerAccount.getAddress() })

      const baseLoanSize = await dictionaryContract.tokenBaseLoanSize('0')
      expect(baseLoanSize).to.equal('2500000000000000000000')

      const tokenURIHash = await dictionaryContract.tokenURIHash('0')
      expect(tokenURIHash).to.equal(
        'QmeL8KzMzHXgMUXWNEjTk5aWbWvHWqjmbpE8AjE47p366e'
      )

      const tokenContributionAsset =
        await dictionaryContract.tokenContributionAsset('0')
      expect(tokenContributionAsset).to.equal(
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      )

      const tokenContributionSize = await dictionaryContract.tokenContributionSize(
        '0'
      )
      expect(tokenContributionSize).to.equal('1000000000000000000')

      const tokenContributionMultiplier =
        await dictionaryContract.tokenContributionMultiplier('0')
      expect(tokenContributionMultiplier).to.equal('150')
    })
  })
  
})
