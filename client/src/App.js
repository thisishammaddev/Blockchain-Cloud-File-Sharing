import React, { useCallback, useEffect, useState } from "react";
import { isAddress } from "ethers";
import { connectContract, CONTRACT_ADDRESS, gatewayLink, uploadToIpfs } from "./contract";

function short(value) { return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : ""; }
function errorMessage(error) { return error?.shortMessage || error?.reason || error?.message || "Something went wrong."; }

export default function App() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadFiles = useCallback(async (contract) => {
    const count = Number(await contract.fileCount());
    const rows = await Promise.all(Array.from({ length: count }, async (_, index) => {
      const id = index + 1;
      const [cid, owner] = await contract.getFile(id);
      return { id, cid, owner };
    }));
    setFiles(rows.reverse());
  }, []);

  async function connect() {
    setError(""); setBusy("Connecting wallet…");
    try {
      const next = await connectContract();
      setSession(next);
      await loadFiles(next.contract);
      setMessage(`Connected as ${short(next.address)}`);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(""); }
  }

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const reset = () => { setSession(null); setFiles([]); setSelectedFile(null); setMessage("Wallet or network changed. Reconnect to continue."); };
    window.ethereum.on?.("accountsChanged", reset);
    window.ethereum.on?.("chainChanged", reset);
    return () => { window.ethereum.removeListener?.("accountsChanged", reset); window.ethereum.removeListener?.("chainChanged", reset); };
  }, []);

  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.file.files[0];
    if (!file || !session) return;
    setError(""); setMessage(""); setBusy("Uploading to IPFS…");
    try {
      const cid = await uploadToIpfs(file);
      setBusy("Waiting for blockchain confirmation…");
      const tx = await session.contract.uploadFile(cid);
      await tx.wait();
      await loadFiles(session.contract);
      form.reset();
      setMessage(`File recorded with CID ${cid}. Anyone with the CID can fetch it.`);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(""); }
  }

  async function updateAccess(action) {
    if (!session || !selectedFile) return;
    if (!isAddress(recipient)) { setError("Enter a valid Ethereum wallet address."); return; }
    setError(""); setMessage(""); setBusy(`${action === "grant" ? "Granting" : "Revoking"} access…`);
    try {
      const tx = await session.contract[action === "grant" ? "grantAccess" : "revokeAccess"](selectedFile.id, recipient);
      await tx.wait();
      setMessage(`Access ${action === "grant" ? "granted" : "revoked"} for ${short(recipient)}.`);
      setLookupResult("");
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(""); }
  }

  async function checkAccess(event) {
    event.preventDefault();
    if (!session || !selectedFile) return;
    if (!isAddress(lookupAddress)) { setError("Enter a valid Ethereum wallet address."); return; }
    setError(""); setBusy("Checking access…");
    try { setLookupResult((await session.contract.hasAccess(selectedFile.id, lookupAddress)) ? "Access flag: granted" : "Access flag: not granted"); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(""); }
  }

  const owned = files.filter((file) => file.owner.toLowerCase() === session?.address.toLowerCase()).length;
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">◇</span><span>ChainShare</span></div>
        <div className="header-actions"><span className="network-tag">IPFS + Ethereum</span><button className="wallet-button" onClick={connect} disabled={!!busy}>{session ? short(session.address) : "Connect wallet"}</button></div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span className="pulse" /> DECENTRALIZED FILE RECORDS</div>
          <h1>Files live on IPFS.<br /><em>Ownership lives on chain.</em></h1>
          <p>Upload a file to your local IPFS node, record its CID on Ethereum, and manage wallet access flags from one place.</p>
          <div className="hero-meta"><span>01 / Upload to IPFS</span><span>02 / Record CID</span><span>03 / Manage access</span></div>
        </section>

        <div className="notice"><strong>Privacy note</strong><span>CIDs and owner addresses are public. Access flags do not encrypt or block IPFS downloads. Encrypt sensitive files before upload.</span></div>
        {!CONTRACT_ADDRESS && <div className="alert error">Set <code>REACT_APP_CONTRACT_ADDRESS</code> in <code>client/.env</code> after deployment.</div>}
        {error && <div role="alert" className="alert error">{error}</div>}
        {message && <div role="status" className="alert success">{message}</div>}
        {busy && <div role="status" className="busy">{busy}</div>}

        <section className="workspace">
          <div className="section-heading"><div><span className="section-kicker">WORKSPACE</span><h2>Your file ledger</h2></div><span className="ledger-count">{files.length} records · {owned} owned</span></div>
          <div className="dashboard-grid">
            <div className="main-column">
              <form className="panel upload-panel" onSubmit={upload}>
                <div className="panel-icon">↥</div><h3>Add a file</h3><p>File bytes go to your local IPFS node. Only the resulting CID goes on chain.</p>
                <label className="file-picker">Choose file<input type="file" name="file" required disabled={!session || !!busy} /></label>
                <button className="primary-button" type="submit" disabled={!session || !!busy}>Upload and record <span>↗</span></button>
              </form>
              <div className="panel files-panel">
                <div className="panel-title"><h3>On-chain records</h3><button className="text-button" onClick={() => session && loadFiles(session.contract).catch((err) => setError(errorMessage(err)))} disabled={!session || !!busy}>Refresh ↻</button></div>
                {!session ? <div className="empty-state">Connect your wallet to read file records.</div> : files.length === 0 ? <div className="empty-state">No files recorded yet. Upload the first one.</div> : <div className="file-list">{files.map((file) => <button key={file.id} className={`file-row ${selectedFile?.id === file.id ? "selected" : ""}`} onClick={() => { setSelectedFile(file); setLookupResult(""); }}><span className="file-icon">▤</span><span className="file-info"><strong>File #{file.id}</strong><small>{file.cid}</small></span><span className="file-owner">{file.owner.toLowerCase() === session.address.toLowerCase() ? "OWNER" : short(file.owner)}</span><span className="row-arrow">↗</span></button>)}</div>}
              </div>
            </div>
            <aside className="panel detail-panel">
              <span className="section-kicker">FILE DETAILS</span>
              {!selectedFile ? <div className="detail-empty"><div>◇</div><h3>Select a record</h3><p>Choose a file from the ledger to inspect its CID and manage access.</p></div> : <>
                <h3>File #{selectedFile.id}</h3><div className="detail-field"><label>IPFS CID</label><code>{selectedFile.cid}</code></div><div className="detail-field"><label>OWNER</label><code>{selectedFile.owner}</code></div>
                <a className="gateway-link" href={gatewayLink(selectedFile.cid)} target="_blank" rel="noopener noreferrer">Open via IPFS gateway ↗</a>
                <div className="divider" /><h4>Check access flag</h4><form onSubmit={checkAccess}><label className="sr-only" htmlFor="lookup">Wallet address to check</label><input id="lookup" placeholder="0x wallet address" value={lookupAddress} onChange={(e) => setLookupAddress(e.target.value)} /><button className="secondary-button" disabled={!session || !!busy}>Check access</button></form>{lookupResult && <p className="result">{lookupResult}</p>}
                {selectedFile.owner.toLowerCase() === session?.address.toLowerCase() && <><div className="divider" /><h4>Manage access</h4><label className="sr-only" htmlFor="recipient">Recipient wallet address</label><input id="recipient" placeholder="0x recipient address" value={recipient} onChange={(e) => setRecipient(e.target.value)} /><div className="access-actions"><button className="primary-button" type="button" onClick={() => updateAccess("grant")} disabled={!!busy}>Grant</button><button className="secondary-button" type="button" onClick={() => updateAccess("revoke")} disabled={!!busy}>Revoke</button></div></>}
              </>}
            </aside>
          </div>
        </section>
      </main>
      <footer><span>ChainShare / local development</span><span>Metadata on chain. Bytes on IPFS.</span></footer>
    </div>
  );
}
