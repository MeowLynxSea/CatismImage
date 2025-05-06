from flask import Blueprint, request, jsonify
from models import User
import datetime

payment_bp = Blueprint('payment', __name__)

@payment_bp.route('/orders', methods=['GET'])
def get_orders():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    user_key = request.args.get('key')
    
    if not all([start_date, end_date, user_key]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # 验证用户权限
    user = User.get_user(user_key)
    if not user:
        return jsonify({'error': 'Invalid user key'}), 401
    
    # 筛选账单数据
    try:
        start = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.datetime.strptime(end_date, '%Y-%m-%d')
        end += datetime.timedelta(days=1)
        
        filtered_bills = [
            {
                'order_id': bill.get('trade_id', ''),
                'created_at': bill['time'].isoformat(),
                'amount': bill.get('actual_amount', '0'),
                'status': 'completed'
            }
            for bill in user.get('bills', [])
            if start <= bill['time'] <= end
        ]
        
        return jsonify(filtered_bills), 200
    except ValueError:
        return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400


@payment_bp.route('/ifdian_callback', methods=['POST'])
def ifdian_callback():
    data = request.get_json()
    
    # 验证请求格式
    if not data or 'data' not in data or 'order' not in data['data']:
        return jsonify({'ec': 200, 'error': 'Invalid request format'}), 400
    
    order = data['data']['order']
    
    # 如果product_type为0，直接返回
    if order.get('product_type', 0) == 0:
        return jsonify({'message': 'product_type is 0, no action needed'}), 200
    
    # 处理product_type为1的情况
    if order.get('product_type', 0) == 1:
        key = order.get('remark', '')
        if not key:
            return jsonify({'ec': 200, 'error': 'Missing user key in remark'}), 400
            
        # 获取用户
        user = User.get_user(key)
        if not user:
            return jsonify({'ec': 200, 'error': 'User not found'}), 404
        
        try:
            # 将show_amount转换为浮点数MeowCoin
            meowcoin_amount = float(order.get('show_amount', '0'))
            
            # 更新用户meowcoin余额
            User.update_meowcoin(key, meowcoin_amount)
            
            # 添加账单记录
            User.add_bill(
                key=key,
                trade_id=order.get('out_trade_no', ''),
                user_id=order.get('user_id', ''),
                plan_id=order.get('plan_id', ''),
                show_amount=order.get('show_amount', '0'),
                discount=order.get('discount', '0'),
                total_amount=order.get('total_amount', '0')
            )
            
            return jsonify({'ec': 200}), 200
            
        except ValueError:
            return jsonify({'ec': 200, 'error': 'Invalid amount format'}), 400
        except Exception as e:
            return jsonify({'ec': 200, 'error': str(e)}), 500