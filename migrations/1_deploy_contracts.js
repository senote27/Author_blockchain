const BookMarketplace = artifacts.require("BookMarketplace");
const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network, accounts) {
  try {
    // Deploy the contract
    await deployer.deploy(BookMarketplace);
    const bookMarketplace = await BookMarketplace.deployed();
    
    // Get the network ID
    const networkId = await web3.eth.net.getId();
    
    // Create the contract config
    const contractConfig = {
      address: bookMarketplace.address,
      network: network,
      networkId: networkId,
      deployedAt: new Date().toISOString(),
      owner: accounts[0]
    };
    
    // Save contract address and network info
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir);
    }
    
    // Save contract deployment info
    const deploymentInfo = {
      contract: "BookMarketplace",
      ...contractConfig,
      abi: bookMarketplace.abi
    };
    
    fs.writeFileSync(
      path.join(configDir, `${network}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Update environment variables if on development
    if (network === 'development' || network === 'ganache') {
      const envPath = path.join(__dirname, '..', 'backend', '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Update CONTRACT_ADDRESS in .env
      if (envContent.includes('CONTRACT_ADDRESS=')) {
        envContent = envContent.replace(
          /CONTRACT_ADDRESS=.*/,
          `CONTRACT_ADDRESS=${bookMarketplace.address}`
        );
      } else {
        envContent += `\nCONTRACT_ADDRESS=${bookMarketplace.address}`;
      }
      
      fs.writeFileSync(envPath, envContent);
    }
    
    console.log('Contract deployed successfully!');
    console.log('Network:', network);
    console.log('Contract address:', bookMarketplace.address);
    
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
};