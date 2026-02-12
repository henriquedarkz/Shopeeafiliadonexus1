// Firebase Configuration (replace with your actual config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI Elements
const loginScreen = document.getElementById('loginScreen');
const adminBadge = document.getElementById('adminBadge');
const addProductFab = document.getElementById('addProductFab');
const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const productModal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const productForm = document.getElementById('productForm');
const productIdInput = document.getElementById('productId');
const productNameInput = document.getElementById('productName');
const productDescriptionInput = document.getElementById('productDescription');
const productImageInput = document.getElementById('productImage');
const productPriceInput = document.getElementById('productPrice');
const productOriginalPriceInput = document.getElementById('productOriginalPrice');
const productRatingInput = document.getElementById('productRating');
const productLinkInput = document.getElementById('productLink');
const productDetailModal = document.getElementById('productDetailModal');
const detailImage = document.getElementById('detailImage');
const detailName = document.getElementById('detailName');
const detailPrice = document.getElementById('detailPrice');
const detailDescription = document.getElementById('detailDescription');
const detailRating = document.getElementById('detailRating');
const buyNowBtn = document.getElementById('buyNowBtn');
const searchInput = document.getElementById('searchInput');
const toast = document.getElementById('toast');

let currentUser = null;
let isAdmin = false;
let products = [];

// --- Firebase Authentication ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden');
        await checkAdminStatus(user.uid);
        loadProducts();
    } else {
        currentUser = null;
        isAdmin = false;
        loginScreen.classList.remove('hidden');
        adminBadge.style.display = 'none';
        addProductFab.style.display = 'none';
        productsGrid.innerHTML = '';
        emptyState.style.display = 'block';
    }
});

async function checkAdminStatus(uid) {
    const adminDoc = await db.collection('admins').doc(uid).get();
    if (adminDoc.exists) {
        isAdmin = true;
        adminBadge.style.display = 'inline-block';
        addProductFab.style.display = 'flex';
    } else {
        // If no admins exist, make the first user an admin
        const adminCount = await db.collection('admins').get().then(snap => snap.size);
        if (adminCount === 0) {
            await db.collection('admins').doc(uid).set({ uid: uid, email: currentUser.email });
            isAdmin = true;
            adminBadge.style.display = 'inline-block';
            addProductFab.style.display = 'flex';
            showToast('Você é o primeiro administrador!');
        }
    }
}

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        console.error("Google Sign-In Error:", error);
        showToast('Erro ao fazer login com Google.');
    });
}

function logout() {
    auth.signOut().then(() => {
        showToast('Desconectado com sucesso!');
    }).catch(error => {
        console.error("Sign Out Error:", error);
        showToast('Erro ao desconectar.');
    });
}

// --- Product Management ---
async function loadProducts() {
    productsGrid.innerHTML = '';
    emptyState.style.display = 'none';
    db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        displayProducts(products);
    }, error => {
        console.error("Error loading products:", error);
        showToast('Erro ao carregar produtos.');
    });
}

function displayProducts(productsToDisplay) {
    productsGrid.innerHTML = '';
    if (productsToDisplay.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    productsToDisplay.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card', 'fade-in');
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" onclick="openProductDetailModal('${product.id}')">
            <div class="product-info">
                <h3 class="product-title" onclick="openProductDetailModal('${product.id}')">${product.name}</h3>
                <p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}
                    ${product.originalPrice ? `<span class="product-original-price">R$ ${product.originalPrice.toFixed(2).replace('.', ',')}</span>` : ''}
                </p>
                <div class="product-rating">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))} (${product.rating.toFixed(1)})</div>
            </div>
            ${isAdmin ? `
            <div class="admin-actions">
                <button class="admin-btn edit-btn" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i></button>
                <button class="admin-btn delete-btn" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i></button>
            </div>
            ` : ''}
        `;
        productsGrid.appendChild(productCard);
    });
}

async function addProduct(product) {
    try {
        await db.collection('products').add({
            ...product,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Produto adicionado com sucesso!');
    } catch (error) {
        console.error("Error adding product:", error);
        showToast('Erro ao adicionar produto.');
    }
}

async function updateProduct(id, product) {
    try {
        await db.collection('products').doc(id).update(product);
        showToast('Produto atualizado com sucesso!');
    } catch (error) {
        console.error("Error updating product:", error);
        showToast('Erro ao atualizar produto.');
    }
}

async function deleteProduct(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
        await db.collection('products').doc(id).delete();
        showToast('Produto excluído com sucesso!');
    } catch (error) {
        console.error("Error deleting product:", error);
        showToast('Erro ao excluir produto.');
    }
}

// --- Search Functionality ---
function searchProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
    displayProducts(filteredProducts);
}

// --- Modal Functions ---
function openProductModal(productId = '') {
    productForm.reset();
    productIdInput.value = productId;
    if (productId) {
        modalTitle.textContent = 'Editar Produto';
        const product = products.find(p => p.id === productId);
        if (product) {
            productNameInput.value = product.name;
            productDescriptionInput.value = product.description;
            productImageInput.value = product.image;
            productPriceInput.value = product.price;
            productOriginalPriceInput.value = product.originalPrice || '';
            productRatingInput.value = product.rating;
            productLinkInput.value = product.link;
        }
    } else {
        modalTitle.textContent = 'Adicionar Produto';
    }
    productModal.classList.add('active');
}

function closeProductModal() {
    productModal.classList.remove('active');
}

productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const productData = {
        name: productNameInput.value,
        description: productDescriptionInput.value,
        image: productImageInput.value,
        price: parseFloat(productPriceInput.value),
        originalPrice: productOriginalPriceInput.value ? parseFloat(productOriginalPriceInput.value) : null,
        rating: parseFloat(productRatingInput.value),
        link: productLinkInput.value
    };

    if (productIdInput.value) {
        updateProduct(productIdInput.value, productData);
    } else {
        addProduct(productData);
    }
    closeProductModal();
});

function editProduct(productId) {
    openProductModal(productId);
}

function openProductDetailModal(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        detailImage.src = product.image;
        detailImage.alt = product.name;
        detailName.textContent = product.name;
        detailPrice.textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
        detailDescription.textContent = product.description;
        detailRating.innerHTML = `${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))} (${product.rating.toFixed(1)})`;
        buyNowBtn.onclick = () => window.open(product.link, '_blank');
        productDetailModal.classList.add('active');
    }
}

function closeProductDetailModal() {
    productDetailModal.classList.remove('active');
}

// --- Toast Notification ---
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Initial load
// Note: Firebase auth.onAuthStateChanged will trigger loadProducts() after user logs in.
