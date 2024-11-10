import { useState, useEffect } from 'react';
import { Box, Button, Text, VStack, useToast } from '@chakra-ui/react';
import { web3Service } from '../utils/web3';

function WalletConnect({ onConnect }) {
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const toast = useToast();

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const accounts = await web3Service.getAccounts();
            if (accounts.length > 0) {
                await handleAccountConnected(accounts[0]);
            }
        } catch (err) {
            console.error('Connection check failed:', err);
        }
    };

    const handleAccountConnected = async (accountAddress) => {
        try {
            const provider = web3Service.provider;
            const balanceWei = await provider.getBalance(accountAddress);
            const balanceEth = web3Service.formatEther(balanceWei);
            
            setAccount(accountAddress);
            setBalance(balanceEth);
            
            if (onConnect) {
                onConnect(accountAddress);
            }

            toast({
                title: 'Connected to Ganache',
                description: `Account: ${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        } catch (err) {
            console.error('Failed to handle connected account:', err);
            setError('Failed to get account details');
        }
    };

    const connectWallet = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            await web3Service.initialize();
            const account = await web3Service.getCurrentAccount();
            await handleAccountConnected(account);
        } catch (err) {
            console.error('Connection failed:', err);
            setError('Failed to connect to Ganache. Please ensure it is running.');
            toast({
                title: 'Connection Failed',
                description: err.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box p={6} borderWidth={1} borderRadius="lg" maxW="400px" mx="auto">
            <VStack spacing={4}>
                {!account ? (
                    <Button
                        colorScheme="blue"
                        onClick={connectWallet}
                        isLoading={isLoading}
                        loadingText="Connecting..."
                        width="100%"
                    >
                        Connect to Ganache
                    </Button>
                ) : (
                    <>
                        <Text>Connected Account:</Text>
                        <Text fontSize="sm" fontFamily="monospace">
                            {account}
                        </Text>
                        <Text>Balance: {balance} ETH</Text>
                    </>
                )}
                
                {error && (
                    <Text color="red.500" fontSize="sm">
                        {error}
                    </Text>
                )}
            </VStack>
        </Box>
    );
}

export default WalletConnect;