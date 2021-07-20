import { TASK_TEST_RUN_MOCHA_TESTS } from 'hardhat/builtin-tasks/task-names'
import { task } from 'hardhat/config'
import { subtask } from 'hardhat/config'
import { glob } from 'hardhat/internal/util/glob'
import Mocha from 'mocha'
import path from 'path'

import { generateAllStoryTests } from '../test/integration/story-test-manager'

task('test').setAction(async (args, hre, runSuper) => {
  const { run } = hre

  const chain = process.env.FORKING_NETWORK
  if (chain == null) {
    throw new Error(`Invalid network to fork and run tests on: ${chain}`)
  }
  // Fork the deployment files into the 'hardhat' network
  await run('fork', {
    chain,
    onlyDeployment: true,
  })

  // Disable logging
  process.env.DISABLE_LOGS = 'true'

  // Run the actual test task
  await runSuper({
    ...args,
    deployFixture: true,
  })
})

// https://github.com/nomiclabs/hardhat/blob/master/packages/hardhat-core/src/builtin-tasks/test.ts
/**
 * Overrides TASK_TEST_RUN_MOCHA_TEST to (conditionally) use eth-gas-reporter as
 * the mocha test reporter and passes mocha relevant options. These are listed
 * on the `gasReporter` of the user's config.
 */
/*
 taskArgs: ArgsT,
 env: HardhatRuntimeEnvironment,
 runSuper: RunSuperFunction<ArgsT>*/

subtask(TASK_TEST_RUN_MOCHA_TESTS).setAction(
  async ({}: { testFiles: string[] }, hre) => {
    //custom code
    const storyMochaInstance: Mocha = generateAllStoryTests(hre)

    console.log('\n\n\n\n')

    await new Promise<number>((resolve, _) => {
      storyMochaInstance.run(resolve)
    })

    console.log('\n\n\n\n')
    const tsFiles = await glob(path.join(hre.config.paths.tests, '**/*.ts'))

    const mochaInstance = new Mocha()
    mochaInstance.timeout(30000)

    tsFiles.forEach((file: string) => {
      mochaInstance.addFile(file)
    })

    const fileTestFailures = await new Promise<number>((resolve, _) => {
      mochaInstance.run(resolve)
    })

    console.log('Completed all tests.')

    /*if(testFailures > 0){
      return testFailures
    }*/

    return fileTestFailures
  }
)
