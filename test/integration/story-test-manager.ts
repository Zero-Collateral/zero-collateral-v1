import { HardhatRuntimeEnvironment } from 'hardhat/types'
import Mocha from 'mocha'

import { generateStoryDomains } from '../helpers/story/generator/story-generator'
import {
  generateTests,
  TestScenarioDomain,
} from '../helpers/story/story-helpers'

export const generateAllStoryTests = (
  mochaInstance: Mocha,
  hre: HardhatRuntimeEnvironment
): Mocha => {
  const allTestStoryDomains: TestScenarioDomain[] = generateStoryDomains()

  //const mochaInstance = new Mocha(hre.config.mocha)
  //mochaInstance.timeout(19000)

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
