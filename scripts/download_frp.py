import os
import requests
import zipfile
import tarfile

def download_frpc():
    FRP_VERSION = "0.54.0"
    base_url = f"https://github.com/fatedier/frp/releases/download/v{FRP_VERSION}/"
    
    platforms = {
        "linux_amd64": f"frp_{FRP_VERSION}_linux_amd64.tar.gz",
        "windows_amd64": f"frp_{FRP_VERSION}_windows_amd64.zip"
    }
    
    os.makedirs("bin-download", exist_ok=True)
    
    for platform, filename in platforms.items():
        url = base_url + filename
        print(f"Downloading {url}...")
        r = requests.get(url)
        with open(filename, "wb") as f:
            f.write(r.content)
            
        if filename.endswith(".zip"):
            with zipfile.ZipFile(filename, "r") as zip_ref:
                zip_ref.extractall("bin-download")
        else:
            with tarfile.open(filename, "r:gz") as tar_ref:
                tar_ref.extractall("bin-download")
        
        # Move binaries to correct locations
        # [Platform specific subfolders from zip/tar]
        print(f"Extraction complete for {platform}")

# download_frpc()
