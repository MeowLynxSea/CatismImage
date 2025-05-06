from flask import Flask, request
from flask_cors import CORS
from routes.auth import auth_bp
from routes.images import images_bp
from routes.payment import payment_bp
from pymongo import MongoClient
from config import Config
import json
import time

app = Flask(__name__, static_folder='static')
CORS(app)

# 注册蓝图
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(images_bp, url_prefix='/images')
app.register_blueprint(payment_bp, url_prefix='/payment')

# 初始化MongoDB连接
client = MongoClient(Config.MONGO_URI)
db = client[Config.MONGO_DB]

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/upload.html')
def upload():
    return app.send_static_file('upload.html')

@app.route('/dashboard.html')
def dashboard():
    return app.send_static_file('dashboard.html')

@app.route('/orders.html')
def orders():
    return app.send_static_file('orders.html')

from flask_sock import Sock
from models import User
sock = Sock(app)

@sock.route('/ws/user-info')
def user_info_ws(ws):
    try:
        while True:
            # Get actual user info from database
            key = ws.environ.get('QUERY_STRING', '').split('key=')[1].split('&')[0] if 'key=' in ws.environ.get('QUERY_STRING', '') else None
            user = User.get_user(key) if key else None
            
            user_data = {
                'nickname': user['nickname'] if user else 'Invalid User',
                # 'register_time': user['register_time'].isoformat() if user else None,
                'meowcoin': float(user['meowcoin']) if user else 0.0,
                'traffic': {
                    'traffic_limit': int(user['traffic_limit']) if user else 0,
                    'current_month_traffic': int(user['current_month_traffic']) if user else 0,
                    'monthly_traffic': user.get('monthly_traffic', {}) if user else {}
                },
                'storage': {
                    'upload_count': int(user['upload_count']) if user else 0,
                    'storage_limit': int(user['storage_limit']) if user else 0,
                    'used_storage': int(user['used_storage']) if user else 0
                }
            }
            
            try:
                ws.send(json.dumps(user_data))
            except Exception as e:
                print(f"WebSocket send error: {e}")
                break
            time.sleep(5)
    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        try:
            ws.close()
        except:
            pass

if __name__ == '__main__':
    app.run(host=Config.HOST, port=Config.PORT)