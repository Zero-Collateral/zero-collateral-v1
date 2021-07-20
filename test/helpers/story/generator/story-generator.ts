import { HardhatRuntimeEnvironment } from 'hardhat/types'

import {
  STORY_NETWORKS,
  StoryValues,
  TestAction,
  TestScenario,
  TestScenarioDomain,
  TREE_STRUCTURE,
} from '../story-helpers'

export const generateStoryDomains = (): TestScenarioDomain[] => {
  const proceduralScenarioDomains: TestScenarioDomain[] = []

  for (const [key, value] of Object.entries(TREE_STRUCTURE)) {
    const scenarioArray = generateDomainScenarios(key, value)
    const newSDomain: TestScenarioDomain = {
      domainName: key,
      scenarios: scenarioArray,
    }
    proceduralScenarioDomains.push(newSDomain)
  }
  return proceduralScenarioDomains
}

const generateDomainScenarios = (
  key: string,
  value: StoryValues
): TestScenario[] => {
  const testCases: TestScenario[] = []
  let network: string
  switch (process.env.FORKING_NETWORK) {
    case 'mainnet':
    case 'kovan':
    case 'rinkeby':
    case 'ropsten':
      network = STORY_NETWORKS.MAINNET
      break
    case 'polygon':
    case 'polygon_mumbai':
      network = STORY_NETWORKS.POLYGON
      break
    default:
      throw new Error(
        `Forking network is invalid: ${process.env.FORKING_NETWORK}`
      )
  }
  if (value.network !== STORY_NETWORKS.ALL && value.network !== network)
    return testCases
  const splitStructure: string[] = key.split('.')
  const domain = splitStructure[0]
  const actions: TestAction[] = []

  const action = splitStructure[splitStructure.length - 1]
  const test: TestAction = {
    actionParentType: domain == 'DAPP' ? splitStructure[1] : undefined,
    actionType: action,
    suiteName: `${domain} ${action} test`,
    args: {},
  }
  actions.unshift(test)
  testCases.push({ domain, actions })
  if (value.parents) {
    value.parents.map((value) => {
      parseParents(value, testCases)
    })
    testCases.push({ domain, actions: actions })
  }
  return testCases
}

const parseParents = (
  structure: string,
  testCases: TestScenario[]
): TestAction => {
  const parentactions: TestAction[] = []
  const structureSplit = structure.split('.')
  const domain = structureSplit[0]
  const action = structureSplit[structureSplit.length - 1]
  const test: TestAction = {
    actionParentType: domain == 'DAPP' ? structureSplit[1] : undefined,
    actionType: action,
    suiteName: `${domain} ${action} test`,
    args: {},
  }
  parentactions.push(test)
  testCases.push({ domain, actions: parentactions })
  return test
}
