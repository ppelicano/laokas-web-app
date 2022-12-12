import { encrypt } from 'eth-sig-util'
import { bufferToHex } from 'ethereumjs-util'
import SHA256 from 'crypto-js/sha256'


export const getEH = async (account, prop) => {
    if (typeof prop !== 'object') return null
    let o = {}, key = Object.keys(prop)[0]
    if (!key) return null
    console.log(account, prop[key])
    o[key] = {
        e: await getEncryptedMsg(account, prop[key]),
        //h: SHA256(prop[key]).toString()
    }
    return o
}

export const getEncryptionPublicKey = async (account) => {
    try {
        return await window.ethereum.request({
            method: 'eth_getEncryptionPublicKey',
            params: [account], // you must have access to the specified account
        });
    }
    catch (error) {
        if (error.code === 4001) {
            // EIP-1193 userRejectedRequest error
            console.log("We can't encrypt anything without the key.");
        } else {
            console.error(error);
        }
    }
}

export const getEncryptedMsg = async (account, msg) => {
    let publicKey = await getEncryptionPublicKey(account);
    return bufferToHex(
        Buffer.from(
            JSON.stringify(
                encrypt(
                    publicKey,
                    { data: msg },
                    'x25519-xsalsa20-poly1305'
                )
            ),
            'utf8'
        )
    )
}

export const getDecryptedMsg = async (account, encryptedMessage) => {
    try {
        return await window.ethereum
            .request({
                method: 'eth_decrypt',
                params: [encryptedMessage, account],
            });
    }
    catch (error) {
        console.log(error.message)
    }
}
