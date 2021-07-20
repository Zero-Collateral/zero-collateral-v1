import * as fs from 'fs-extra'
import { subtask, task, types } from 'hardhat/config'
import { HARDHAT_NETWORK_NAME } from 'hardhat/plugins'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'
import * as path from 'path'

import { getFunds } from '../test/helpers/get-funds'

const projectPath = path.resolve(__dirname, '..')

interface NetworkArgs {
  chain: string
  block?: number
  onlyDeployment: boolean
  noDeploy: boolean
}

export const forkNetwork: ActionType<NetworkArgs> = async (
  args: NetworkArgs,
  hre: HardhatRuntimeEnvironment
): Promise<void> => {
  const { block, onlyDeployment, noDeploy } = args
  const { log, run, network } = hre

  if (network.name !== HARDHAT_NETWORK_NAME) {
    throw new Error(`Must use "${HARDHAT_NETWORK_NAME}" network for forking`)
  }

  const chain = process.env.FORKING_NETWORK
  if (!chain) {
    throw new Error(
      `Forking network must be set in the ENV parameter FORKING_NETWORK`
    )
  }

  if (!('forking' in network.config) || network.config.forking == null) {
    throw new Error(`Invalid forking config for network: ${chain}`)
  }

  log('')
  log(`Forking ${chain}... `, { star: true, nl: false })

  const deploymentsDir = path.join(projectPath, 'deployments')
  const srcDir = path.resolve(deploymentsDir, chain)
  for (const dir of [HARDHAT_NETWORK_NAME, 'localhost']) {
    const dstDir = path.resolve(deploymentsDir, dir)
    await fs.emptyDir(dstDir)
    await fs.ensureDir(srcDir)
    await fs.copy(srcDir, dstDir, {
      overwrite: true,
      recursive: true,
      preserveTimestamps: true,
    })
    await fs.writeFile(`${dstDir}/.chainId`, '31337')
    await fs.writeFile(`${dstDir}/.forkingNetwork`, chain)
  }
  log('done')
  log('')

  // Start a local node for the network
  if (!onlyDeployment) {
    await run('node', {
      fork: network.config.forking.url,
      forkBlockNumber: block ?? network.config.forking.blockNumber,
      noDeploy: noDeploy,
      noReset: true,
    })
  }

  log('')
}

task('fork', 'Forks a chain and starts a JSON-RPC server of that forked chain')
  .addOptionalParam(
    'block',
    'Fork network at a particular block number',
    undefined,
    types.int
  )
  .addFlag(
    'onlyDeployment',
    'Just copies the deployment files without starting a local node'
  )
  .addFlag('noDeploy', 'Prevents deploy script from executing')
  .setAction(forkNetwork)

subtask('fork:fund-deployer').setAction(async (args, hre) => {
  const { ethers, network } = hre

  const [mainAccount] = await hre.getUnnamedAccounts()
  const { deployer } = await hre.getNamedAccounts()
  if (
    ethers.utils.getAddress(mainAccount) !== ethers.utils.getAddress(deployer)
  ) {
    const chain = process.env.FORKING_NETWORK
    if (
      chain === 'mainnet' ||
      chain === 'kovan' ||
      chain === 'rinkeby' ||
      chain === 'ropsten'
    ) {
      await getFunds({
        to: deployer,
        tokenSym: 'ETH',
        amount: hre.ethers.utils.parseEther('1000'),
        hre,
      })
    } else {
      await getFunds({
        to: deployer,
        tokenSym: 'MATIC',
        amount: hre.ethers.utils.parseEther('10000'),
        hre,
      })
    }
  }
})
