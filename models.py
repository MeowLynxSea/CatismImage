from pymongo import MongoClient
from config import Config
import random
import string
import datetime
from bson.int64 import Int64
from bson.decimal128 import Decimal128

client = MongoClient(Config.MONGO_URI)
db = client[Config.MONGO_DB]

class User:
    collection = db['users']
    
    @staticmethod
    def generate_key(length=12):
        """生成由小写字母和数字组成的随机key"""
        chars = string.ascii_lowercase + string.digits
        return ''.join(random.choice(chars) for _ in range(length))
    
    @classmethod
    def create_user(cls, nickname):
        """创建新用户并返回生成的key"""
        key = cls.generate_key()
        user_data = {
            'key': key,
            'nickname': nickname,
            'register_time': datetime.datetime.utcnow(),
            'upload_count': Int64(0),
            'storage_limit': Int64(100 * 1024 * 1024),  # 默认100MB
            'used_storage': Int64(0),
            'traffic_limit': Int64(1000 * 1024 * 1024),  # 默认1000MB流量限制
            'monthly_traffic': {
                f"{datetime.datetime.utcnow().year}-{datetime.datetime.utcnow().month}": Int64(0)
            },
            'meowcoin': 0.0,
            'bills': [],
            'custom': {
                'theme_preference': 'light',
                'theme_color': '#3296fa'
            }
        }
        cls.collection.insert_one(user_data)
        return key
        
    @classmethod
    def increment_upload_count(cls, key):
        """增加用户上传图片计数"""
        return cls.collection.update_one(
            {'key': key},
            {'$inc': {'upload_count': 1}}
        )
        
    @classmethod
    def decrement_upload_count(cls, key):
        """减少用户上传图片计数"""
        return cls.collection.update_one(
            {'key': key},
            {'$inc': {'upload_count': -1}}
        )
    
    @classmethod
    def get_user(cls, key):
        """根据key获取用户信息"""
        user = cls.collection.find_one({'key': key})
        if user:
            user['register_time'] = user.get('register_time', datetime.datetime.utcnow())
            user['upload_count'] = Int64(user.get('upload_count', 0))
            user['storage_limit'] = Int64(user.get('storage_limit', 100 * 1024 * 1024))
            user['used_storage'] = Int64(user.get('used_storage', 0))
            user['traffic_limit'] = Int64(user.get('traffic_limit', 1000 * 1024 * 1024))
            # 获取当月流量
            now = datetime.datetime.utcnow()
            month_key = f"{now.year}-{now.month}"
            user['monthly_traffic'] = user.get('monthly_traffic', {})
            user['current_month_traffic'] = Int64(user['monthly_traffic'].get(month_key, 0))
            user['meowcoin'] = float(user.get('meowcoin', 0.0))
            user['bills'] = user.get('bills', [])
            user['custom'] = user.get('custom', {
                'theme_preference': 'light',
                'theme_color': '#3296fa'
            })
        return user
    
    @classmethod
    def update_nickname(cls, key, new_nickname):
        """更新用户昵称"""
        return cls.collection.update_one(
            {'key': key},
            {'$set': {'nickname': new_nickname}}
        )
        
    @classmethod
    def update_storage(cls, key, size):
        """更新用户存储使用情况"""
        return cls.collection.update_one(
            {'key': key},
            {'$inc': {'used_storage': size}}
        )
        
    @classmethod
    def update_traffic(cls, key, size):
        """更新用户流量使用情况"""
        now = datetime.datetime.utcnow()
        month_key = f"{now.year}-{now.month}"
        return cls.collection.update_one(
            {'key': key},
            {'$inc': {
                f'monthly_traffic.{month_key}': size
            }}
        )
        
    @classmethod
    def update_meowcoin(cls, key, amount):
        """更新用户meowcoin余额"""
        return cls.collection.update_one(
            {'key': key},
            {'$inc': {'meowcoin': float(amount)}}
        )
        
    @classmethod
    def add_bill(cls, key, trade_id, user_id, plan_id, show_amount, discount, total_amount):
        """新增账单记录"""
        bill = {
            'trade_id': trade_id,
            'user_id': user_id,
            'plan_id': plan_id,
            'amount': show_amount,
            'discount': discount,
            'actual_amount': total_amount,
            'time': datetime.datetime.utcnow()
        }
        return cls.collection.update_one(
            {'key': key},
            {'$push': {'bills': bill}}
        )