# utils/ipfs.py
import ipfshttpclient
from fastapi import UploadFile, HTTPException
import io

class IPFSManager:
    def __init__(self, ipfs_url="http://127.0.0.1:5001"):
        self.ipfs_url = ipfs_url
        self._client = None

    @property
    def client(self):
        if not self._client:
            try:
                self._client = ipfshttpclient.connect(self.ipfs_url)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"IPFS Connection failed: {str(e)}")
        return self._client

    async def upload_file(self, file: UploadFile) -> str:
        """Upload file to IPFS and return hash"""
        try:
            contents = await file.read()
            file_obj = io.BytesIO(contents)
            result = self.client.add(file_obj)
            return result['Hash']
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IPFS Upload failed: {str(e)}")
        finally:
            await file.close()

    def get_file(self, ipfs_hash: str) -> bytes:
        """Retrieve file from IPFS using hash"""
        try:
            return self.client.cat(ipfs_hash)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"IPFS File not found: {str(e)}")

    def get_gateway_url(self, ipfs_hash: str) -> str:
        """Get public gateway URL for IPFS hash"""
        return f"http://localhost:8080/ipfs/{ipfs_hash}"

ipfs = IPFSManager()