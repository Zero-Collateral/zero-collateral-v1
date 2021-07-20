import { HardhatRuntimeEnvironment } from 'hardhat/types'

import DappStoryTestDriver from './drivers/dapp-story-test-driver'
import LPStoryTestDriver from './drivers/lending-pool-story-test-driver'
import LoanStoryTestDriver from './drivers/loan-story-test-driver'

export const LoanSnapshots: { [key: number]: () => Promise<void> } = {}

// export const STORY_DOMAINS = {
//   LOAN: { TAKE_OUT: 0, REPAY: 1, LIQUIDATE: 2 },
//   LENDING_POOL: { LEND: 0, WITHDRAW: 1 },
//   DAPP: { LEND: 0, SWAP: 1 },
// }

export const STORY_NETWORKS = {
  POLYGON: 'polygon',
  MAINNET: 'mainnet',
  ALL: 'all',
}

export const TREE_STRUCTURE = {
  'LOAN.TAKE_OUT': { network: STORY_NETWORKS.ALL },
  'LOAN.REPAY': { network: STORY_NETWORKS.ALL, parents: ['LOAN.TAKE_OUT'] },
  'LOAN.LIQUIDATE': {
    network: STORY_NETWORKS.ALL,
    parents: ['LOAN.TAKE_OUT'],
  },
  'LENDING_POOL.LEND': {
    network: STORY_NETWORKS.ALL,
    parents: ['LOAN.TAKE_OUT'],
  },
  'LENDING_POOL.WITHDRAW': {
    network: STORY_NETWORKS.ALL,
    parents: ['LOAN.TAKE_OUT', 'LENDING_POOL.LEND'],
  },
  'DAPP.LEND.COMPOUND': {
    network: STORY_NETWORKS.MAINNET,
    parents: ['LOAN.TAKE_OUT'],
  },
  'DAPP.CLAIM.COMPOUND': {
    network: STORY_NETWORKS.MAINNET,
    parents: ['LOAN.TAKE_OUT', 'DAPP.LEND.COMPOUND'],
  },
  'DAPP.LEND.AAVE': {
    network: STORY_NETWORKS.ALL,
    parents: ['LOAN.TAKE_OUT'],
  },
  // 'DAPP.LEND.YEARN': {
  //   network: STORY_NETWORKS.MAINNET,
  //   parents: ['LOAN.TAKE_OUT'],
  // },
  'DAPP.LEND.POOL_TOGETHER': {
    network: STORY_NETWORKS.ALL,
    parents: ['LOAN.TAKE_OUT'],
  },
  'DAPP.SWAP.UNISWAP': {
    network: STORY_NETWORKS.MAINNET,
    parents: ['LOAN.TAKE_OUT'],
  },
  'DAPP.SWAP.SUSHISWAP': {
    network: STORY_NETWORKS.POLYGON,
    parents: ['LOAN.TAKE_OUT'],
  },
}

export interface StoryValues {
  network: string
  parents?: string[]
}

export interface TestScenarioDomain {
  domainName: string
  scenarios: TestScenario[]
}

export interface TestScenario {
  domain: string
  actions: TestAction[]
}

export interface TestAction {
  actionParentType?: string
  actionType: string
  suiteName: string
  args: TestArgs
}

export interface TestArgs {
  actionTarget?: number
  dappAction?: number
  loanType?: number
  nft?: boolean
}

export const generateTests = (
  hre: HardhatRuntimeEnvironment,
  scenario: TestScenario,
  parentSuite: Mocha.Suite
): Mocha.Suite => {
  switch (scenario.domain) {
    case 'LOAN':
      return LoanStoryTestDriver.generateDomainSpecificTestsForScenario(
        hre,
        scenario,
        parentSuite
      )
      break
    case 'LENDING_POOL':
      return LPStoryTestDriver.generateDomainSpecificTestsForScenario(
        hre,
        scenario,
        parentSuite
      )
      break
    case 'DAPP':
      return DappStoryTestDriver.generateDomainSpecificTestsForScenario(
        hre,
        scenario,
        parentSuite
      )
      break
    default:
      return parentSuite
      break
  }
}
