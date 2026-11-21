async function main() {
  const contract = await ethers.deployContract("FileSharing");
  await contract.waitForDeployment();
  console.log(`FileSharing deployed to: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
