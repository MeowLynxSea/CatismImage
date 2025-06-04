from flask import Blueprint, request, jsonify, Response
import boto3
from botocore.client import Config
from config import Config as AppConfig
from models import User
from pymongo import MongoClient
from bson import ObjectId
import datetime
import requests

# 初始化MongoDB连接
client = MongoClient(AppConfig.MONGO_URI)
db = client[AppConfig.MONGO_DB]

images_bp = Blueprint('images', __name__)

# 初始化S3客户端
s3 = boto3.client(
    's3',
    endpoint_url=AppConfig.S3_ENDPOINT,
    aws_access_key_id=AppConfig.S3_ACCESS_KEY,
    aws_secret_access_key=AppConfig.S3_SECRET_KEY,
    config=Config(signature_version='s3v4')
)

@images_bp.route('/upload', methods=['POST'])
def upload_image():
    # 验证用户key
    key = request.form.get('key')
    if not key:
        return jsonify({'error': 'Key is required'}), 400
    
    user = User.get_user(key)
    if not user:
        return jsonify({'error': '用户账户无效'}), 401
    
    # 处理上传的文件
    if 'file' not in request.files:
        return jsonify({'error': '文件上传失败'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
        
    # 检查文件类型
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    if '.' not in file.filename or file.filename.split('.')[-1].lower() not in allowed_extensions:
        return jsonify({'error': '不支持的文件类型'}), 400
        
    # 检查文件内容是否为有效图片
    try:
        from PIL import Image
        import io
        
        # 直接使用PIL验证图片内容
        try:
            file.seek(0)
            img = Image.open(file)
            img.verify()
            file.seek(0)
        except Exception:
            return jsonify({'error': '无效的图片文件'}), 400
    except Exception:
        return jsonify({'error': '无效的图片文件'}), 400
        
    # 如果启用了NSFW检查
    if AppConfig.ENABLE_NSFW_FILTER:
        print("NSFW检查已启用")
        file.seek(0)
        try:
            response = requests.post(
                f"{AppConfig.NSFWPY_ENDPOINT}/classify",
                files={'image': file},
                headers={'accept': 'application/json'}
            )
            response.raise_for_status()
            nsfw_data = response.json()
            
            # 检查NSFW评分
            if nsfw_data.get('neutral', 0) + nsfw_data.get('drawing', 0) < 0.5:
                return jsonify({'error': '图片内容不符合安全标准'}), 403
            
            file.seek(0)
        except Exception as e:
            return jsonify({'error': f'NSFW检查失败: {str(e)}'}), 500

    # 获取文件大小并检查存储空间
    file.seek(0, 2)  # 移动到文件末尾
    file_size = file.tell()  # 获取文件大小(字节)
    file.seek(0)  # 重置文件指针
    
    if user['used_storage'] + file_size > user['storage_limit']:
        return jsonify({'error': '存储空间不足'}), 403
    
    # 生成唯一文件名: 用户key_时间戳.扩展名
    import time
    filename = f"{key}_{int(time.time())}.{file.filename.split('.')[-1]}"
    
    try:
        # 生成缩略图并上传
        from PIL import Image
        import io
        
        # 创建缩略图
        file.seek(0)  # Rewind file pointer before processing
        img = Image.open(file)
        img.thumbnail((128, 128))
        
        # 转换为webp格式
        thumb_filename = f"thumb_{filename.split('.')[0]}.webp"
        thumb_buffer = io.BytesIO()
        img.save(thumb_buffer, format='WEBP')
        thumb_buffer.seek(0)
        
        # 上传缩略图
        try:
            s3.upload_fileobj(
                thumb_buffer,
                AppConfig.S3_BUCKET,
                thumb_filename,
                ExtraArgs={'ACL': 'public-read'}
            )
        finally:
            thumb_buffer.close()
            
        # 获取文件大小
        file.seek(0, 2)  # 移动到文件末尾
        file_size = file.tell()  # 获取文件大小(字节)
        file.seek(0)  # 重置文件指针
        
        # 存储图片信息到MongoDB并立即返回响应
        image_id = db.images.insert_one({
            'filename': filename,
            'thumb_filename': thumb_filename,
            'owner_key': key,
            'created_at': datetime.datetime.utcnow(),
            'size': file_size,
            'upload_status': 'pending'
        }).inserted_id
        
        # 立即返回响应
        response = jsonify({
            'url': f'/images/{str(image_id)}',
            'thumb_url': f'/images/thumb/{str(image_id)}',
            'message': '图片正在上传中'
        })
        
        # 同步上传原文件到S3
        try:
            s3.upload_fileobj(
                file,
                AppConfig.S3_BUCKET,
                filename,
                ExtraArgs={'ACL': 'public-read'}
            )
            
            # 更新上传状态和用户信息
            db.images.update_one(
                {'_id': image_id},
                {'$set': {'upload_status': 'completed'}}
            )
            User.increment_upload_count(key)
            User.update_storage(key, file_size)
            
            return response, 200
        except Exception as e:
            db.images.update_one(
                {'_id': image_id},
                {'$set': {'upload_status': 'failed', 'error': str(e)}}
            )
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@images_bp.route('/<image_id>', methods=['GET'])
def get_image(image_id):
    try:
        # 验证image_id格式
        if not ObjectId.is_valid(image_id):
            return jsonify({'error': 'Invalid image ID format'}), 400
            
        # 从MongoDB获取图片信息
        image_data = db.images.find_one({'_id': ObjectId(image_id)})
        if not image_data:
            return jsonify({'error': 'Image not found'}), 404
            
        # 获取用户key并验证流量限制
        owner_key = image_data['owner_key']
        if owner_key:
            owner_user = User.get_user(owner_key)
            if owner_user:
                # 检查当月流量是否超出限制
                if owner_user['current_month_traffic'] + image_data['size'] > owner_user['traffic_limit']:
                    return jsonify({'error': '本月流量已用完，无法访问原图'}), 403
            
        # 从S3获取图片并返回
        response = s3.get_object(
            Bucket=AppConfig.S3_BUCKET,
            Key=image_data['filename']
        )
        
        # 记录流量使用
        
        owner_user = User.get_user(owner_key)
        if owner_user:
            User.update_traffic(owner_key, image_data['size'])
        
        return Response(
            response['Body'].read(),
            mimetype=response['ContentType']
        )
    except Exception as e:
        import logging
        logging.error(f"Error getting image {image_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@images_bp.route('/thumb/<image_id>', methods=['GET'])
def get_thumbnail(image_id):
    try:
        # 验证image_id格式
        if not ObjectId.is_valid(image_id):
            return jsonify({'error': 'Invalid image ID format'}), 400
            
        # 从MongoDB获取图片信息
        image_data = db.images.find_one({'_id': ObjectId(image_id)})
        if not image_data:
            return jsonify({'error': 'Image not found'}), 404
            
        # 从S3获取缩略图并返回
        response = s3.get_object(
            Bucket=AppConfig.S3_BUCKET,
            Key=image_data['thumb_filename']
        )
        
        return Response(
            response['Body'].read(),
            mimetype=response['ContentType']
        )
    except Exception as e:
        import logging
        logging.error(f"Error getting thumbnail {image_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@images_bp.route('/user_images', methods=['GET'])
def get_user_images():
    try:
        user_key = request.args.get('key')
        if not user_key:
            return jsonify({'error': 'User key is required'}), 400
            
        # 验证用户是否存在
        user = User.get_user(user_key)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # 获取用户上传的所有图片
        images = list(db.images.find({'owner_key': user_key}))
        
        # 转换ObjectId为字符串并添加后端转发URL
        for img in images:
            img['_id'] = str(img['_id'])
            img['url'] = f'/images/{img["_id"]}'
            img['thumb_url'] = f'/images/thumb/{img["_id"]}'
            img['created_at'] = (img['created_at'] + datetime.timedelta(hours=8)).strftime('%Y-%m-%d %H:%M:%S')
            
        return jsonify({'images': images})
    except Exception as e:
        import logging
        logging.error(f"Error getting user images: {str(e)}")
        return jsonify({'error': str(e)}), 500

@images_bp.route('/<image_id>', methods=['DELETE'])
def delete_image(image_id):
    try:
        # 验证用户key
        key = request.json.get('key')
        if not key:
            return jsonify({'error': 'Key is required'}), 400
            
        # 验证用户是否存在
        user = User.get_user(key)
        if not user:
            return jsonify({'error': 'Invalid key'}), 401
            
        # 验证image_id格式
        if not ObjectId.is_valid(image_id):
            return jsonify({'error': 'Invalid image ID format'}), 400
            
        # 查找图片记录
        image_data = db.images.find_one({'_id': ObjectId(image_id)})
        if not image_data:
            return jsonify({'error': 'Image not found'}), 404
            
        # 验证图片所有者
        if image_data['owner_key'] != key:
            return jsonify({'error': 'Unauthorized to delete this image'}), 403
            
        # 从S3删除原文件和缩略图
        s3.delete_object(Bucket=AppConfig.S3_BUCKET, Key=image_data['filename'])
        s3.delete_object(Bucket=AppConfig.S3_BUCKET, Key=image_data['thumb_filename'])
        
        # 从数据库删除记录
        # 获取图片大小
        image_size = image_data['size']
        
        # 更新用户上传计数和存储使用情况
        User.decrement_upload_count(key)
        User.update_storage(key, -image_size)
        db.images.delete_one({'_id': ObjectId(image_id)})
        
        return jsonify({'message': 'Image deleted successfully'}), 200
    except Exception as e:
        import logging
        logging.error(f"Error deleting image {image_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500