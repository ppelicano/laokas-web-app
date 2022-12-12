import '../polyfills'
import 'dotenv/config'
import { useState, useEffect } from 'react'
import Web3 from 'web3'
import Web3Token from 'web3-token'
import Web3Modal from 'web3modal'
import axios from 'axios'
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
//import Contract from './abis/NFT.json'
import { getEncryptedMsg, getDecryptedMsg, getEH } from '../utils/encryption'
import { storeContentToIPFS, publishIPNS, retrieveFiles, retrieveFilesByPath, getIpfsLink, getIpfsPath } from '../utils/web3.storage'
import { validateEmail, validateVerificationCode } from '../utils/string'

import { concatSig, decrypt } from 'eth-sig-util'
import { SHA256 } from 'crypto-js'

const WALLETID_CONTRACT_ID = '0x38db878f9a98da36dedb  3764e26e511b9a8150cc'
const ACCOUNT0_DOMAIN = 'account0.eth'
function Widget() {
  const [web3Modal, setWeb3Modal] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [account, setAccount] = useState(null)
  const [accountMask, setAccountMask] = useState(null)
  const [stepHeader, setStepHeader] = useState(null)
  const [email, setEmail] = useState(null)
  const [isVerificationCodeChallenge, setIsVerificationCodeChallenge] = useState(null)
  const [verificationCode, setVerificationCode] = useState(null)
  const [decryptedWalletId, setDecryptedWalletId] = useState('')
  const [message, setMessage] = useState('')
  const [signingMessage, setSigningMessage] = useState('')
  const [contractNFT, setContractNFT] = useState(null)
  const [userNFTs, setUserNFTs] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [ipfsCid, setIpfsCid] = useState(null)
  const [ens, setEns] = useState(null)
  const [canSendEmail, setCanSendEmail] = useState(null)
  const [canCreateAccount0, setCanCreateAccount0] = useState(null)
  const [accountCreationStatus, setAccountCreationStatus] = useState(null)
  const [step, setStep] = useState(0)
  const [loadingString, setLoadingString] = useState('')
  useEffect(() => {
    setWeb3Modal(new Web3Modal({
      network: 'ropsten', // optional
      //network: 'mainnent', // optional
      cacheProvider: true, // optional
      providerOptions: {}, // required
    }))
  }, [])

  useEffect(() => {
    web3 && web3.eth.getAccounts().then(accounts => {
      let lowerCaseAccount = accounts[0].toLowerCase()
      setAccount(lowerCaseAccount)
    })
  }, [web3])

  useEffect(() => {
    web3 && ens && account && getAccount0TextRecord()
  }, [web3, ens, account])



  const getAccount0TextRecord = async () => {
    const txtRecord = await ens.name(`account-${account}.${ACCOUNT0_DOMAIN}`).getText('eth.account0')
    console.log(txtRecord)
    const account0Response = await retrieveFilesByPath(txtRecord)
    const account0 = JSON.parse(account0Response.content)
    console.log(await getDecryptedMsg(account, account0.email.e))
    console.log(account0.email.h === SHA256('pedropelicano@gmail.com').toString())
  }

  const getToken = async () => {
    const address = (await web3.eth.getAccounts())[0]
    const token = await Web3Token.sign(msg => web3.eth.personal.sign(msg, address), '1d', { 'MESSAGE': 'Proof of email ownership...sending verification code!' })
    return token
  }

  return (
    <div>
      {web3Modal && (
        <button onClick={() => {
          web3Modal.connect().then(provider => {
            setWeb3(new Web3(provider))
            setEns(new ENS({ provider, ensAddress: getEnsAddress('1') }))
          })
        }}>Click me!</button>
      )}
    </div>

  )
}

export default Widget
