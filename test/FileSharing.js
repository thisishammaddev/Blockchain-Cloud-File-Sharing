const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FileSharing", function () {
  async function setup() {
    const [owner, recipient, other] = await ethers.getSigners();
    const contract = await ethers.deployContract("FileSharing");
    await contract.waitForDeployment();
    return { contract, owner, recipient, other };
  }

  it("records a CID and grants its owner access", async function () {
    const { contract, owner } = await setup();
    await expect(contract.uploadFile("bafy-example"))
      .to.emit(contract, "FileUploaded")
      .withArgs(1, "bafy-example", owner.address);
    expect(await contract.fileCount()).to.equal(1);
    expect(await contract.getFile(1)).to.deep.equal(["bafy-example", owner.address]);
    expect(await contract.hasAccess(1, owner.address)).to.equal(true);
  });

  it("lets only the owner grant and revoke access", async function () {
    const { contract, owner, recipient, other } = await setup();
    await contract.uploadFile("bafy-example");
    await expect(contract.connect(other).grantAccess(1, recipient.address)).to.be.revertedWith("Not the owner");
    await expect(contract.grantAccess(1, recipient.address)).to.emit(contract, "AccessGranted");
    expect(await contract.hasAccess(1, recipient.address)).to.equal(true);
    await expect(contract.connect(other).revokeAccess(1, recipient.address)).to.be.revertedWith("Not the owner");
    await expect(contract.revokeAccess(1, recipient.address)).to.emit(contract, "AccessRevoked");
    expect(await contract.hasAccess(1, recipient.address)).to.equal(false);
    await expect(contract.revokeAccess(1, owner.address)).to.be.revertedWith("Cannot revoke owner");
  });

  it("rejects invalid metadata and file IDs", async function () {
    const { contract, recipient } = await setup();
    await expect(contract.uploadFile("")).to.be.revertedWith("Empty IPFS hash");
    await expect(contract.getFile(1)).to.be.revertedWith("File does not exist");
    await expect(contract.grantAccess(0, recipient.address)).to.be.revertedWith("File does not exist");
    await contract.uploadFile("bafy-example");
    await expect(contract.grantAccess(1, ethers.ZeroAddress)).to.be.revertedWith("Invalid user");
  });
});
