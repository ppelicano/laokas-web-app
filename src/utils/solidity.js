
import Web3 from 'web3'
import Namehash from 'eth-ens-namehash-ms'
export const bytes32Node = (str) => {
    return '0x' + Web3.utils.padLeft(Namehash.hash(str).replace('0x', ''), 64)
  }
  