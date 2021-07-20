import { HardhatRuntimeEnvironment } from 'hardhat/types'
import Mocha from 'mocha'

import { generateStoryDomains } from '../helpers/story/generator/story-generator'
import {
  generateTests,
  TestScenarioDomain,
} from '../helpers/story/story-helpers'

export const generateAllStoryTests = (
  hre: HardhatRuntimeEnvironment
): Mocha => {
  const allTestStoryDomains: TestScenarioDomain[] = generateStoryDomains()

  const mochaInstance = new Mocha()
  mochaInstance.timeout(300000)

  for (const storyDomain of allTestStoryDomains) {
    const suiteInstance = Mocha.Suite.create(
      mochaInstance.suite,
      'Story Test Suite - '.concat(storyDomain.domainName)
    )
    for (const scenario of storyDomain.scenarios) {
      generateTests(hre, scenario, suiteInstance)
    }
  }
  return mochaInstance
}
