import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { getPlatformSettings } from '../../config'
import { ITellerDiamond } from '../../types/typechain'

interface UpdatePlatformSettingsArgs {
  name: string
  value: number
}

export async function updatePlatformSetting(
  args: UpdatePlatformSettingsArgs,
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const { name, value } = args
  const { getNamedSigner, contracts, network, ethers, log } = hre
  log('')
  const deployer = await getNamedSigner('deployer')
  const settingNames = Object.keys(getPlatformSettings(network))
  if (!settingNames.includes(name)) {
    log(`>>>>>> Setting name does not exist: ${name} <<<<<<`, { indent: 1 })
    log('')
    log('Choose from the following list:', { indent: 2 })
    log(settingNames.join('\n'), { indent: 3, star: true })
    return
  }

  const settings = await contracts.get<ITellerDiamond>('TellerDiamond')

  const keccak = ethers.utils.id(name)
  const currentSetting = await settings.getPlatformSetting(keccak)

  await settings.connect(deployer).updatePlatformSetting(keccak, value)

  log(`Platform Settings (Settings: ${settings.address})`, {
    indent: 1,
    star: true,
  })

  log(`${name}:`, { indent: 2, star: true })
  log(`old value:   ${currentSetting.value.toString()}`, {
    indent: 3,
    star: true,
  })
  log(`new value:   ${value}`, { indent: 3, star: true })
  log(`min:         ${currentSetting.min.toString()}`, {
    indent: 3,
    star: true,
  })
  log(`max:         ${currentSetting.max.toString()}`, {
    indent: 3,
    star: true,
  })

  log('')
}

task('update-platform-setting', 'Updates a platform setting value')
  .addParam('name', 'Name of the platform setting')
  .addParam('value', 'Value to update the setting to', null, types.int)
  .setAction(updatePlatformSetting)
