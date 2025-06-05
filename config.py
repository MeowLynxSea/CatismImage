import os
import sys
from dotenv import load_dotenv

load_dotenv()

class Config:
    
    # S3配置
    S3_ENDPOINT = os.getenv('S3_ENDPOINT')
    S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY')
    S3_SECRET_KEY = os.getenv('S3_SECRET_KEY')
    S3_BUCKET = os.getenv('S3_BUCKET')
    
    # MongoDB配置
    MONGO_URI = os.getenv('MONGO_URI')
    MONGO_DB = os.getenv('MONGO_DB')

    ENABLE_NSFW_FILTER = os.getenv('ENABLE_NSFW_FILTER')
    NSFWPY_ENDPOINT = os.getenv('NSFWPY_ENDPOINT')
    NSFWPY_THRESHOLD = os.getenv('NSFWPY_THRESHOLD')

    if(S3_ACCESS_KEY == None or S3_SECRET_KEY == None or S3_BUCKET == None or S3_ENDPOINT == None):
        print("错误：缺少必需的S3环境变量")
        sys.exit(1)

    if(MONGO_URI == None or MONGO_DB == None):
        print("错误：缺少必需的MongoDB环境变量")
        sys.exit(1)

    # 服务监听配置
    HOST = '0.0.0.0'
    PORT = 5000