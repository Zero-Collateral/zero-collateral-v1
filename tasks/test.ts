import fs from 'fs'
import { TASK_TEST_RUN_MOCHA_TESTS } from 'hardhat/builtin-tasks/task-names'
import { task } from 'hardhat/config'
import { subtask } from 'hardhat/config'
import {
  BackwardsCompatibilityProviderAdapter
} from "hardhat/internal/core/providers/backwards-compatibility"
import { glob } from 'hardhat/internal/util/glob'
import { HARDHAT_NETWORK_NAME } from 'hardhat/plugins'
import { Artifacts, HardhatRuntimeEnvironment, HttpNetworkConfig } from 'hardhat/types'
import { EthGasReporterConfig, RemoteContract } from "hardhat-gas-reporter/src/types"
import Mocha from 'mocha'
import path from 'path'
import sha1 from "sha1"

import { generateAllStoryTests } from '../test/integration/story-test-manager'
import {
  EGRAsyncApiProvider,
  EGRDataCollectionProvider} from "./test-helper"

 

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


 


async function runStoryTests(  hre:HardhatRuntimeEnvironment ): Promise<number> {
  
  let mochaInstance = new Mocha(hre.config.mocha)
  mochaInstance.timeout(19000)

  //custom code
  const storyMochaInstance: Mocha = generateAllStoryTests(mochaInstance, hre)

  console.log('\n\n\n\n')

  const testFailures = await new Promise<number>((resolve, _) => {
    storyMochaInstance.run(resolve)
  })

  console.log('\n\n\n\n')
  const tsFiles = await glob(path.join(hre.config.paths.tests, '**/*.ts'))

  mochaInstance = new Mocha()
  mochaInstance.timeout(19000)

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
 




// https://github.com/cgewecke/hardhat-gas-reporter/blob/master/src/index.ts

/**
 * Overrides TASK_TEST_RUN_MOCHA_TEST to (conditionally) use eth-gas-reporter as
 * the mocha test reporter and passes mocha relevant options. These are listed
 * on the `gasReporter` of the user's config.
 */
 subtask(TASK_TEST_RUN_MOCHA_TESTS).setAction(
  async (args: any, hre, runSuper) => {
 
    await runStoryTests( hre )       
   
    await runSuper() 

  }
)


 