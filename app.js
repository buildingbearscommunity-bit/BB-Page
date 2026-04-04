const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1wJrnJffh-a12_tokRme4oH9Owek4jpIe-SCNvyTdmrM/export?format=csv';
const WHATSAPP_NUMBER = '9052312057'; // Customize this

let productsData = [];
let cart = JSON.parse(localStorage.getItem('premium_cart')) || [];

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

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const result = [];
  const headers = lines[0].split(',').map(h => h.trim());
  for(let i=1; i<lines.length; i++){
    if(!lines[i].trim()) continue;
    const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    for(let j=0; j<headers.length; j++){
      let header = headers[j];
      if(header.toLowerCase().includes('name')) header = 'name';
      if(header.toLowerCase().includes('image')) header = 'image';
      if(header.toLowerCase() === 'price') header = 'price';
      if(header.toLowerCase().includes('discount')) header = 'discountPrice';
      obj[header] = currentline[j];
    }
    result.push(obj);
  }
  return result;
}

const DUMMY_PRODUCTS = [
   { id: 1, name: "Premium Wireless Headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", price: "299", discountPrice: "249" },
   { id: 2, name: "Minimalist Smartwatch", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80", price: "199", discountPrice: "149" },
   { id: 3, name: "Mechanical Keyboard", image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80", price: "149", discountPrice: "129" },
   { id: 4, name: "Leather Messenger Bag", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80", price: "120", discountPrice: "99" }
];

async function fetchProducts() {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  try {
    // 1. Try Apps Script API first
    const API_URL = localStorage.getItem('app_api_url');
    if(API_URL && API_URL.includes('script.google.com')) {
        try {
            const res = await fetch(API_URL);
            const json = await res.json();
            console.log("Storefront API Response:", json);
            
            if (Array.isArray(json)) {
                productsData = json;
                productsData.forEach((p, i) => { 
                    if (p.id === undefined) p.id = i; 
                    if (p.discountPrice === undefined && p.discount !== undefined) p.discountPrice = p.discount;
                });
                console.log("Mapped Storefront Data:", productsData);
            } else if(json.status === 'success') {
                productsData = (json.data && json.data.products) ? json.data.products : [];
            }
            
            if (Array.isArray(json) || json.status === 'success') {
                productsData.forEach(p => p.image = convertDriveLink(p.image));
                return;
            }
        } catch (apiError) {
            console.error("API Backend execution failed, falling back to sheet...", apiError);
            const errEl = document.getElementById('errorState');
            if(errEl) {
               errEl.classList.remove('hidden');
               errEl.textContent = 'Backend Error: See Console Log';
            }
        }
    }
  
    // 2. Fallback to old CSV hack
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error('Network or Permissions issue');
    const csvData = await response.text();
    let parsed = parseCSV(csvData);
    if(parsed.length === 0 || !parsed[0].name) {
       productsData = DUMMY_PRODUCTS;
    } else {
        productsData = parsed.map((p, index) => ({
            id: index,
            name: p.name,
            image: convertDriveLink(p.image),
            price: p.price ? p.price.replace(/[^0-9.]/g, '') : '',
            discountPrice: p.discountPrice ? p.discountPrice.replace(/[^0-9.]/g, '') : ''
        }));
    }
  } catch (error) {
    productsData = DUMMY_PRODUCTS;
  } finally {
    loadingState.classList.add('hidden');
    renderProducts(productsData);
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  grid.innerHTML = '';
  
  if(products.length === 0) {
      emptyState.classList.remove('hidden');
      return;
  }
  emptyState.classList.add('hidden');

  products.forEach(product => {
      let priceHtml = '';
      let badgeHtml = '';
      let pOriginal = parseFloat(product.price);
      let pDiscount = parseFloat(product.discountPrice);

      if (pDiscount && pOriginal && pDiscount < pOriginal) {
          const percentOff = Math.round(((pOriginal - pDiscount) / pOriginal) * 100);
          badgeHtml = `<div class="badge-discount">${percentOff}% OFF</div>`;
          priceHtml = `<span class="discount-price">$${pDiscount}</span> <span class="original-price">$${pOriginal}</span>`;
      } else {
          priceHtml = `<span class="discount-price">$${pOriginal || pDiscount}</span>`;
      }
      
      const currentPrice = pDiscount || pOriginal || 0;
      const card = document.createElement('div');
      card.className = 'product-card';
      const safeName = product.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      
      card.innerHTML = `
        ${badgeHtml}
        <div class="card-image-wrap">
           <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400'">
        </div>
        <div class="card-content">
           <h3 class="product-name">${product.name}</h3>
           <div class="price-container">${priceHtml}</div>
           <div class="card-actions">
              <button class="btn-add" onclick="window.addToCart('${product.id}', '${safeName}', ${currentPrice}, '${product.image}')">
                 <i class="ph ph-shopping-bag"></i> Add
              </button>
              <button class="btn-wa" onclick="window.buyNowWhatsApp('${safeName}', ${currentPrice})">
                 Buy Now
              </button>
           </div>
        </div>
      `;
      grid.appendChild(card);
  });
}

window.addToCart = function(id, name, price, image) {
    const existing = cart.find(item => item.id == id);
    if(existing) existing.quantity += 1;
    else cart.push({ id, name, price, image, quantity: 1 });
    window.saveCart();
    window.renderCart();
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
}

window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id != id);
    window.saveCart();
    window.renderCart();
}

window.saveCart = function() {
    localStorage.setItem('premium_cart', JSON.stringify(cart));
    const badge = document.getElementById('cartBadge');
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    if(totalItems > 0) { badge.textContent = totalItems; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
}

window.renderCart = function() {
    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotalPrice');
    container.innerHTML = '';
    let total = 0;
    if(cart.length === 0) {
        container.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
        totalEl.textContent = '$0.00';
        return;
    }
    cart.forEach(item => {
        total += item.price * item.quantity;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.image}" class="cart-item-img">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name} (x${item.quantity})</div>
                <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <button class="cart-item-remove" onclick="window.removeFromCart('${item.id}')"><i class="ph ph-trash"></i></button>
        `;
        container.appendChild(itemEl);
    });
    totalEl.textContent = `$${total.toFixed(2)}`;
}

window.buyNowWhatsApp = function(name, price) {
    const msg = `Hello, I would like to purchase:%0A- ${name} ($${price})`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    // -- APPLY LOGO --
    const customLogo = localStorage.getItem('brand_logo');
    if (customLogo) {
        const defaultText = document.getElementById('brandLogoText');
        const customImg = document.getElementById('brandLogoImg');
        if (defaultText) defaultText.classList.add('hidden');
        if (customImg) {
            customImg.src = convertDriveLink(customLogo);
            customImg.classList.remove('hidden');
        }
    }

    const landingView = document.getElementById('landingView');
    const shopView = document.getElementById('shopView');
    
    document.getElementById('exploreCta').addEventListener('click', () => {
        landingView.classList.replace('active-view', 'hidden-view');
        shopView.classList.replace('hidden-view', 'active-view');
        window.scrollTo(0, 0);
        if(productsData.length === 0) fetchProducts();
    });

    document.getElementById('logoBtn').addEventListener('click', () => {
        shopView.classList.replace('active-view', 'hidden-view');
        landingView.classList.replace('hidden-view', 'active-view');
    });

    const cartBtn = document.getElementById('cartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');

    cartBtn.addEventListener('click', () => { cartSidebar.classList.add('active'); cartOverlay.classList.add('active'); });
    const closeCart = () => { cartSidebar.classList.remove('active'); cartOverlay.classList.remove('active'); };
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderProducts(productsData.filter(p => p.name.toLowerCase().includes(query)));
    });

    document.getElementById('whatsappCheckoutBtn').addEventListener('click', () => {
        if(cart.length === 0) return;
        let msg = "Hello, I would like to place an order:%0A%0A";
        let total = 0;
        cart.forEach(item => {
            msg += `- ${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})%0A`;
            total += item.price * item.quantity;
        });
        msg += `%0A*Total: $${total.toFixed(2)}*`;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');

        // Auto-clear cart after proceeding to checkout
        cart = [];
        window.saveCart();
        window.renderCart();
        document.getElementById('cartSidebar').classList.remove('active');
        document.getElementById('cartOverlay').classList.remove('active');
    });

    window.saveCart();
    window.renderCart();

    window.addEventListener('storage', (e) => {
        if(e.key === 'brand_logo') {
            const customImg = document.getElementById('brandLogoImg');
            const defaultText = document.getElementById('brandLogoText');
            if(e.newValue) {
                if(defaultText) defaultText.classList.add('hidden');
                if(customImg) {
                    customImg.src = convertDriveLink(e.newValue);
                    customImg.classList.remove('hidden');
                }
            } else {
                if(defaultText) defaultText.classList.remove('hidden');
                if(customImg) customImg.classList.add('hidden');
            }
        } else if (e.key === 'app_api_url') {
            fetchProducts();
        }
    });
});
