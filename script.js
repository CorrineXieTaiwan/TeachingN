// Google Apps Script Web App URL - 請替換成您的實際URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZ2-KEnDTWZh3kcvZbR3hfmkC6MAJLoQyrOdB8xtXr3OdoeF8RzG2f08Z8awK2dWVv/exec';

// 設定選項
const CONFIG = {
    // 是否使用CORS模式（如果Google Apps Script支援CORS，設為true）
    // 注意：Google Apps Script預設不支援CORS，建議使用no-cors模式
    useCORS: false,
    // 請求超時時間（毫秒）
    timeout: 10000
};

let currentPage = 1;
const totalPages = 2;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    updateProgress();
    
    // 表單提交處理
    document.getElementById('lifestyleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitForm();
    });
    
    // 表單驗證
    document.getElementById('basicForm').addEventListener('input', validateForm);
    document.getElementById('lifestyleForm').addEventListener('change', validateLifestyleForm);
});

// 更新進度條
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progress = (currentPage / totalPages) * 100;
    progressFill.style.width = progress + '%';
}

// 下一頁
function nextPage() {
    const form = document.getElementById('basicForm');
    
    // 驗證基本資料表單
    if (form.checkValidity()) {
        currentPage++;
        showPage(currentPage);
        updateProgress();
    } else {
        form.reportValidity();
    }
}

// 上一頁
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
        updateProgress();
    }
}

// 顯示頁面
function showPage(pageNumber) {
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 顯示當前頁面
    document.getElementById(`page${pageNumber}`).classList.add('active');
}

// 驗證表單
function validateForm() {
    const form = document.getElementById('basicForm');
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
        }
    });
    
    // 驗證單選按鈕
    const genderSelected = form.querySelector('input[name="gender"]:checked');
    if (!genderSelected) {
        isValid = false;
    }
}

// 驗證生活習慣表單
function validateLifestyleForm() {
    const form = document.getElementById('lifestyleForm');
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const groups = {};
    
    // 將複選框分組
    checkboxes.forEach(checkbox => {
        const name = checkbox.name;
        if (!groups[name]) {
            groups[name] = [];
        }
        groups[name].push(checkbox);
    });
    
    // 檢查每個組至少有一個選中
    let isValid = true;
    for (const groupName in groups) {
        const hasChecked = groups[groupName].some(cb => cb.checked);
        if (!hasChecked) {
            isValid = false;
            break;
        }
    }
}

// 收集表單數據
function collectFormData() {
    const basicForm = document.getElementById('basicForm');
    const lifestyleForm = document.getElementById('lifestyleForm');
    
    // 收集基本資料
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        gender: document.querySelector('input[name="gender"]:checked')?.value || '',
        age: document.getElementById('age').value.trim(),
        transportation: document.getElementById('transportation').value,
        interest: document.getElementById('interest').value.trim(),
        feedback: document.getElementById('feedback').value.trim() || ''
    };
    
    // 收集生活習慣（複選）
    const food = Array.from(lifestyleForm.querySelectorAll('input[name="food"]:checked')).map(cb => cb.value);
    const drink = Array.from(lifestyleForm.querySelectorAll('input[name="drink"]:checked')).map(cb => cb.value);
    const stay = Array.from(lifestyleForm.querySelectorAll('input[name="stay"]:checked')).map(cb => cb.value);
    const travel = Array.from(lifestyleForm.querySelectorAll('input[name="travel"]:checked')).map(cb => cb.value);
    
    // 添加生活習慣數據
    formData.food = food.join(', ');
    formData.drink = drink.join(', ');
    formData.stay = stay.join(', ');
    formData.travel = travel.join(', ');
    formData.timestamp = new Date().toLocaleString('zh-TW');
    
    return formData;
}

// 提交表單 - 使用 Fetch API
async function submitForm() {
    const formData = collectFormData();
    
    // 驗證生活習慣表單
    if (!formData.food || !formData.drink || !formData.stay || !formData.travel) {
        showError('請至少選擇每個生活習慣選項中的一個項目');
        return;
    }
    
    // 顯示載入狀態
    const submitBtn = document.querySelector('#lifestyleForm .btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    
    try {
        // 建立AbortController用於超時控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
        
        // 準備fetch選項
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            signal: controller.signal
        };
        
        // 根據設定選擇使用CORS或no-cors模式
        if (CONFIG.useCORS) {
            fetchOptions.mode = 'cors';
        } else {
            fetchOptions.mode = 'no-cors';
        }
        
        // 使用 Fetch API 發送請求
        const response = await fetch(GOOGLE_SCRIPT_URL, fetchOptions);
        
        clearTimeout(timeoutId);
        
        // 處理響應
        if (CONFIG.useCORS) {
            // CORS模式：可以讀取響應
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    showSuccessPage();
                } else {
                    throw new Error(result.message || '提交失敗');
                }
            } else {
                throw new Error(`HTTP錯誤: ${response.status}`);
            }
        } else {
            // no-cors模式：無法讀取響應，假設成功
            // 實際資料已發送，Google Apps Script會處理
            showSuccessPage();
        }
        
    } catch (error) {
        console.error('提交錯誤:', error);
        
        // 處理不同類型的錯誤
        let errorMessage = '提交失敗，請稍後再試';
        
        if (error.name === 'AbortError') {
            errorMessage = '請求超時，請檢查網路連線後再試';
        } else if (error instanceof TypeError) {
            errorMessage = '網路錯誤，請檢查連線狀態';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// 顯示錯誤訊息
function showError(message) {
    // 建立錯誤提示元素
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(255, 68, 68, 0.4);
        z-index: 10000;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    // 3秒後自動移除
    setTimeout(() => {
        errorDiv.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 3000);
}

// 添加錯誤訊息動畫樣式
if (!document.querySelector('#errorStyles')) {
    const style = document.createElement('style');
    style.id = 'errorStyles';
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        @keyframes slideUp {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
        }
    `;
    document.head.appendChild(style);
}

// 顯示成功頁面
function showSuccessPage() {
    currentPage++;
    showPage(currentPage);
    updateProgress();
    
    // 重置表單（可選）
    setTimeout(() => {
        // 如果需要重置表單，取消下面的註釋
        // document.getElementById('basicForm').reset();
        // document.getElementById('lifestyleForm').reset();
        // currentPage = 1;
        // showPage(currentPage);
        // updateProgress();
    }, 5000);
}

// 使用Google Forms的方式（替代方案）
// 如果Google Apps Script無法使用，可以使用Google Forms
function submitToGoogleForms(formData) {
    // 這是使用Google Forms的替代方案
    // 需要先建立Google Form並獲取表單ID
    const formId = 'YOUR_GOOGLE_FORM_ID';
    
    // 注意：Google Forms需要特殊的提交方式
    // 建議使用Google Apps Script Web App
}


