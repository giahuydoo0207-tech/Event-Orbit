const hre = require("hardhat");

async function main() {
  console.log("Bat dau deploy contract ProofBadge...");

  const ProofBadge = await hre.ethers.getContractFactory("ProofBadge");
  const contract = await ProofBadge.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ProofBadge da duoc deploy thanh cong!");
  console.log("Contract Address:", address);
  console.log("Nguoi so huu (Organiser):", await contract.organiser());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
