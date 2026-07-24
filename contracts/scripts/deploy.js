const hre = require("hardhat");

async function main() {
  console.log("====================================================");
  console.log("Starting ProofBadge Smart Contract Deployment...");
  console.log("====================================================");

  const ProofBadge = await hre.ethers.getContractFactory("ProofBadge");
  const contract = await ProofBadge.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const organiserAddress = await contract.organiser();

  console.log("\nDeployment Successful!");
  console.log("----------------------------------------------------");
  console.log(`ProofBadge Contract Address : ${address}`);
  console.log(`Contract Organiser (Owner)  : ${organiserAddress}`);
  console.log("----------------------------------------------------");
  console.log("\n>>> ADD TO YOUR VERCEL ENVIRONMENT VARIABLES:");
  console.log(`PROOFBADGE_CONTRACT_ADDRESS=${address}`);
  console.log("====================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
