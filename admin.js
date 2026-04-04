const ADMIN_PASSWORD = 'HelloChannel';
let API_URL = localStorage.getItem('app_api_url') || '';
let productsData = [];

// DOM Elements
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginBtn = document.getElementById('loginBtn');
const adminPasswordInput = document.getElementById('adminPassword');
const loginError = document.getElementById('loginError');

// Login Logic
function checkSession() {
    if(sessionStorage.getItem('adminAuth') === 'true') {
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        fetchProducts(); // Load table on dashboard load
    }
}

loginBtn.addEventListener('click', () => {
    if(adminPasswordInput.value === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminAuth', 'true');
        checkSession();
    } else {
        loginError.classList.remove('hidden');
    }
});
adminPasswordInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') loginBtn.click();
});
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminAuth');
    window.location.reload();
});

// Init Check
checkSession();

// Sidebar Navigation
const navBtns = document.querySelectorAll('.nav-btn[data-target]');
const sections = document.querySelectorAll('.admin-section');
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sections.forEach(s => s.classList.add('hidden'));
        document.getElementById(btn.getAttribute('data-target')).classList.remove('hidden');
    });
});

// Toast Notifications
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Logo Management
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const logoPlaceholder = document.getElementById('logoPlaceholder');
const saveLogoBtn = document.getElementById('saveLogoBtn');
const clearLogoBtn = document.getElementById('clearLogoBtn');

function loadLogo() {
    const customLogo = localStorage.getItem('brand_logo');
    if (customLogo) {
        logoInput.value = customLogo;
        logoPreview.src = convertDriveLink(customLogo);
        logoPreview.classList.remove('hidden');
        logoPlaceholder.classList.add('hidden');
    } else {
        logoInput.value = '';
        logoPreview.classList.add('hidden');
        logoPlaceholder.classList.remove('hidden');
    }
}
loadLogo();

saveLogoBtn.addEventListener('click', () => {
    const url = logoInput.value.trim();
    if(url) {
        localStorage.setItem('brand_logo', url);
        loadLogo();
        showToast('Logo Saved Successfully');
    } else {
        showToast('Please enter a URL', true);
    }
});

clearLogoBtn.addEventListener('click', () => {
    localStorage.removeItem('brand_logo');
    loadLogo();
    showToast('Logo Cleared');
});

// Database URL Management
const apiUrlInput = document.getElementById('apiUrlInput');
const saveApiUrlBtn = document.getElementById('saveApiUrlBtn');

function loadApiUrl() {
    const url = localStorage.getItem('app_api_url');
    if(url) apiUrlInput.value = url;
}
loadApiUrl();

saveApiUrlBtn.addEventListener('click', () => {
    const url = apiUrlInput.value.trim();
    if(url && url.includes('script.google.com')) {
        localStorage.setItem('app_api_url', url);
        API_URL = url;
        showToast('Database Connected Successfully!');
        fetchProducts();
    } else {
        showToast('Invalid Google Apps Script URL', true);
    }
});

// Product Management
const productModal = document.getElementById('productModal');
const productTableBody = document.getElementById('productsTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');

const addProductBtn = document.getElementById('addProductBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveProductBtn = document.getElementById('saveProductBtn');

const productIdInput = document.getElementById('productId');
const productNameInput = document.getElementById('productName');
const productImageInput = document.getElementById('productImage');
const productPriceInput = document.getElementById('productPrice');
const productDiscountInput = document.getElementById('productDiscount');
const discountCalc = document.getElementById('discountCalc');

const liveImagePreviewBox = document.getElementById('liveImagePreviewBox');
const liveImagePreview = document.getElementById('liveImagePreview');

// Image Transformer
function convertDriveLink(url) {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const idMatches = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatches && idMatches[1]) {
      return `https://drive.google.com/thumbnail?id=${idMatches[1]}&sz=w1000`;
    }
  } else if (url.includes('drive.google.com/open?id=')) {
    const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
    }
  }
  return url;
}

async function fetchProducts() {
    API_URL = localStorage.getItem('app_api_url') || '';
    if(!API_URL || !API_URL.includes('script.google.com')) {
        showToast('Please map your Apps Script API URL in Setttings', true);
        loadingIndicator.classList.add('hidden');
        productTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--danger);">Database Disconnected. Navigate to Brand Settings to paste your Google Apps Script URL!</td></tr>`;
        return;
    }
    
    loadingIndicator.classList.remove('hidden');
    productTableBody.innerHTML = '';
    
    try {
        const response = await fetch(API_URL);
        const json = await response.json();
        console.log("Admin API Response:", json);
        
        if (Array.isArray(json)) {
            // Map the API schema intelligently
            productsData = json.map((p, i) => ({
                id: p.id !== undefined ? p.id : i,
                name: p.name,
                image: p.image,
                price: p.price,
                discountPrice: p.discount !== undefined ? p.discount : (p.discountPrice !== undefined ? p.discountPrice : '')
            }));
            console.log("Mapped Admin Data:", productsData);
            renderTable();
        } else if(json.status === 'success') {
            productsData = (json.data && json.data.products) ? json.data.products : [];
            renderTable();
        } else {
            showToast('Failed to load data: ' + (json.message || 'Invalid format returned'), true);
        }
    } catch (e) {
        showToast('Network error fetching products. See console.', true);
        console.error("Fetch Exception:", e);
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function renderTable() {
    productTableBody.innerHTML = '';

    if(productsData.length === 0) {
        productTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-secondary);">No products added yet. Click 'Add Product' to get started!</td></tr>`;
        return;
    }

    productsData.forEach((p, arrayIndex) => {
        let percentOff = 0;
        let priceNum = parseFloat(p.price);
        let discNum = parseFloat(p.discountPrice);
        if(priceNum && discNum && discNum < priceNum) {
            percentOff = Math.round(((priceNum - discNum) / priceNum) * 100);
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${convertDriveLink(p.image)}" class="table-img" onerror="this.src='https://via.placeholder.com/50'"></td>
            <td>${p.name}</td>
            <td>$${p.price}</td>
            <td>${p.discountPrice ? '$'+p.discountPrice : '-'} ${percentOff > 0 ? '<br><span style="color:#10b981;font-size:0.8rem">('+percentOff+'% OFF)</span>' : ''}</td>
            <td class="actions-cell">
                <!-- Using item ID for editing/deleting specifically -->
                <button class="btn-icon" onclick="editProduct(${p.id})"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-icon" style="color:var(--danger)" onclick="deleteProduct(${p.id})"><i class="ph ph-trash"></i></button>
            </td>
        `;
        productTableBody.appendChild(tr);
    });
}

function openModal(isEdit = false, p = null) {
    productModal.classList.remove('hidden');
    if(isEdit) {
        document.getElementById('modalTitle').textContent = 'Edit Product';
        productIdInput.value = p.id;
        productNameInput.value = p.name;
        productImageInput.value = p.image;
        productPriceInput.value = p.price;
        productDiscountInput.value = p.discountPrice;
        
        const imgUrl = convertDriveLink(p.image);
        if(imgUrl) {
            liveImagePreview.src = imgUrl;
            liveImagePreviewBox.classList.remove('hidden');
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add Product';
        productIdInput.value = '';
        productNameInput.value = '';
        productImageInput.value = '';
        productPriceInput.value = '';
        productDiscountInput.value = '';
        liveImagePreviewBox.classList.add('hidden');
    }
    updateDiscountCalc();
}

productImageInput.addEventListener('input', () => {
    const url = convertDriveLink(productImageInput.value.trim());
    if(url) {
        liveImagePreview.src = url;
        liveImagePreviewBox.classList.remove('hidden');
    } else {
        liveImagePreviewBox.classList.add('hidden');
    }
});

function closeModal() {
    productModal.classList.add('hidden');
}

addProductBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);

window.editProduct = (id) => {
    const p = productsData.find(item => item.id == id); // Notice: loose equality matching array index ID
    if(p) openModal(true, p);
};

// Calculate discount live
function updateDiscountCalc() {
    const p = parseFloat(productPriceInput.value);
    const d = parseFloat(productDiscountInput.value);
    if(p && d && d < p) {
        const percent = Math.round(((p - d) / p) * 100);
        discountCalc.textContent = `${percent}% OFF`;
        discountCalc.classList.remove('hidden');
    } else {
        discountCalc.classList.add('hidden');
    }
}
productPriceInput.addEventListener('input', updateDiscountCalc);
productDiscountInput.addEventListener('input', updateDiscountCalc);

// CRUD Submissions
saveProductBtn.addEventListener('click', async () => {
    const name = productNameInput.value.trim();
    const image = productImageInput.value.trim();
    const price = productPriceInput.value;
    const dp = productDiscountInput.value;
    const id = productIdInput.value;
    
    if(!name || !image || !price) {
        return showToast('Please fill all required fields (*)', true);
    }
    
    saveProductBtn.disabled = true;
    saveProductBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';
    
    const action = id === '' ? 'ADD' : 'EDIT';
    const payload = { action, id, name, image, price, discountPrice: dp };

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(payload)
        });
        
        showToast(`Product ${action === 'ADD' ? 'Added' : 'Updated'} Successfully`);
        closeModal();
        setTimeout(fetchProducts, 1000);
    } catch(e) {
        showToast('Network error or CORS issue. Ensure App Script is running under Me, Anyone.', true);
        console.error(e);
    } finally {
        saveProductBtn.disabled = false;
        saveProductBtn.innerHTML = 'Save Product';
    }
});

window.deleteProduct = async (id) => {
    if(!confirm("Are you sure you want to delete this product?")) return;
    document.body.style.cursor = 'wait';
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({ action: 'DELETE', id })
        });
        
        showToast('Product Deleted Successfully');
        setTimeout(fetchProducts, 1000);
    } catch(e) {
        showToast('Network error.', true);
    } finally {
        document.body.style.cursor = 'default';
    }
};
