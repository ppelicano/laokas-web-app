import '../polyfills'
import { useState, useEffect, useRef } from 'react'
import Web3 from 'web3'
import Web3Token from 'web3-token'
import Web3Modal from 'web3modal'
import ENS, { getEnsAddress } from '@ensdomains/ensjs'
//import Contract from './abis/NFT.json'
import DotAnimation from '../Components/DotAnimation'
import { getDecryptedMsg, getEH, getEncryptedMsg } from '../utils/encryption'
import { storeContentToIPFS, retrieveFilesByPath, getIpfsLink, getIpfsPath, getName } from '../utils/web3.storage'
import { app } from '../utils/constants'
import abi from '../abi.json'
import contractAddresses from '../contract-addresses.json'
import '../css/skeleton.css'
import '../css/custom.css'
const EnsSubdomainFactory = abi.output.contracts["contracts/EnsSubdomainFactory.sol"].EnsSubdomainFactory.abi


const txtRecordKey = "eth.laokas"
function App() {
  const secretTextareaRef = useRef(null)
  const [web3Modal, setWeb3Modal] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [account, setAccount] = useState(null)
  const [accountMask, setAccountMask] = useState(null)
  const [stepHeader, setStepHeader] = useState(null)
  const [ens, setEns] = useState(null)
  const [newSubdomainReceipt, setNewSubdomainReceipt] = useState(null)
  const [secretContract, setSecretContract] = useState(null)
  const [accountCreationStatus, setAccountCreationStatus] = useState(null)
  const [step, setStep] = useState(0)
  const [txtRecord, setTxtRecord] = useState(null)
  const [secret, setSecret] = useState(null)
  const [secretContent, setSecretContent] = useState(null)
  const [secretIpfsLink, setSecretIpfsLink] = useState(null)
  const [secretDns, setSecretDns] = useState(null)
  const [contentIsEditing,setContentIsEditing] = useState(false)
  const [loading, setLoading] = useState("secret-loading")
  useEffect(() => {
    setWeb3Modal(new Web3Modal({
      network: 'goerli', // optional
      //network: 'mainnent', // optional
      cacheProvider: true, // optional
      providerOptions: {}, // required
    }))
  }, [])

  useEffect(() => {
    web3Modal && web3Modal.connect().then(provider => {
      setWeb3(new Web3(provider))
      setEns(new ENS({ provider, ensAddress: getEnsAddress('1') }))
    })
  }, [web3Modal])

  useEffect(() => {
    web3 && web3.eth.getAccounts().then(accounts => {
      web3.eth.defaultAccount = accounts[0]
      let lowerCaseAccount = accounts[0].toLowerCase()
      setAccount(lowerCaseAccount)
      setStep(1)
      setAccountMask(`${lowerCaseAccount.substr(0, 3)}..${lowerCaseAccount.substr(lowerCaseAccount.length - 3, 4)}`)
    })
    !web3 && setLoading(null)

  }, [web3])

  useEffect(() => {
    //POCS
    if (ens && account && !secretContract){
      setSecretContract(new web3.eth.Contract(EnsSubdomainFactory, contractAddresses.EnsSubdomainFactory))
    }

  }, [ens, account])

  useEffect(() => {
    txtRecord && setStep(2);
    txtRecord && getIpfsContentFromTxtRecord(txtRecord)
    //txtRecord && setContractTxtRecord("")
  }, [txtRecord])

  useEffect(() => {
    step === 0 && setStepHeader('STEP 0: INSTALL METAMASK WALLET')
    if (step === 2) {
      setStepHeader('STEP 2: SECRET FILE')
      secretTextareaRef.current?.focus()
    }
  }, [step])

  useEffect(()=>{
    if (secretContract && account) {
      getSubdomainOwner()
      getContractTxtRecord()
    }
  },[secretContract, account])

  useEffect(() => {
    if (secretTextareaRef.current) {
      secretTextareaRef.current.style.height = "0px";
      const scrollHeight = secretTextareaRef.current.scrollHeight;
      secretTextareaRef.current.style.height = scrollHeight + "px";
    }
  }, [secretContent]);

  useEffect(()=>{
    if (contentIsEditing && secretTextareaRef.current) {
      secretTextareaRef.current.focus()
      secretTextareaRef.current.setSelectionRange(secretTextareaRef.current.value.length,secretTextareaRef.current.value.length)
    }
  },[contentIsEditing])

  const getToken = async message => {
    const address = (await web3.eth.getAccounts())[0]
    const token = await Web3Token.sign(msg => web3.eth.personal.sign(msg, address), '1d', { 'MESSAGE': message })
    return token
  }

  const getSubdomainOwner = async () => {
    console.log("secretContract", secretContract)
    try {
      const subdomainReceipt = await secretContract.methods.subdomainOwner().call({ from: account})
      subdomainReceipt.toLowerCase() === account.toLowerCase() && setStep(2)
      console.log("subdomainReceipt", subdomainReceipt)
    }
    catch (ex){
      throw new Error("Error at smart contract execution for method subdomainOwner()", ex);
    }
    

    // const receipt_PingSenderView = await secretContract.methods.pingSenderView()
    // console.log("receipt_PingSenderView", receipt_PingSenderView)

    // const receipt_PingSender = await secretContract.methods.pingSender().send({from: account})
    // console.log("receipt_PingSender", receipt_PingSender)
  }

  const createSecretSubdomain = async () => {
    console.log(await web3.eth.getGasPrice());
    setNewSubdomainReceipt({loading: true})
    const txOptions = {
      nonce: web3.utils.toHex(web3.eth.getTransactionCount(account)),
      //gasLimit: web3.utils.toHex(3000000),
      gasPrice: web3.utils.toHex(await web3.eth.getGasPrice()),
      gas: 2000000,
      from: account
    };
    secretContract && secretContract.methods.newSubdomain().send(txOptions)
          .then((txRaw) => {
            console.log("THEN => ", txRaw)
            setNewSubdomainReceipt({txHash: txRaw.transactionHash})
            window.location.reload();
          })
          .catch((error)=> {
            Object.keys(error).forEach(item => {
              console.log("ERROR CREATING SECRET SUBDOMAIN", error)
              if (item === "receipt" && error?.receipt?.transactionHash) {
                setNewSubdomainReceipt({errorHash: error.receipt.transactionHash})
              }
              else {
                setNewSubdomainReceipt({error: error})
              }
            })
          })
  }

  const saveSecret = async () => {
    const o = await getEH(account, { secret : secretContent.d })
    setLoading('ipfs-save')
    const ipfsCid = await storeContentToIPFS(JSON.stringify(o))
    setLoading('ens-save')
    console.log("ipfsCid", ipfsCid)
    
    const txtSetReceipt = ipfsCid ? await setContractTxtRecord(ipfsCid) : null
    console.log("txtReceipt", txtSetReceipt)
    txtSetReceipt?.status === true && setLoading("secret-updated")
    !txtSetReceipt?.status && setLoading("secret-error")
    window.location.reload()
  }

  const setContractTxtRecord = async (value) => {
    if (!account) return null;
    const txOptions = {
      nonce: web3.utils.toHex(web3.eth.getTransactionCount(account)),
      //gasLimit: web3.utils.toHex(3000000),
      gasPrice: web3.utils.toHex(await web3.eth.getGasPrice()),
      //gas: 1000000,
      from: account
    };
    console.log("setContractTxtRecord", txtRecordKey, value)
    const txtSetReceipt = await secretContract.methods.setText(txtRecordKey, value).send(txOptions)
    return txtSetReceipt;
  }

  const getContractTxtRecord = async () => {
    if (!account) return null; 
    console.log("txtGetReceipt", txtRecordKey)
    try {
      const txtGetReceipt = await secretContract.methods.text(txtRecordKey).call({from: account})
      console.log("LEGIT txtGetReceipt", txtGetReceipt)
      // const txtGetReceipt1 = await secretContract.methods.text(`eth-${"0x295F2d9f87958559c491B52AA68Cf85D272a6B82".toLowerCase()}`,domain,topDomain, txtRecordKey).call()
      // console.log("NON LEGIT txtGetReceipt", txtGetReceipt1)
      setTxtRecord(txtGetReceipt)
      !txtGetReceipt && setLoading(null)
      return txtGetReceipt
    }
    catch (ex){
      console.log(ex)
    }    
  }

  const getIpfsContentFromTxtRecord = async (txtRecord) => {
    const ipfsContent = await retrieveFilesByPath(txtRecord)
    const response = JSON.parse(ipfsContent.content)
    response?.secret?.e && setSecretContent({e: response?.secret?.e})
    setLoading(null)
    setSecretIpfsLink(await getIpfsLink(txtRecord))
  }

  const decryptContent = async () => {
    const d = await getDecryptedMsg(account, secretContent.e)
    setSecretContent({d: d})
  }

  const encryptContent = async () => {
    const e = await getEncryptedMsg(account, secretContent.d)
    setSecretContent({e: e})
  }
console.log("loading, account, step", loading, account, step)
  return (
    <div className='console'>
      <div className='consolebody'>
        {/* step 0 */}
        {!loading && !account && step === 0 && (
          <>
            <p>Please connect with your Metamask wallet.</p>
            <p>Don't have it install it from <a href='https://metamask.io/' target='_blank' rel='noreferrer'>https://metamask.io/</a></p>
          </>
        )
        }
        {/* step 1 */}
        {!loading && account && accountMask && step === 1 && (
          <>
            <p><span className='dir' title={account}>{accountMask}</span>You have no secret account associated with your account</p>
            <p><span className='dir' title={account}>{accountMask}</span>Create your secret file at {`eth-${account}.${app.DOMAIN}`}</p>
            <p>
              {newSubdomainReceipt?.loading &&  <><span className='' onClick={async () => createSecretSubdomain()}>CREATING  <DotAnimation /></span></>}
              {newSubdomainReceipt?.txHash && <p><span className='dir' title={account}>{accountMask}</span>Congratulations {`eth-${account}.${app.DOMAIN}`} created!</p>}
            </p>
          </>
        )}
        {step === 2 && (
          <>{!txtRecord && !loading && (
              <>
                <p><span className='dir' title={account}>{accountMask}</span>Create your first secret</p>
                <p>
                  <textarea ref={secretTextareaRef} className='cursor' onInput={(e) => { setSecretContent({d: e.target.value}) }} ></textarea>
                </p>
              </>
            )}

            {txtRecord && !loading && (
              <>
                <p><span className='dir' title={account}>{accountMask}</span>Your secret file: <a href={secretIpfsLink} target="_blank">link</a> </p>
                
                  {secretContent?.e && !contentIsEditing && (
                    <>
                      <p className='secret'><span>{secretContent.e}</span></p>
                    </>
                  )}
                  {secretContent?.d && !contentIsEditing && (
                    <>
                      <p className='secret' onClick={() => { setContentIsEditing(true) }}>{secretContent.d}</p>
                    </>
                  )}
                  {!secretContent?.e && !secretContent?.d && (
                    <>
                      <p><textarea ref={secretTextareaRef} className='cursor' type='email' onInput={(e) => { setSecretContent({d: e.target.value }) }} /></p>
                    </>
                  )}
                  {contentIsEditing && (
                    <>
                    <p><textarea ref={secretTextareaRef} className='cursor' type='email' onInput={(e) => { setSecretContent({d: e.target.value }) }} >{ secretContent.d }</textarea></p>
                  </>
                  )}
                
              </>
            )}
            
            {loading === 'ipfs-save' && (
              <p><span>creating ipfs file <DotAnimation /></span></p>
            )}
            {loading === 'ens-save' && (
              <p><span>saving dns record <DotAnimation /></span></p>
            )}
            {loading === 'secret-updated' && (
              <p>
                <span >
                  Congratulations secret updated!
                </span>
              </p>
            )}
            {loading === 'secret-error' && (
              <p>
                <span>
                  There was a problem creating your account!
                </span>
              </p>
            )}

          </>
        )}
      </div>
      {step !== 3 && (
        <footer>
          {account && accountMask && step === 1 && !newSubdomainReceipt?.loading && (
            <button className='btn' onClick={async () => createSecretSubdomain()}>RUN</button>
          )}
          {step === 2 && !txtRecord && !loading && (
            <button className='btn' onClick={async () => saveSecret()}>SAVE SECRET</button>
          )}
          {txtRecord && !loading && (
            <>
              {secretContent?.e && !contentIsEditing && (
                <button className='btn' onClick={async () => decryptContent()}>DECRYPT</button>
              )}
              {secretContent?.d && !contentIsEditing && (
                <button className='btn' onClick={async () => encryptContent()}>ENCRYPT</button>
              )}
              {!secretContent?.e && !secretContent?.d && (
                <button className='btn' onClick={async () => saveSecret()}>NO CONTENT</button>
              )}
              {contentIsEditing && (
                <button className='btn' onClick={async () => saveSecret()}>SAVE SECRET</button>
              )}
            </>
          )}
        </footer>
      )}
    </div >

  )
}

export default App
