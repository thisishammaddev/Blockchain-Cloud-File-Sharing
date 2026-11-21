import { BrowserProvider, Contract, isAddress } from "ethers";

export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";
export const IPFS_API_URL = process.env.REACT_APP_IPFS_API_URL || "http://127.0.0.1:5001";
export const IPFS_GATEWAY_URL = process.env.REACT_APP_IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs";

const ABI = [
  "function fileCount() view returns (uint256)",
  "function getFile(uint256 fileId) view returns (string ipfsHash, address owner)",
  "function hasAccess(uint256 fileId, address user) view returns (bool)",
  "function uploadFile(string ipfsHash)",
  "function grantAccess(uint256 fileId, address user)",
  "function revokeAccess(uint256 fileId, address user)",
  "event FileUploaded(uint256 fileId, string ipfsHash, address owner)"
];

export async function connectContract() {
  if (!window.ethereum) throw new Error("Install a browser wallet such as MetaMask.");
  if (!isAddress(CONTRACT_ADDRESS)) throw new Error("Set REACT_APP_CONTRACT_ADDRESS in client/.env.");
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress(), contract: new Contract(CONTRACT_ADDRESS, ABI, signer) };
}

export async function uploadToIpfs(file) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${IPFS_API_URL.replace(/\/$/, "")}/api/v0/add?pin=true`, { method: "POST", body });
  if (!response.ok) throw new Error(`IPFS upload failed (${response.status}). Check Kubo API and CORS settings.`);
  const text = await response.text();
  const lastLine = text.trim().split("\n").pop();
  let result;
  try { result = JSON.parse(lastLine); } catch { throw new Error("IPFS returned an invalid response."); }
  if (!result.Hash) throw new Error("IPFS did not return a CID.");
  return result.Hash;
}

export function gatewayLink(cid) {
  return `${IPFS_GATEWAY_URL.replace(/\/$/, "")}/${encodeURIComponent(cid)}`;
}
