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
   ```
   pip install -r requirements.txt
   ```
4. 配置数据库连接信息
5. 运行后端服务：
   ```
   python app.py
   ```
6. 访问前端页面：
   ```
   http://localhost:5000
   ```

## 使用说明
1. 注册/登录后获取用户Key
2. 使用上传功能添加图片
3. 在仪表板查看存储使用情况和流量统计
4. 通过充值功能获取喵币
5. 在设置中自定义主题颜色和模式

## 技术栈
- 前端：HTML5, CSS3, JavaScript, Bootstrap
- 后端：Python Flask
- 数据库：SQLite/MySQL
- 实时通信：WebSocket

## 贡献指南
欢迎提交Pull Request或报告Issue。请确保代码风格一致并通过所有测试。