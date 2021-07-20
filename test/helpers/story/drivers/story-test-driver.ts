import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Test } from 'mocha'

import { TestAction, TestScenario } from '../story-helpers'

/*
export default class StoryTestDriver {
  static generateDomainSpecificTestsForScenario(
    hre: HardhatRuntimeEnvironment,
    scenario: TestScenario
  ): Array<Test> {
    return []
  }

  static generateTestsForAction(
    hre: HardhatRuntimeEnvironment,
    action: TestAction
  ): Array<Test> {
    return []
  }
}
*/

export default class StoryTestDriver {
  static generateDomainSpecificTestsForScenario(
    hre: HardhatRuntimeEnvironment,
    scenario: TestScenario,
    parentSuite: Mocha.Suite
  ): Mocha.Suite {
    return parentSuite
  }

  static generateTestsForAction(
    hre: HardhatRuntimeEnvironment,
    action: TestAction,
    testSuite: Mocha.Suite
  ): Test[] {
    return []
  }
}
