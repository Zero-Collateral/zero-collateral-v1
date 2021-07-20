import { Tokens } from '../types/custom/config-types'

const mainnetDappAddresses: Tokens = {
  aaveLendingPoolAddressProvider: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
  sushiswapV2RouterAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  uniswapV2RouterAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  compoundComptrollerAddress: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
}

const polygonDappAddresses: Tokens = {
  aaveLendingPoolAddressProvider: '0xd05e3E715d945B59290df0ae8eF85c1BdB684744',
  sushiswapV2RouterAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  uniswapV2RouterAddress: '0x0000000000000000000000000000000000000000',
  compoundComptrollerAddress: '',
}

export const dapps: Record<string, Tokens> = {
  mainnet: mainnetDappAddresses,
  kovan: mainnetDappAddresses,
  rinkeby: mainnetDappAddresses,
  ropsten: mainnetDappAddresses,
  polygon: polygonDappAddresses,
  polygon_mumbai: polygonDappAddresses,
  hardhat: polygonDappAddresses,
}
