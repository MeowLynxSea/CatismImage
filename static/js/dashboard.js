// WebSocket连接和消息处理逻辑
let socket;

// 充值功能
function initRechargeButton() {
    const rechargeBtn = document.getElementById('rechargeBtn');
    if (!rechargeBtn) return;
    
    // 处理充值按钮点击
    rechargeBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('rechargeModal'));
        modal.show();
    });
    
    // 处理确认充值按钮点击
    document.addEventListener('click', (e) => {
        if (e.target.id === 'confirmRechargeBtn') {
            const amount = document.getElementById('rechargeAmount').value;
            if (!amount || isNaN(amount) || amount <= 0) {
                showToast('请输入有效的充值金额', 'danger');
                return;
            }
            
            // 构建充值URL并打开新窗口
            const userKey = localStorage.getItem('userKey');
            const url = `https://ifdian.net/order/create?product_type=1&plan_id=7a9ac9d628ee11f088ef5254001e7c00&sku=[{%22sku_id%22:%227aa2922428ee11f0a9945254001e7c00%22,%22count%22:${amount}}]&viokrz_ex=0&remark=${userKey}`;
            
            showToast('成功发起充值请求，请在新窗口完成支付', 'info');
            setTimeout(() => {
                window.open(url, '_blank');
            }, 1000);
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('rechargeModal'));
            modal.hide();
        }
    });
}

function onSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        if(data.nickname) document.getElementById('userNickname').textContent = data.nickname;
        if(data.meowcoin) document.getElementById('userMeowcoin').textContent = data.meowcoin.toFixed(2);
        
        if(data.traffic) {
        const usedTrafficMB = (data.traffic.current_month_traffic / (1024 * 1024)).toFixed(2);
        const totalTrafficMB = (data.traffic.traffic_limit / (1024 * 1024)).toFixed(2);
        const trafficPercentage = Math.round((data.traffic.current_month_traffic / data.traffic.traffic_limit) * 100);
        
        const trafficCollapse = document.getElementById('trafficDetails');
        let isTrafficCollapsed = false;
        if(trafficCollapse)
            isTrafficCollapsed = trafficCollapse.classList.contains('show');
        else
            isTrafficCollapsed = false;

        // 按月流量统计
        let monthlyTrafficHTML = '';
        if (data.traffic.monthly_traffic) {
            monthlyTrafficHTML = '<div class="mt-3"><h5>月流量统计</h5>';
            
            // 按年月排序
            const sortedMonths = Object.keys(data.traffic.monthly_traffic).sort().reverse();
            
            // 找出最大流量值
            const maxTraffic = Math.max(...Object.values(data.traffic.monthly_traffic));
            
            sortedMonths.forEach(month => {
                const trafficMB = (data.traffic.monthly_traffic[month] / (1024 * 1024)).toFixed(2);
                monthlyTrafficHTML += `
                    <div class="mb-2">
                        <small>${month}: ${trafficMB} MB</small>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-info" role="progressbar" 
                                style="width: ${maxTraffic > 0 ? (data.traffic.monthly_traffic[month] / maxTraffic) * 100 : 0}%" data-theme-color="progress-bar">
                            </div>
                        </div>
                    </div>
                `;
            });
            
            monthlyTrafficHTML += '</div>';
        }
        
        document.getElementById('trafficUsage').innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
            <button class="btn btn-sm btn-outline-secondary toggle-traffic" type="button" data-bs-toggle="collapse" data-bs-target="#trafficDetails">
                流量使用 ${usedTrafficMB} MB / ${totalTrafficMB} MB
                <i class="bi bi-chevron-down ms-1"></i>
            </button>
            </div>
            <div class="collapse ${isTrafficCollapsed ? 'show' : ''}" id="trafficDetails">
            <div class="progress mb-2 mt-2" style="height: 20px;">
                <div class="progress-bar" role="progressbar" style="width: ${trafficPercentage}%" data-theme-color="progress-bar" 
                    aria-valuenow="${trafficPercentage}" aria-valuemin="0" aria-valuemax="100">
                ${trafficPercentage}%
                </div>
            </div>
            ${monthlyTrafficHTML}
            </div>
        `;
        }
        
        if(data.storage) {
        const usedMB = (data.storage.used_storage / (1024 * 1024)).toFixed(2);
        const totalMB = (data.storage.storage_limit / (1024 * 1024)).toFixed(2);
        const storagePercentage = Math.round((data.storage.used_storage / data.storage.storage_limit) * 100);
        
        document.getElementById('storageUsage').innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
            <span class="text">
                存储空间 ${usedMB} MB / ${totalMB} MB
            </span>
            </div>
            <div class="show" id="storageDetails">
            <div class="progress mb-2 mt-2" style="height: 20px;">
                <div class="progress-bar" role="progressbar" style="width: ${storagePercentage}%" data-theme-color="progress-bar" 
                    aria-valuenow="${storagePercentage}" aria-valuemin="0" aria-valuemax="100">
                ${storagePercentage}%
                </div>
            </div>
            <small class="text" id="uploadCount">上传图片数: ${data.storage.upload_count}</small>
            </div>
        `;
        }
    } catch (e) {
        console.error('WebSocket消息解析错误:', e);
    }
}

// 获取用户主题设置
function fetchUserTheme() {
    const userKey = localStorage.getItem('userKey');
    if (!userKey) return Promise.resolve(null);
    
    return fetch(`/auth/get_theme?key=${userKey}`)
        .then(response => {
            if (!response.ok) throw new Error('获取主题失败');
            return response.json();
        })
        .then(theme => {
            // 更新取色器颜色
            const colorPicker = document.getElementById('themeColorPicker');
            if (colorPicker) {
                colorPicker.value = theme.theme_color;
            }
            
            // 更新主题模式按钮状态
            document.querySelectorAll('[data-theme]').forEach(btn => {
                btn.classList.remove('active');
                if(btn.getAttribute('data-theme') === theme.theme_mode) {
                    btn.classList.add('active');
                }
            });
            
            return theme;
        })
        .catch(error => {
            console.error('获取主题错误:', error);
            return null;
        });
}

function initWebSocket() {
  const userKey = localStorage.getItem('userKey');
  socket = new WebSocket(`ws://${window.location.host}/ws/user-info?key=${userKey}`);
  
  // 初始化时获取并应用主题
  fetchUserTheme().then(theme => {
    if (theme) {
      updateThemeColors(theme.theme_color);
      document.documentElement.setAttribute('data-theme', theme.theme_mode);
    }
  });
  
  socket.onopen = function() {
    console.log('WebSocket连接已建立');
  };
  
  socket.onmessage = onSocketMessage;
  
  socket.onclose = function() {
    console.log('WebSocket连接已关闭');
    reconnectWebSocket();
  };
  
  socket.onerror = function(error) {
    console.error('WebSocket错误:', error);
    reconnectWebSocket();
  };
}

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const baseDelay = 1000; // 1秒基础延迟

function reconnectWebSocket() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('已达到最大重连次数');
    return;
  }
  
  const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000); // 最大延迟30秒
  reconnectAttempts++;
  
  console.log(`尝试重连 (${reconnectAttempts}/${maxReconnectAttempts}), 等待 ${delay}ms`);
  
  setTimeout(() => {
    const userKey = localStorage.getItem('userKey');
    socket = new WebSocket(`ws://${window.location.host}/ws/user-info?key=${userKey}`);
    socket.onopen = function() {
      reconnectAttempts = 0;
      console.log('WebSocket重新连接成功');
    };
    socket.onmessage = onSocketMessage;
  }, delay);
}

// 更新主题颜色变量
// 监听主题变化
function updateTheme(themeData) {

    console.log('更新主题:', themeData);
  const userKey = localStorage.getItem('userKey');
  if (!userKey) return;

  // 更新本地主题
  if (themeData.theme_color) {
    updateThemeColors(themeData.theme_color);
  }
  if (themeData.theme_mode) {
    document.documentElement.setAttribute('data-theme', themeData.theme_mode);
  }

  // 保存到后端
  fetch('/auth/update_theme', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: userKey,
      ...themeData
    })
  }).catch(error => {
    console.error('保存主题错误:', error);
  });
}

function watchThemeChanges() {
  const userKey = localStorage.getItem('userKey');
  if (!userKey) return;
  
  // 监听主题选择变化
  document.querySelectorAll('[data-theme]').forEach(item => {
    item.addEventListener('click', function() {
      const themeMode = this.getAttribute('data-theme');
      updateTheme({ theme_mode: themeMode, theme_color: document.getElementById('themeColorPicker').value });
    });
  });
  
  // 监听颜色选择器变化
  document.getElementById('themeColorPicker').addEventListener('change', function() {
    updateTheme({ theme_color: this.value, theme_mode: document.documentElement.getAttribute('data-theme') });
  });
}

document.querySelectorAll('[data-theme]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const theme = e.target.getAttribute('data-theme');
    if (theme === 'auto') {
      localStorage.removeItem('manualTheme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      localStorage.setItem('manualTheme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    document.querySelectorAll('[data-theme]').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
  });
});

// 保存主题设置
const saveThemeBtn = document.getElementById('saveThemeBtn');
if (saveThemeBtn) {
  saveThemeBtn.addEventListener('click', function() {
    const userKey = localStorage.getItem('userKey');
    if (!userKey) return;
    
    // 获取主题颜色和模式
    const themeColor = document.getElementById('themeColorPicker').value;
    const themeMode = document.querySelector('[data-theme].active')?.getAttribute('data-theme') || 'auto';
    
    // 更新本地主题
    updateThemeColors(themeColor);
    document.documentElement.setAttribute('data-theme', themeMode);
    
    // 保存到后端
    fetch('/auth/set_theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: userKey,
        theme_color: themeColor,
        theme_mode: themeMode
      })
    })
    .then(response => {
      if (!response.ok) throw new Error('保存主题失败');
      showToast('主题设置已保存', 'success');
      const modal = bootstrap.Modal.getInstance(document.getElementById('themeSettingsModal'));
      modal.hide();
    })
    .catch(error => {
      console.error('保存主题错误:', error);
      showToast('保存主题失败', 'danger');
    });
  });
}

function updateThemeColors(baseColor) {
    // 将16进制颜色转换为RGB
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return {r, g, b};
    };

    // 计算衍生颜色
    const rgb = hexToRgb(baseColor);
    
    // 计算更亮的颜色
    const lighten = (color, percent) => {
        return {
            r: Math.min(255, color.r + Math.round(color.r * percent)),
            g: Math.min(255, color.g + Math.round(color.g * percent)),
            b: Math.min(255, color.b + Math.round(color.b * percent))
        };
    };

    // 计算更暗的颜色
    const darken = (color, percent) => {
        return {
            r: Math.max(0, color.r - Math.round(color.r * percent)),
            g: Math.max(0, color.g - Math.round(color.g * percent)),
            b: Math.max(0, color.b - Math.round(color.b * percent))
        };
    };

    // RGB转16进制
    const rgbToHex = (rgb) => {
        return `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)}`;
    };

    // 设置CSS变量
    document.documentElement.style.setProperty('--theme-color', baseColor);
    document.documentElement.style.setProperty('--theme-color-light', rgbToHex(lighten(rgb, 0.3)));
    document.documentElement.style.setProperty('--theme-color-lighter', rgbToHex(lighten(rgb, 0.6)));
    document.documentElement.style.setProperty('--theme-color-dark', rgbToHex(darken(rgb, 0.3)));
    document.documentElement.style.setProperty('--theme-color-darker', rgbToHex(darken(rgb, 0.6)));
}

// 初始化用户信息
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 显示用户Key
        const userKey = localStorage.getItem('userKey');
        if (userKey) {
            document.getElementById('userKey').textContent = userKey;
            document.getElementById('userMeowcoin').textContent = '0.00';
        }
        
        // 复制Key功能
        document.getElementById('copyKeyBtn').addEventListener('click', function() {
            const keyToCopy = document.getElementById('userKey').textContent;
            if (keyToCopy) {
                navigator.clipboard.writeText(keyToCopy)
                    .then(() => {
                        showToast('Key已复制到剪贴板', 'success');
                    })
                    .catch(err => {
                        console.error('复制失败:', err);
                    });
            }
        });

        // 获取用户信息
        const response = await fetch('/auth/userinfo?key=' + userKey);
        const userInfo = await response.json();
        
        if (response.ok) {
            // 显示用户信息
            document.getElementById('userNickname').textContent = userInfo.nickname;
            document.getElementById('userMeowcoin').textContent = userInfo.meowcoin ? userInfo.meowcoin.toFixed(2) : '0.00';
            const usedMB = (userInfo.used_storage / (1024 * 1024)).toFixed(2);
            const totalMB = (userInfo.storage_limit / (1024 * 1024)).toFixed(2);
            const storagePercentage = Math.round((userInfo.used_storage / userInfo.storage_limit) * 100);

            const usedTrafficMB = (userInfo.current_month_traffic / (1024 * 1024)).toFixed(2);
            const totalTrafficMB = (userInfo.traffic_limit / (1024 * 1024)).toFixed(2);
            const trafficPercentage = Math.round((userInfo.current_month_traffic / userInfo.traffic_limit) * 100);

            document.getElementById('storageUsage').innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span class="text">
                        存储空间 ${usedMB} MB / ${totalMB} MB
                    </span>
                </div>
                <div class="show" id="storageDetails">
                    <div class="progress mb-2 mt-2" style="height: 20px;">
                        <div class="progress-bar" role="progressbar" style="width: ${storagePercentage}%" data-theme-color="progress-bar" 
                            aria-valuenow="${storagePercentage}" aria-valuemin="0" aria-valuemax="100">
                            ${storagePercentage}%
                        </div>
                    </div>
                    <small class="text" id="uploadCount">上传图片数: ${userInfo.upload_count}</small>
                </div>
            `;

            // 按月流量统计
            let monthlyTrafficHTML = '';
            if (userInfo.monthly_traffic) {
                monthlyTrafficHTML = '<div class="mt-3"><h5>月流量统计</h5>';
                
                // 按年月排序
                const sortedMonths = Object.keys(userInfo.monthly_traffic).sort().reverse();
                
                // 找出最大流量值
                const maxTraffic = Math.max(...Object.values(userInfo.monthly_traffic));
                
                sortedMonths.forEach(month => {
                    const trafficMB = (userInfo.monthly_traffic[month] / (1024 * 1024)).toFixed(2);
                    monthlyTrafficHTML += `
                        <div class="mb-2">
                            <small>${month}: ${trafficMB} MB</small>
                            <div class="progress" style="height: 10px;">
                                <div class="progress-bar bg-info" role="progressbar" 
                                    style="width: ${maxTraffic > 0 ? (userInfo.monthly_traffic[month] / maxTraffic) * 100 : 0}%" data-theme-color="progress-bar">
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                monthlyTrafficHTML += '</div>';
            }

            document.getElementById('trafficUsage').innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <button class="btn btn-sm btn-outline-secondary toggle-traffic" type="button" data-bs-toggle="collapse" data-bs-target="#trafficDetails">
                        流量使用 ${usedTrafficMB} MB / ${totalTrafficMB} MB
                        <i class="bi bi-chevron-down ms-1"></i>
                    </button>
                </div>
                <div class="collapse" id="trafficDetails">
                    <div class="progress mb-2 mt-2" style="height: 20px;">
                        <div class="progress-bar" role="progressbar" style="width: ${trafficPercentage}%" data-theme-color="progress-bar" 
                            aria-valuenow="${trafficPercentage}" aria-valuemin="0" aria-valuemax="100">
                            ${trafficPercentage}%
                        </div>
                    </div>
                    ${monthlyTrafficHTML}
                </div>
            `;
            
            // 加载用户图片
            loadUserImages();
        } else {
            showToast(`获取用户信息失败: ${userInfo.error}`, 'danger');
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        }
    } catch (error) {
        console.error('获取用户信息出错:', error);
        if (error instanceof TypeError) {
            showToast('网络连接错误，请检查网络后重试', 'danger');
        } else {
            showToast('获取用户信息出错: ' + (error.message || '未知错误'), 'danger');
        }
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }

    // 初始化WebSocket连接
    initWebSocket();
});

// 退出登录功能
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('userKey');
    window.location.href = '/';
});

// 显示图片操作菜单
let selectedImages = [];

function showImageActionMenu(imgElement, imageData, event = {}) {
    // 检查是否按下了Ctrl键
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.image-action-menu');
    if (existingMenu) existingMenu.remove();
    
    // 处理多选逻辑
    if (isCtrlPressed) {
        // 如果图片已选中，则取消选中
        const index = selectedImages.findIndex(img => img._id === imageData._id);
        if (index > -1) {
            selectedImages.splice(index, 1);
            // 移除所有选中图片的高亮效果
            imgElement.classList.remove('selected-image');
        } else {
            // 添加新选中的图片
            selectedImages.push(imageData);
            imgElement.classList.add('selected-image');
        }
    } else {
        if(selectedImages[0] == imageData && selectedImages.length == 1) {
            document.querySelectorAll('.selected-image').forEach(el => el.classList.remove('selected-image'));
            selectedImages = [];
        } else {
            document.querySelectorAll('.selected-image').forEach(el => el.classList.remove('selected-image'));
            selectedImages = [imageData];
            imgElement.classList.add('selected-image');
        }
    }
    
    // 确保所有选中图片都有高亮效果
    selectedImages.forEach(img => {
        const imgEl = document.querySelector(`[data-id="${img._id}"]`);
        if (imgEl) imgEl.classList.add('selected-image');
    });
    
    // 如果没有选中图片，直接返回
    if (selectedImages.length === 0) return;
    
    // 创建菜单元素
    const menu = document.createElement('div');
    menu.className = 'image-action-menu bg-white shadow rounded p-2';
    menu.style.zIndex = '1060';
    menu.style.minWidth = '150px';
    
    // 固定菜单在屏幕底部中央
    menu.style.position = 'fixed';
    menu.style.bottom = '20px';
    menu.style.left = '50%';
    menu.style.transform = 'translateX(-50%)';
    
    // 根据选中数量调整菜单项
    const previewUrl = selectedImages.length === 1 ? selectedImages[0].url : '';
    const copyLinks = selectedImages.map(img => window.location.origin + img.url).join('\n');
    const deleteIds = selectedImages.map(img => img._id).join(',');
    
    menu.innerHTML = `
        ${selectedImages.length > 1 ? '' : `<button class="btn btn-sm btn-block text-start preview-btn" data-url="${previewUrl}" onclick="previewImage('${previewUrl}')">
            <i class="bi bi-eye"></i> 预览
        </button>`}
        <button class="btn btn-sm btn-block text-start copy-link-btn" data-url="${copyLinks}">
            <i class="bi bi-clipboard"></i> ${selectedImages.length > 1 ? '复制多条链接' : '复制链接'}
        </button>
        <button class="btn btn-sm btn-block text-start download-btn" data-url="${selectedImages.length === 1 ? window.location.origin + selectedImages[0].url : ''}">
            <i class="bi bi-download"></i> ${selectedImages.length > 1 ? '批量下载' : '下载'}
        </button>
        <button class="btn btn-sm btn-block text-start text-danger delete-btn" data-id="${deleteIds}">
            <i class="bi bi-trash"></i> ${selectedImages.length > 1 ? '批量删除' : '删除'}
        </button>
    `;
    
    // 添加菜单到body
    document.body.appendChild(menu);
    
    // 为复制链接按钮添加事件
    menu.querySelector('.copy-link-btn').addEventListener('click', () => {
        const urls = menu.querySelector('.copy-link-btn').getAttribute('data-url');
        navigator.clipboard.writeText(urls)
            .then(() => {
                showToast(selectedImages.length > 1 ? '多条链接已复制到剪贴板' : '链接已复制到剪贴板', 'success');
                menu.remove();
            })
            .catch(err => {
                console.error('复制链接失败:', err);
                showToast('复制链接失败', 'danger');
                menu.remove();
            });
    });
    
    // 为下载按钮添加事件
    menu.querySelector('.download-btn').addEventListener('click', () => {
        if (selectedImages.length > 1) {
            selectedImages.forEach(img => {
                const url = window.location.origin + img.url;
                const filename = url.split('/').pop();
                downloadImage(url, filename);
            });
        } else {
            const url = menu.querySelector('.download-btn').getAttribute('data-url');
            const filename = url.split('/').pop();
            downloadImage(url, filename);
        }
        menu.remove();
    });
    
    // 为删除按钮添加事件
    menu.querySelector('.delete-btn').addEventListener('click', () => {
        const imageIds = menu.querySelector('.delete-btn').getAttribute('data-id').split(',');
        if (imageIds.length > 1) {
            if (confirm(`确定要删除这${imageIds.length}张图片吗？`)) {
                imageIds.forEach(id => deleteImage(id));
            }
        } else {
            deleteImage(imageIds[0]);
        }
        menu.remove();
    });
    
    // 添加取消选择按钮
    const deselectBtn = document.createElement('button');
    deselectBtn.className = 'btn btn-sm btn-block text-start text-secondary';
    deselectBtn.innerHTML = '<i class="bi bi-x-circle"></i> 取消选择';
    deselectBtn.addEventListener('click', () => {
        document.querySelectorAll('.selected-image').forEach(el => el.classList.remove('selected-image'));
        selectedImages = [];
        menu.remove();
    });
    
    menu.append(deselectBtn);
}

// 加载用户图片
// 预览图片函数
function previewImage(url) {
    const previewImage = document.getElementById('previewImage');
    if (!previewImage) {
        console.error('无法获取previewImage元素');
        showToast('预览功能初始化失败', 'danger');
        return;
    }
    

    previewImage.src = url;
    
    const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
    
    // 显示加载提示并隐藏图片
    document.getElementById('loadingIndicator').classList.remove('d-none');
    document.getElementById('previewImage').classList.add('d-none');
    
    modal.show();
    
    // 添加onload事件监听
    previewImage.onload = function() {
        console.log('图片加载完成');
        document.getElementById('loadingIndicator').classList.add('d-none');
        document.getElementById('previewImage').classList.remove('d-none');
    };
    
    // 添加onerror事件监听
    previewImage.onerror = function(e) {
        console.error('图片加载失败');
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.innerHTML = '<p class="text-danger">图片加载失败，请检查流量是否充足</p>';
        console.log(e);
    };
}

async function loadUserImages() {
    try {
        const response = await fetch('/images/user_images?key=' + localStorage.getItem('userKey'));
        const data = await response.json();
        
        if (response.ok) {
            const imageList = document.getElementById('imageList');
            imageList.innerHTML = '';
            const images = data.images;
            
            // 验证返回数据是否为数组
            if (!Array.isArray(images)) {
                console.error('返回数据格式错误: 期望数组但得到', typeof images);
                return;
            }
            
            

// 创建图片预览模态框
const modalHTML = `
<div class="modal fade" id="imagePreviewModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">图片预览</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
                <div id="loadingIndicator" class="d-flex flex-column justify-content-center align-items-center" style="min-height: 300px;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2 mb-0">图片加载中...</p>
                </div>
                <img id="previewImage" src="" class="img-fluid d-none" alt="上传预览图片">
            </div>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

images.forEach(image => {
    const col = document.createElement('div');
    col.className = 'col-3 col-md-3 col-lg-2 p-1';
    
    col.innerHTML = `
        <div class="card h-100" style="aspect-ratio: 1/1">
            <img src="${image.thumb_url || image.url}" 
                 class="card-img-top img-fluid h-100" 
                 style="object-fit: cover; cursor: pointer"
                 alt="用户上传图片" 
                 data-full-url="${image.url}">
        </div>
    `;
    
    // 添加长按事件
    const img = col.querySelector('img');
    img.style.cursor = 'pointer';
    
    img.addEventListener('click', (e) => {
        if (e.button === 0) { // 左键点击
            showImageActionMenu(img, image, e);
        }
    });
    
    imageList.appendChild(col);
});
        } else {
            console.error('加载图片失败:', data.error);
        }
    } catch (error) {
        console.error('加载图片出错:', error);
    }
}

// 下载图片函数
function downloadImage(url, filename) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || 'image';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
            showToast('下载开始', 'success');
        })
        .catch(err => {
            console.error('下载失败:', err);
            showToast('下载失败', 'danger');
        });
}

// 删除图片函数
async function deleteImage(imageId) {
    try {
        const response = await fetch(`/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: localStorage.getItem('userKey')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('图片删除成功', 'success');
            loadUserImages(); // 刷新图片列表
            
            // 获取并更新用户上传计数
            const userKey = localStorage.getItem('userKey');
            const userInfoResponse = await fetch('/auth/userinfo?key=' + userKey);
            const userInfo = await userInfoResponse.json();
            if (userInfoResponse.ok) {
                document.getElementById('uploadCount').textContent = userInfo.upload_count;
                
                // 更新存储空间显示
                const usedMB = (userInfo.used_storage / (1024 * 1024)).toFixed(2);
                const totalMB = (userInfo.storage_limit / (1024 * 1024)).toFixed(2);
                const percentage = Math.round((userInfo.used_storage / userInfo.storage_limit) * 100);

                document.getElementById('storageUsage').innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text">
                            存储空间 ${usedMB} MB / ${totalMB} MB
                        </span>
                    </div>
                    <div class="show" id="storageDetails">
                        <div class="progress mb-2 mt-2" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" style="width: ${percentage}%;" 
                                 aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                                ${percentage}%
                            </div>
                        </div>
                        <small class="text" id="uploadCount">上传图片数: ${userInfo.upload_count}</small>
                    </div>
                `;
            }
        } else {
            showToast(`图片删除失败: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('删除图片出错:', error);
        showToast('删除图片出错', 'danger');
    }
}

// 显示Toast提示
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

// 图片上传功能
// 文件选择变化时自动上传
const fileInput = document.getElementById('imageFile');
fileInput.addEventListener('change', async () => {
    const files = fileInput.files;
    const userKey = localStorage.getItem('userKey');
    
    if (files.length === 0) {
        showToast('请选择图片', 'warning');
        return;
    }
    
    // 顺序上传处理
    let uploadedCount = 0;
    for (const file of files) {
        try {
            await uploadSingleFile(file, userKey, null, () => {
                uploadedCount++;
            });
        } catch (error) {
            console.error('文件上传出错:', error);
        }
    }
    showToast(`${uploadedCount}个文件上传成功`, 'success');
});

// 拖拽上传功能
const dropZone = document.getElementById('dropZone');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

// 点击拖拽区域触发文件选择
dropZone.addEventListener('click', () => {
    document.getElementById('imageFile').click();
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropZone.style.borderColor = '#0d6efd';
}

function unhighlight() {
    dropZone.style.borderColor = '#ccc';
}

dropZone.addEventListener('drop', handleDrop, false);

async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    const userKey = localStorage.getItem('userKey');
    const fileInput = document.getElementById('imageFile');
    
    if (files.length === 0) return;
    
    // 顺序上传处理
    for (const file of files) {
        try {
            await uploadSingleFile(file, userKey, null, () => {
                fileInput.value = '';
            });
        } catch (error) {
            console.error('文件上传出错:', error);
        }
    }
}

// 单文件上传函数
async function uploadSingleFile(file, userKey, submitBtn, onComplete) {
    if (!file.type.match('image.*')) {
        showToast('请上传图片文件', 'warning');
        return;
    }
    
    // 创建进度条元素
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress mt-2';
    progressContainer.style.height = '5px';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    
    progressContainer.appendChild(progressBar);
    document.getElementById('uploadArea').appendChild(progressContainer);
    
    const formData = new FormData();
    formData.append('key', userKey);
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                // 只显示90%的进度，留10%给服务器处理
                const percentComplete = Math.round((e.loaded / e.total) * 90);
                progressBar.style.width = percentComplete + '%';
                progressBar.setAttribute('aria-valuenow', percentComplete);
            }
        });
        
        xhr.onload = async () => {
            try {
                const data = JSON.parse(xhr.responseText);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    // 完成最后10%的进度
                    progressBar.style.width = '100%';
                    progressBar.setAttribute('aria-valuenow', 100);
                    
                    // 显示上传结果
                    const previewUrl = data.thumb_url || data.url;
                    document.getElementById('uploadPreviewImage').src = previewUrl;
                    document.getElementById('uploadResult').classList.remove('d-none');
                    
                    // 创建复制按钮
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'btn btn-sm btn-outline-primary';
                    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> 复制链接';
                    copyBtn.onclick = (e) => {
                        e.preventDefault();
                        const fullUrl = window.location.origin + data.url;
                        navigator.clipboard.writeText(fullUrl)
                            .then(() => showToast('链接已复制', 'success'))
                            .catch(err => console.error('复制失败:', err));
                    };
                    
                    // 替换原有链接元素
                    const urlContainer = document.getElementById('imageUrl');
                    urlContainer.innerHTML = '';
                    urlContainer.appendChild(copyBtn);
                    
                    showToast('图片上传成功', 'success');
                    
                    if (onComplete) {
                        onComplete();
                    }
                    
                    // 确保所有异步操作完成后再resolve
                    try {
                        // 重新加载用户图片和用户信息
                        await loadUserImages();
                        
                        // 移除进度条
                        progressContainer.remove();
                        
                        resolve(data);
                    } catch (innerError) {
                        console.error('异步操作出错:', innerError);
                        reject(innerError);
                    }
                } else {
                    showToast(`上传失败: ${data.error}`, 'danger');
                    reject(new Error(data.error || '上传失败'));
                }
            } catch (error) {
                console.error('上传请求出错:', error);
                showToast('上传请求出错', 'danger');
                reject(error);
            } finally {
                progressContainer.remove();
            }
        };
        
        xhr.onerror = () => {
            console.error('上传请求出错');
            showToast('上传请求出错', 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = '上传';
            progressContainer.remove();
            reject(new Error('上传请求出错'));
        };
        
        xhr.open('POST', '/images/upload');
        xhr.send(formData);
    });
};


// 初始化查询按钮
function initQueryBillButton() {
    const queryBillBtn = document.getElementById('queryBillBtn');
    if (!queryBillBtn) return;
    
    queryBillBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('billQueryModal'));
        modal.show();
    });

    // 设置默认时间范围为一个月前到今天
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    document.getElementById('startDate').valueAsDate = oneMonthAgo;
    document.getElementById('endDate').valueAsDate = today;
    
    function queryBills() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const userKey = localStorage.getItem('userKey');
        
        if (!startDate || !endDate) {
            showToast('请选择开始和结束日期', 'danger');
            return;
        }
        
        fetch(`/payment/orders?start=${startDate}&end=${endDate}&key=${userKey}`)
            .then(response => response.json())
            .then(data => {
                const tableBody = document.getElementById('billTableBody');
                tableBody.innerHTML = '';
                
                if (data.error) {
                    showToast(data.error, 'danger');
                    return;
                }
                
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">没有找到账单记录</td></tr>';
                    return;
                }
                
                data.forEach(bill => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${bill.order_id}</td>
                        <td>${bill.created_at}</td>
                        <td>${bill.amount}</td>
                        <td><span class="badge ${bill.status === 'completed' ? 'bg-success' : 'bg-warning'}">${bill.status == 'completed' ? '已完成' : '未完成'}</span></td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                showToast('查询失败: ' + error.message, 'danger');
            });
    }

    // 处理账单查询提交
    document.getElementById('queryBillSubmit').addEventListener('click', () => {
        queryBills();
    });

    queryBills(); // 初始化时查询账单
}

// 在页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
    initRechargeButton();
    initQueryBillButton();
    watchThemeChanges();
    document.getElementById('saveNicknameBtn').addEventListener('click', async () => {
        const newNickname = document.getElementById('newNickname').value.trim();
        
        if (!newNickname) {
            showToast('请输入新昵称', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/auth/update_nickname', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    key: localStorage.getItem('userKey'),
                    new_nickname: newNickname 
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('userNickname').textContent = newNickname;
                document.getElementById('newNickname').value = '';
                showToast('昵称修改成功', 'success');
                const editNicknameModal = bootstrap.Modal.getInstance(document.getElementById('editNicknameModal'));
                editNicknameModal.hide();
            } else {
                showToast(`昵称修改失败: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('修改昵称出错:', error);
            showToast('修改昵称出错', 'danger');
        }
    });

    document.getElementById('themeSettingsBtn').addEventListener('click', function() {
        var themeSettingsModal = new bootstrap.Modal(document.getElementById('themeSettingsModal'));
        themeSettingsModal.show();
    });
});