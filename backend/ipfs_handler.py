import ipfshttpclient
import magic
import os
from fastapi import UploadFile
import shutil

class IPFSHandler:
    def __init__(self):
        self.client = None

    def connect(self):
        try:
            self.client = ipfshttpclient.connect('/ip4/127.0.0.1/tcp/5001')
        except Exception as e:
            raise Exception(f"Failed to connect to IPFS: {str(e)}")

    async def upload_file(self, file: UploadFile) -> str:
        if not self.client:
            self.connect()

        # Create temp directory if it doesn't exist
        if not os.path.exists("temp"):
            os.makedirs("temp")

        # Save file temporarily
        temp_path = f"temp/{file.filename}"
        try:
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Upload to IPFS
            result = self.client.add(temp_path)
            return result['Hash']

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def get_file(self, ipfs_hash: str) -> bytes:
        if not self.client:
            self.connect()
        
        return self.client.cat(ipfs_hash)