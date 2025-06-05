# CatismImage 项目

## 项目简介

CatismImage 是一个基于Web的图片存储和管理系统，提供用户友好的界面来上传、管理和查看图片。

## 功能特点

- 用户认证和个性化设置
- 图片上传和管理功能
- 实时流量和存储空间监控
- 主题自定义功能（支持亮色/暗色模式）
- 喵币充值系统
- WebSocket实时数据更新

## 安装指南

1. 确保已安装Python 3.8+
2. 克隆项目仓库
3. 安装Python依赖：

   ```bash
   pip install -r requirements.txt
   ```

4. [可选] 配置NSFWPY

   如果您希望启用NSFW过滤功能，您需要配置NSFWPY。

   请参考[HG-ha/nsfwpy](https://github.com/HG-ha/nsfwpy)，通过您喜欢的方式完成配置。

5. 配置环境变量：

   在.env/系统/Docker添加以下必需环境变量：

   ```plaintext
   # S3存储配置
   S3_ENDPOINT=your_s3_endpoint
   S3_ACCESS_KEY=your_access_key
   S3_SECRET_KEY=your_secret_key
   S3_BUCKET=your_bucket_name
   
   # MongoDB配置
   MONGO_URI=mongodb://your_mongo_uri
   MONGO_DB=your_database_name

   # NSFW过滤配置(目前支持NSFWPY)
   ENABLE_NSFW_FILTER=true/false
   NSFWPY_ENDPOINT=your_nsfwpy_endpoint
   NSFWPY_THRESHOLD=0.5
   ```

6. 运行后端服务：

   ```bsh
   python app.py
   ```

7. 访问前端页面：

   ```bash
   http://localhost:5000
   ```

## 使用说明

1. 注册/登录后获取用户Key
2. 使用上传功能添加图片
3. 在仪表板查看存储使用情况和流量统计
4. 通过爱发电回调充值功能获取喵币
5. 在设置中自定义主题颜色和模式

## 技术栈

- 前端：HTML5, CSS3, JavaScript, Bootstrap
- 后端：Python Flask
- 数据库：MongoDB
- 实时通信：WebSocket

## 贡献指南

欢迎提交Pull Request或报告Issue。请确保代码风格一致并通过所有测试
