
import { useState, useEffect } from 'react';
import Web3 from 'web3';
import Web3Token from 'web3-token';
import Web3Modal from 'web3modal';
import axios from 'axios';
import ENS, { getEnsAddress } from '@ensdomains/ensjs';
//import Contract from './abis/NFT.json';
import { getEncryptedMsg, getDecryptedMsg } from './utils/encryption';
import { storeContentToIPFS, publishIPNS, retrieveFiles } from './utils/web3.storage';

import './App.css';
import { concatSig } from 'eth-sig-util';
require('dotenv').config({ path: '../.env' });

const WALLETID_CONTRACT_ID = '0x38db878f9a98da36dedb3764e26e511b9a8150cc';
const ACCOUNT0_SUBDOMAIN = 'account-0x3836dc86f8ef6e0731bc1db4d9f30fcd185d4dd4';
const ACCOUNT0_SUBDOMAIN2 = 'account-0x295f2d9f87958559c491b52aa68cf85d272a6b82';
const ACCOUNT0_DOMAIN = 'account0.eth';
function App() {
  const [web3Modal, setWeb3Modal] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [decryptedWalletId, setDecryptedWalletId] = useState('');
  const [message, setMessage] = useState('');
  const [signingMessage, setSigningMessage] = useState('');
  const [contractNFT, setContractNFT] = useState(null);
  const [userNFTs, setUserNFTs] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [ipfsCid, setIpfsCid] = useState(null);
  const [ens, setEns] = useState(null);
  console.log('RENDER', web3Modal, web3, account);
  useEffect(() => {
    setWeb3Modal(new Web3Modal({
      network: 'ropsten', // optional
      //network: 'mainnent', // optional
      cacheProvider: true, // optional
      providerOptions: {}, // required
    }));
  }, []);

  useEffect(() => {
    web3Modal && web3Modal.connect().then(provider => {
      setWeb3(new Web3(provider));
      setEns(new ENS({ provider, ensAddress: getEnsAddress('1') }));

    });
  }, [web3Modal]);

  useEffect(() => {
    web3 && web3.eth.getAccounts().then(accounts => setAccount(accounts[0].toLowerCase()));
  }, [web3]);

  const showDecryptedMessage = () => {
    const encryptedWalletId = localStorage.getItem('wallet-id');
    encryptedWalletId && getDecryptedMsg(account, encryptedWalletId).then(value => setDecryptedWalletId(value));
  }

  const toCharCode = (str) => {
    let ascii = '';
    for (var a = 0; a < str.length; a++) {
      ascii += str[a].charCodeAt(0).toString();
    }
    return ascii;
  }


  const sign = async (message) => {

    //THIS ALLOWS YOU TALK TO BLOCKCHAIN
    // Connection to MetaMask wallet
    //const web3 = new Web3(ethereum);
    //await ethereum.request({ method: 'eth_requestAccounts' });
    // getting address from which we will sign message
    const address = (await web3.eth.getAccounts())[0];

    // generating a token with 1 day of expiration time  
    const token = await Web3Token.sign(msg => web3.eth.personal.sign(msg, address), '1d', { 'MESSAGE': message });

    console.log('token', await Web3Token.get);
    // attaching token to authorization header ... for example


    const response = await axios.post('http://localhost:9000/verify', {}, {
      headers: {
        'Authorization': token,
      }
    });
    console.log(response);
  }

  const upload = async (message) => {
    const address = (await web3.eth.getAccounts())[0];
    const token = await Web3Token.sign(msg => web3.eth.personal.sign(msg, address), '1d', { 'MESSAGE': message });
    //const token = 'wrongaddress';
    const response = await axios.post('http://localhost:9000/upload', {}, {
      headers: {
        'Authorization': token,
      }
    });
    console.log(response);
  }
  const saveMessage = async () => {
    //get public key
    let encryptedMsg = await getEncryptedMsg(account, message);
    localStorage.setItem('wallet-id', encryptedMsg);
  }

  const getUserNFTByContract = async () => {
    let _userNFTs = userNFTs ? [...userNFTs] : null;
    if (!_userNFTs) {
      _userNFTs = [...await window.Moralis.Web3.getNFTs({
        chain: 'ropsten',
        address: account
      })];
    }
    const foundNFT = _userNFTs.find(item => item.token_address.toLowerCase() === WALLETID_CONTRACT_ID);
    foundNFT && setContractNFT(foundNFT);
  }

  const getNFTsByAddress = async (address) => {
    let _userNFTs = await window.Moralis.Web3.getNFTs({
      chain: 'ropsten',
      address: address
    });
    setUserNFTs(await getEncryptedMsg(address, JSON.stringify(_userNFTs)));
  }


  const uploadToIPFS = async () => {
    const encryptedContent = await getEncryptedMsg(account, fileContent);
    console.log(encryptedContent);
    const cid = await storeContentToIPFS(encryptedContent);
    console.log(cid)
    setIpfsCid(cid);
  }

  const publishNameIPNS = async () => {
    const addr = `/ipfs/${ipfsCid}`
    console.log(addr);
    const res = await publishIPNS(addr)
    // You now have a res which contains two fields:
    //   - name: the name under which the content was published.
    //   - value: the "real" address to which Name points.
    console.log(`https://gateway.ipfs.io/ipns/${res.name}`, res);
  }

  const getFromIPFS = async () => {
    async function fetchIPFSDoc(ipfsHash) {
      const url = `https://ipfs.moralis.io:2053/ipfs/${ipfsCid}`;
      const response = await fetch(url);
      return await response.json();
    }
  }
  const [publicAccount, setPublicAccount] = useState(null)
  const [publicMessage, setPublicMessage] = useState(null)
  const [publicEncryptionKey, setPublicEncryptionKey] = useState(null)
  const [publicEncryptedProof, setPublicEncryptedProof] = useState(null)
  return (
    <div className='App'>
      <h1>POCS</h1>
      <div className='block'>
        <h2>SIGN MESSAGE</h2>
        <input type='text' value={signingMessage} onInput={e => setSigningMessage(e.target.value)} placeholder='your signing message here...'></input>
        <button onClick={() => sign(signingMessage)} >WEB3 SIGN MESSAGE</button>
        <button onClick={() => upload('upload?')} >CLOUD SIGNED UPLOAD</button>
      </div>

      <div className='block'>
        <h2>ENCRYPT/DECRYPT MESSAGE</h2>
        <input type='text' value={message} onInput={e => setMessage(e.target.value)} placeholder='your message here...'></input>
        <button onClick={saveMessage} >SAVE ENCRYPTED MESSAGE</button>
        <hr />
        <button onClick={showDecryptedMessage} >DECRYPT SAVED MESSAGE</button>
        <div> {decryptedWalletId} </div>
      </div>

      <div className='block'>
        <h2>GET ALL USER NFT's</h2>
        <button onClick={() => getNFTsByAddress(account)} >GET NFT's</button>
        {userNFTs && (
          <div className='cmd-font' onClick={async () => { setUserNFTs(await getDecryptedMsg(account, userNFTs)) }}> {userNFTs} </div>
        )}
      </div>

      <div className='block'>
        <h2>GET USER NFT BY CONTRACT</h2>
        <button onClick={getUserNFTByContract} >GET NFT</button>
        {contractNFT && (
          <div className='cmd-font'>{JSON.stringify(contractNFT)}</div>
        )}
      </div>

      <div className='block'>
        <h2>IPFS</h2>
        <h3>UPLOAD CONTENT</h3>
        <textarea onInput={(e) => setFileContent(e.target.value)} />
        <button onClick={uploadToIPFS} >UPLOAD FILE</button>
        <h3>GET CONTENT</h3>
        <button onClick={async () => {
          if (ipfsCid) {
            const ipfsFileContent = await retrieveFiles(ipfsCid);
            console.log("ipfsFileContent", ipfsFileContent);
            if (ipfsFileContent.content) {
              const decryptedValue = await getDecryptedMsg(account, ipfsFileContent.content);
              console.log(decryptedValue);
            }

          }
        }} >GET FILE</button>
      </div>

      <div className='block'>
        <h2>IPNS</h2>
        {/* <h3>PUBLISH NAME</h3> */}
        {/* <textarea onInput={(e) => setFileContent(e.target.value)} /> */}
        <button onClick={publishNameIPNS} >PUBLISH NAME</button>
      </div>

      <div className='block'>
        <h2>ENS</h2>
        <h3>CREATE WALLETID.ENS SUBDOMAIN</h3>
        <button onClick={async () => {
          console.log("creating subdomain: ", `account-${account}`);
          ens && await ens.name('account0.eth').createSubdomain(`account-${account}`);
          // const address = account;
          // console.log(await ens.getNme(address))
        }} >CREATE SUBDOMAIN</button>

        <button onClick={async () => {
          console.log(`account-${account}.${ACCOUNT0_DOMAIN}`);
          ens && console.log(await ens.name(`nodejs.account0.eth`).setText('eth.account0', 
          `Hey man`
          ));
        }} >SET TEXT</button>
        <button onClick={async () => {
          ens && console.log(await ens.name(`account-${account}.${ACCOUNT0_DOMAIN}`).getText('eth.account0'));
        }} >GET TEXT</button>
      </div>


    </div>


  );
}

export default App;
