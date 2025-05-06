from flask import Blueprint, request, jsonify
from models import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    nickname = data.get('nickname')
    
    if not nickname:
        return jsonify({'error': '请输入昵称'}), 400
    
    key = User.create_user(nickname)
    return jsonify({'key': key}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    key = data.get('key')
    
    if not key:
        return jsonify({'error': 'Key is required'}), 400
    
    user = User.get_user(key)
    if not user:
        return jsonify({'error': '密钥无效'}), 401
    
    return jsonify({'nickname': user['nickname']}), 200

@auth_bp.route('/userinfo', methods=['GET'])
def user_info():
    key = request.args.get('key')
    if not key:
        return jsonify({'error': 'Key is required'}), 400
    
    user = User.get_user(key)
    if not user:
        return jsonify({'error': 'Invalid key'}), 401
    
    return jsonify({
        'nickname': user['nickname'],
        'register_time': user['register_time'],
        'upload_count': user['upload_count'],
        'storage_limit': user['storage_limit'],
        'used_storage': user['used_storage'],
        'traffic_limit': user['traffic_limit'],
        'current_month_traffic': user['current_month_traffic'],
        'monthly_traffic': user.get('monthly_traffic', {})
    }), 200

@auth_bp.route('/update_nickname', methods=['POST'])
def update_nickname():
    data = request.get_json()
    key = data.get('key')
    new_nickname = data.get('new_nickname')
    
    if not key or not new_nickname:
        return jsonify({'error': 'Key and new nickname are required'}), 400
    
    user = User.get_user(key)
    if not user:
        return jsonify({'error': '密钥无效'}), 401
    
    User.update_nickname(key, new_nickname)
    return jsonify({'message': 'Nickname updated successfully'}), 200

@auth_bp.route('/get_theme', methods=['GET'])
def get_theme():
    key = request.args.get('key')
    if not key:
        return jsonify({'error': 'Key is required'}), 400
    
    user = User.get_user(key)
    if not user:
        return jsonify({'error': '密钥无效'}), 401
    
    return jsonify({
        'theme_mode': user['custom'].get('theme_preference', 'light'),
        'theme_color': user['custom'].get('theme_color', '#3296fa')
    }), 200

@auth_bp.route('/update_theme', methods=['POST'])
def update_theme():
    data = request.get_json()
    key = data.get('key')
    theme_preference = data.get('theme_mode')
    theme_color = data.get('theme_color')
    
    if not key or not theme_preference or not theme_color:
        return jsonify({'error': 'Key, theme_preference and theme_color are required'}), 400
    
    user = User.get_user(key)
    if not user:
        return jsonify({'error': '密钥无效'}), 401
    
    User.collection.update_one(
        {'key': key},
        {'$set': {
            'custom.theme_preference': theme_preference,
            'custom.theme_color': theme_color
        }}
    )
    return jsonify({'message': 'Theme updated successfully'}), 200