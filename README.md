# ChainShare: Blockchain Cloud Sharing

A local development app for uploading file bytes to IPFS and recording their CIDs on an Ethereum compatible blockchain. React provides the UI, ethers.js connects a browser wallet, and a Solidity contract tracks owners and wallet access flags.

## Architecture

```text
Browser (React + ethers.js + wallet)
  |  POST file bytes                 |  transactions and reads
  v                                  v
Local IPFS Kubo API                 FileSharing.sol on Hardhat
  |  returns CID                     |  file ID -> CID, owner, access flags
  v                                  v
IPFS gateway serves bytes          Public on-chain metadata and events
```

Upload flow: the browser sends the selected file to the configured local IPFS API. Kubo returns a CID. The wallet submits that CID to `uploadFile`; the contract assigns an ID and emits `FileUploaded`. The UI reads all records with `fileCount` and `getFile`. An owner can grant or revoke a wallet's access flag. Anyone can check a flag with `hasAccess`.

**Privacy and access limit:** IPFS CIDs, wallet addresses, and contract events are public. Access flags do **not** block downloads through IPFS. Revoking a flag cannot remove a downloaded file or its CID. Encrypt sensitive files before upload and share decryption keys through a separate secure system. This app does not perform encryption or key sharing.

## Project structure

| Path | Purpose |
| --- | --- |
| `contracts/FileSharing.sol` | CID registry, ownership, grant and revoke flags. |
| `test/FileSharing.js` | Contract behavior and permission tests. |
| `scripts/deploy.js` | Deploys the contract and prints its address. |
| `client/src/` | React UI and ethers/IPFS integration. |
| `client/.env.example` | Client configuration template. |

## Run locally

Requires Node.js, npm, a browser wallet such as MetaMask, and [IPFS Kubo](https://docs.ipfs.tech/install/command-line/). Use separate terminals:

1. Install dependencies and test the contract from the project root:

   ```bash
   npm ci
   npm test
   ```

2. Start the local blockchain:

   ```bash
   npm run node
   ```

3. Deploy the contract in another terminal:

   ```bash
   npm run deploy:local
   ```

   Copy the printed contract address. Hardhat's local network uses chain ID `31337` and RPC URL `http://127.0.0.1:8545`. Add that network to your browser wallet. Import one of the development accounts printed by `hardhat node` for local testing only. Never use those keys on a public network.

4. Initialize and run Kubo locally:

   ```bash
   ipfs init
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3000"]'
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["POST"]'
   ipfs daemon
   ```

   Run `ipfs init` only once. Kubo normally serves its API at `http://127.0.0.1:5001` and gateway at `http://127.0.0.1:8080/ipfs`. Keep the API bound to localhost; it grants upload and node control.

5. Configure and start the client from `client/`:

   ```bash
   npm ci
   cp .env.example .env
   npm start
   ```

   Set `REACT_APP_CONTRACT_ADDRESS` in `client/.env` to the deployed address. On PowerShell, use `Copy-Item .env.example .env` instead of `cp` if preferred. Open `http://localhost:3000`, connect the wallet on chain `31337`, and upload a file.

Changing the deployment address or IPFS URLs requires restarting the React development server. The client reads all records, so large deployments would need pagination or event indexing.

## Contract API

| Method | Result |
| --- | --- |
| `uploadFile(cid)` | Records a nonempty CID string and grants the caller an access flag. |
| `grantAccess(fileId, user)` | Owner sets the user's flag to true. |
| `revokeAccess(fileId, user)` | Owner sets the user's flag to false; owner flag stays true. |
| `hasAccess(fileId, user)` | Returns the flag. |
| `getFile(fileId)` | Returns public CID and owner. |

## GitHub

Suggested repository name: `blockchain-ipfs-file-sharing`

Suggested description: React and Solidity app for IPFS file records and wallet based access flags.

Before creating a GitHub repository, initialize Git **inside this folder**. The current environment's existing Git root is `D:/`, which includes unrelated files.
