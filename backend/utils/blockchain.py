# utils/blockchain.py
from web3 import Web3
from eth_account.messages import encode_defunct
from fastapi import HTTPException
import json
from typing import Dict, Any
import os

class BlockchainManager:
    def __init__(self, provider_url="http://127.0.0.1:8545"):
        self.w3 = Web3(Web3.HTTPProvider(provider_url))
        self.contract = None
        self.contract_address = None

    def connect(self) -> bool:
        """Check connection to blockchain"""
        return self.w3.is_connected()

    def load_contract(self, contract_address: str, abi_path: str):
        """Load smart contract"""
        try:
            with open(abi_path, 'r') as file:
                contract_abi = json.load(file)
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=contract_abi['abi']
            )
            self.contract_address = contract_address
            return True
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Contract loading failed: {str(e)}")

    async def verify_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """Verify transaction status"""
        try:
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            return {
                "status": tx_receipt["status"],
                "block_number": tx_receipt["blockNumber"],
                "transaction_hash": tx_hash
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Transaction verification failed: {str(e)}")

    def verify_signature(self, message: str, signature: str, address: str) -> bool:
        """Verify message signature from MetaMask"""
        try:
            message_hash = encode_defunct(text=message)
            recovered_address = self.w3.eth.account.recover_message(
                message_hash, signature=signature
            )
            return recovered_address.lower() == address.lower()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Signature verification failed: {str(e)}")

blockchain = BlockchainManager()