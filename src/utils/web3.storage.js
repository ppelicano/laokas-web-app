import { Web3Storage } from 'web3.storage/dist/bundle.esm.min.js';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import * as IPFS from 'ipfs-core'

let _ipfs;
function getAccessToken() {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDA2QzdGMEIwZDU3MzVjQUY1MmY0QjVBRkVhOGZDZjI0RjEwODgwMGYiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NDAwNDI1NDk1NzUsIm5hbWUiOiJjYWJ1bGEifQ.qCqORReZyt8V8_2Mpc1GLrpqiO1U4RwY9l62i8-wmXs"
}

export const makeStorageClient = () => {
  return new Web3Storage({ token: getAccessToken() })
}

export const storeContentToIPFS = async (content, fileName = process.env.REACT_APP_NAME) => {
  const obj = { content: content }
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' })
  const files = [
    new File([blob], fileName)
  ]
  const cid = await storeFilesToIPFS(files);
  return cid
}

export const storeFilesToIPFS = async (files) => {
  const client = makeStorageClient()
  const cid = await client.put(files)
  console.log('stored files with cid:', cid)
  return cid
}

export const retrieveFiles = async (cid) => {
  const ipfs = await getIPFS();
  for await (const buf of ipfs.get(`/ipfs/${cid}/${process.env.REACT_APP_NAME}`)) {
    try {
      if (buf.length) {
        const json = JSON.parse(uint8ArrayToString(buf));
        return json;
      }
    }
    catch (e) {
      console.log('...checking next buffer!');
    }
  }
  return null;
}

export const retrieveFilesByPath = async (path) => {
  const ipfs = await getIPFS();
  for await (const buf of ipfs.get(`/ipfs/${path}`)) {
    try {
      if (buf.length) {
        const json = JSON.parse(uint8ArrayToString(buf));
        return json;
      }
    }
    catch (e) {
      console.log('...checking next buffer!');
    }
  }
  return null;
}

export const getIpfsLink = (txtRecord) => {
  return `https://ipfs.io/ipfs/${txtRecord}`
}

export const getIpfsPath = (cid) => {
  return `${cid}/${process.env.REACT_APP_NAME}`
}

export const publishIPNS = async address => {
  const ipfs = await getIPFS();
  return await ipfs.name.publish(address);
}

const getIPFS = async () => {
  _ipfs = _ipfs ? _ipfs : await await IPFS.create()
  return _ipfs;
}