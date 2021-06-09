import Chai from 'chai'

import Mocha from 'mocha'

import { Test } from 'mocha'
import { TestAction, TestScenario } from '../story-helpers-2'

var expect = Chai.expect

export default class StoryTestDriver {
  static generateDomainSpecificTestsForScenario(
    scenario: TestScenario
  ): Array<Test> {
    return []
  }

  static generateTestsForAction(action: TestAction): Array<Test> {
    return []
  }
}