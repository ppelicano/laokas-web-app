# Lost Art of Keeping a Secret - Laokas Dapp

## ENS Subdomain Factory Smart Contracts

A Dapp built for keeping secrets in a decentralized manner. It uses ENS Ethereum name service to create a subdomain for each account. This subdomain will then hold a TXT record that links to the IPFS secret file.

## Public/Private Key Encryption/Decryption

The current account public key will encrypt the secret content before storing it to IPFS. The decryption will be achieved uppon grant of decryption from current account (via private key). Private key is never visible during the process.


## Live app in Goerli testnet: https://goerli.laokas.com