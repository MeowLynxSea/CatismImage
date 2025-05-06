// 登录表单处理
function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    const toastEl = document.createElement('div');
    
    toastEl.className = `toast show align-items-center text-white bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    // 自动移除Toast
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => {
            toastEl.remove();
        }, 300);
    }, 3000);
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('loginKey').value;
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`欢迎回来, ${data.nickname}!`, 'success');
            // 保存key到localStorage
            localStorage.setItem('userKey', key);
            // 登录成功后跳转到仪表盘
            window.location.href = '/dashboard.html';
        } else {
            showToast(`登录失败: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('登录请求出错:', error);
        showToast('登录请求出错', 'danger');
    }
});

// 注册表单处理
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = document.getElementById('registerNickname').value;
    
    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`注册成功! 您的密钥是: ${data.key}`, 'success');
            // 自动填充登录表单
            document.getElementById('loginKey').value = data.key;
            // 切换到登录标签页
            document.getElementById('login-tab').click();
        } else {
            showToast(`注册失败: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('注册请求出错:', error);
        showToast('注册请求出错', 'danger');
    }
});