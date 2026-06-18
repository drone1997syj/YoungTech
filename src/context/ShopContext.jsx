import React, { createContext, useContext, useState, useEffect } from 'react';

const ShopContext = createContext();

export const useShop = () => useContext(ShopContext);

const getBackendBase = () => {
  const { hostname, protocol, port } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (!isLocalHost || hostname.includes('trycloudflare.com') || hostname.includes('loca.lt')) {
    // Public domain/tunnel: backend serves both frontend and API on same origin.
    return `${protocol}//${hostname}`;
  }

  // Local: backend is on port 5000, frontend on 5174/5173.
  const backendPort = (port === '5174' || port === '5173' || !port) ? '5000' : port;
  return `${protocol}//${hostname}:${backendPort}`;
};
export const BACKEND_BASE_URL = getBackendBase();
const API_BASE = `${BACKEND_BASE_URL}/api`;

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Invalid JSON in localStorage, using fallback value.', error);
    return fallback;
  }
};

const VALID_PAGES = new Set([
  'home',
  'productList',
  'productDetail',
  'cart',
  'login',
  'register',
  'checkout',
  'myPage',
  'admin',
  'additionalInfo'
]);

const PAGE_TO_PATH = {
  home: '/',
  productList: '/products',
  cart: '/cart',
  login: '/login',
  register: '/register',
  checkout: '/checkout',
  myPage: '/mypage',
  admin: '/admin',
  additionalInfo: '/additional-info'
};

const getRouteFromPath = () => {
  const path = window.location.pathname;
  if (path === '/oauth/callback/naver') return { page: 'oauthCallbackNaver', productId: null, persist: false };
  if (path === '/oauth/callback/kakao') return { page: 'oauthCallbackKakao', productId: null, persist: false };
  if (path === '/oauth/callback/google') return { page: 'oauthCallbackGoogle', productId: null, persist: false };
  if (path.startsWith('/products/')) {
    const productId = decodeURIComponent(path.replace('/products/', '').split('/')[0] || '');
    return productId ? { page: 'productDetail', productId, persist: true } : { page: 'productList', productId: null, persist: true };
  }

  const matched = Object.entries(PAGE_TO_PATH).find(([, routePath]) => routePath === path);
  if (matched) return { page: matched[0], productId: null, persist: true };

  return null;
};

const getPathForPage = (page, productId = null) => {
  if (page === 'productDetail' && productId) {
    return `/products/${encodeURIComponent(productId)}`;
  }
  return PAGE_TO_PATH[page] || '/';
};

const getStoredPage = () => {
  const route = getRouteFromPath();
  if (route?.page && VALID_PAGES.has(route.page)) return route.page;

  const storedPage = localStorage.getItem('yt_current_page');
  return VALID_PAGES.has(storedPage) ? storedPage : 'home';
};

const getStoredProductId = () => {
  const route = getRouteFromPath();
  if (route?.page === 'productDetail') return route.productId;
  return localStorage.getItem('yt_selected_product_id') || null;
};

export const ShopProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [compareList, setCompareList] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [page, setPage] = useState(getStoredPage);
  const [selectedProductId, setSelectedProductId] = useState(getStoredProductId);
  const [loading, setLoading] = useState(true);

  // Helper fetch function with JWT injection
  const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('yt_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw {
        ...data,
        message: data.message || '요청 처리에 실패했습니다.',
        status: response.status,
        isWarning: data.isWarning
      };
    }
    return data;
  };

  const navigate = (targetPage, productId = null, options = {}) => {
    setPage(targetPage);
    if (VALID_PAGES.has(targetPage)) {
      localStorage.setItem('yt_current_page', targetPage);
    }
    if (productId) {
      setSelectedProductId(productId);
      localStorage.setItem('yt_selected_product_id', productId);
    } else if (targetPage !== 'productDetail') {
      setSelectedProductId(null);
      localStorage.removeItem('yt_selected_product_id');
    }
    if (!options.skipHistory) {
      const nextPath = getPathForPage(targetPage, productId);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({ page: targetPage, productId }, '', nextPath);
      }
    }
    window.scrollTo(0, 0);
  };
  
  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Initialize and load products and user session
  const fetchProducts = async () => {
    try {
      const data = await apiFetch('/products');
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      setLoading(true);
      await fetchCategories();
      await fetchProducts();

      // Load local cart
      const storedCart = localStorage.getItem('yt_cart');
      if (storedCart) {
        setCart(safeJsonParse(storedCart, []));
      }

      // Check current user token
      const token = localStorage.getItem('yt_token');
      if (token) {
        try {
          const userData = await apiFetch('/auth/me');
          setUser(userData);
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          logout();
        }
      }

      const route = getRouteFromPath();
      if (route?.page) {
        setPage(route.page);
        if (route.productId) {
          setSelectedProductId(route.productId);
          localStorage.setItem('yt_selected_product_id', route.productId);
        }
        if (route.persist && VALID_PAGES.has(route.page)) {
          localStorage.setItem('yt_current_page', route.page);
        } else {
          localStorage.removeItem('yt_current_page');
        }
      } else {
        const restoredPage = getStoredPage();
        const restoredProductId = getStoredProductId();
        setPage(restoredPage);
        if (restoredProductId) setSelectedProductId(restoredProductId);
        const restoredPath = getPathForPage(restoredPage, restoredProductId);
        if (window.location.pathname !== restoredPath) {
          window.history.replaceState({ page: restoredPage, productId: restoredProductId }, '', restoredPath);
        }
      }

      setLoading(false);
    };

    initSession();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteFromPath() || { page: 'home', productId: null, persist: true };
      setPage(route.page);
      if (route.productId) {
        setSelectedProductId(route.productId);
        localStorage.setItem('yt_selected_product_id', route.productId);
      } else if (route.page !== 'productDetail') {
        setSelectedProductId(null);
        localStorage.removeItem('yt_selected_product_id');
      }
      if (route.persist && VALID_PAGES.has(route.page)) {
        localStorage.setItem('yt_current_page', route.page);
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Auth Actions ---
  const login = async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('yt_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, ...err, message: err.message };
    }
  };

  const register = async (email, password, name, phone) => {
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, phone })
      });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('yt_token');
    setUser(null);
    navigate('home');
  };

  // --- Cart Actions ---
  const saveCartToStorage = (updatedCart) => {
    setCart(updatedCart);
    localStorage.setItem('yt_cart', JSON.stringify(updatedCart));
  };

  const handleAddToCart = (product, quantity = 1) => {
    const existingIndex = cart.findIndex(item => item.id === product.id);
    let updatedCart = [...cart];

    if (existingIndex >= 0) {
      updatedCart[existingIndex].quantity += quantity;
    } else {
      updatedCart.push({ ...product, quantity });
    }
    saveCartToStorage(updatedCart);
  };

  const handleUpdateQty = (productId, quantity) => {
    const updatedCart = cart.map(item =>
      item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
    );
    saveCartToStorage(updatedCart);
  };

  const handleRemoveFromCart = (productId) => {
    const updatedCart = cart.filter(item => item.id !== productId);
    saveCartToStorage(updatedCart);
  };

  const handleClearCart = () => {
    saveCartToStorage([]);
  };

  // --- Compare Actions ---
  const addToCompare = (product) => {
    if (compareList.some(item => item.id === product.id)) {
      return { success: false, message: '이미 비교 목록에 추가된 상품입니다.' };
    }
    if (compareList.length >= 3) {
      return { success: false, message: '사양 비교는 최대 3개 상품까지 가능합니다.' };
    }
    setCompareList([...compareList, product]);
    return { success: true };
  };

  const removeFromCompare = (productId) => {
    setCompareList(compareList.filter(item => item.id !== productId));
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  // --- Order Actions ---
  const createOrder = async (orderData) => {
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      handleClearCart();
      return { success: true, orderId: res.orderId };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const fetchOrders = async () => {
    try {
      return await apiFetch('/orders');
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // --- Admin Specific Actions ---
  const fetchAdminStats = async () => {
    return await apiFetch('/admin/dashboard');
  };

  const fetchAllOrders = async () => {
    return await apiFetch('/orders/all');
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const createProduct = async (productData) => {
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
      await fetchProducts(); // Refresh list
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message, isWarning: err.isWarning };
    }
  };

  const updateProduct = async (productId, productData) => {
    try {
      await apiFetch(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
      });
      await fetchProducts(); // Refresh list
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message, isWarning: err.isWarning };
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await apiFetch(`/products/${productId}`, {
        method: 'DELETE'
      });
      await fetchProducts(); // Refresh list
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // --- Review & QnA Actions ---
  const fetchReviews = async (productId) => {
    return await apiFetch(`/products/${productId}/reviews`);
  };

  const createReview = async (productId, rating, comment) => {
    try {
      await apiFetch(`/products/${productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const fetchQnas = async (productId) => {
    return await apiFetch(`/products/${productId}/qna`);
  };

  const createQna = async (productId, title, content, isSecret) => {
    try {
      await apiFetch(`/products/${productId}/qna`, {
        method: 'POST',
        body: JSON.stringify({ title, content, is_secret: isSecret })
      });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const answerQna = async (qnaId, answer) => {
    try {
      await apiFetch(`/qna/${qnaId}/answer`, {
        method: 'PUT',
        body: JSON.stringify({ answer })
      });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const loginWithNaver = async (code, state) => {
    try {
      const data = await apiFetch('/auth/naver', {
        method: 'POST',
        body: JSON.stringify({ code, state })
      });
      if (data.requiresAccountLink) {
        return {
          success: false,
          requiresAccountLink: true,
          linkMethod: data.linkMethod,
          provider: data.provider,
          providerLabel: data.providerLabel,
          email: data.email,
          maskedEmail: data.maskedEmail,
          linkId: data.linkId,
          linkToken: data.linkToken,
          devVerificationCode: data.devVerificationCode,
          message: data.message
        };
      }
      localStorage.setItem('yt_token', data.token);
      setUser(data.user);
      return { 
        success: true, 
        linked: data.linked, 
        needsAdditionalInfo: data.needsAdditionalInfo,
        message: data.message
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const loginWithKakao = async (code, state) => {
    try {
      const data = await apiFetch('/auth/kakao', {
        method: 'POST',
        body: JSON.stringify({ code, state })
      });
      if (data.requiresAccountLink) {
        return {
          success: false,
          requiresAccountLink: true,
          linkMethod: data.linkMethod,
          provider: data.provider,
          providerLabel: data.providerLabel,
          email: data.email,
          maskedEmail: data.maskedEmail,
          linkId: data.linkId,
          linkToken: data.linkToken,
          devVerificationCode: data.devVerificationCode,
          message: data.message
        };
      }
      localStorage.setItem('yt_token', data.token);
      setUser(data.user);
      return { 
        success: true, 
        linked: data.linked, 
        message: data.message
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const loginWithGoogle = async (payloadOrCode, state) => {
    try {
      const payload = typeof payloadOrCode === 'object' && payloadOrCode !== null
        ? payloadOrCode
        : { code: payloadOrCode, state };

      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.requiresAccountLink) {
        return {
          success: false,
          requiresAccountLink: true,
          linkMethod: data.linkMethod,
          provider: data.provider,
          providerLabel: data.providerLabel,
          email: data.email,
          maskedEmail: data.maskedEmail,
          linkId: data.linkId,
          linkToken: data.linkToken,
          devVerificationCode: data.devVerificationCode,
          message: data.message
        };
      }

      localStorage.setItem('yt_token', data.token);
      setUser(data.user);
      return {
        success: true,
        linked: data.linked,
        created: data.created,
        message: data.message
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const linkSocialAccount = async (linkToken, password) => {
    try {
      const data = await apiFetch('/auth/link-social', {
        method: 'POST',
        body: JSON.stringify({ linkToken, password })
      });

      localStorage.setItem('yt_token', data.token);
      setUser(data.user);
      return {
        success: true,
        linked: data.linked,
        message: data.message
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const linkSocialAccountByEmail = async (linkId, code) => {
    try {
      const data = await apiFetch('/auth/link-social-email', {
        method: 'POST',
        body: JSON.stringify({ linkId, code })
      });

      localStorage.setItem('yt_token', data.token);
      setUser(data.user);
      return {
        success: true,
        linked: data.linked,
        message: data.message
      };
    } catch (err) {
      return { success: false, ...err, message: err.message };
    }
  };

  const updateSocialProfile = async (phone, address) => {
    try {
      const data = await apiFetch('/auth/profile-update', {
        method: 'PUT',
        body: JSON.stringify({ phone, address })
      });
      const userData = await apiFetch('/auth/me');
      setUser(userData);
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const createCategory = async (id, name) => {
    try {
      await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ id, name })
      });
      await fetchCategories();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deleteCategory = async (id) => {
    try {
      await apiFetch(`/categories/${id}`, {
        method: 'DELETE'
      });
      await fetchCategories();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateCategory = async (id, name) => {
    try {
      await apiFetch(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      await fetchCategories();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const reorderCategories = async (categoryIds) => {
    try {
      await apiFetch('/categories/reorder', {
        method: 'PUT',
        body: JSON.stringify({ categoryIds })
      });
      await fetchCategories();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const reorderProducts = async (orders) => {
    try {
      await apiFetch('/products/reorder', {
        method: 'PUT',
        body: JSON.stringify({ orders })
      });
      await fetchProducts();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  return (
    <ShopContext.Provider value={{
      user,
      products,
      fetchProducts,
      categories,
      fetchCategories,
      createCategory,
      updateCategory,
      deleteCategory,
      reorderCategories,
      cart,
      searchQuery,
      setSearchQuery,
      compareList,
      activeCategory,
      setActiveCategory,
      page,
      navigate,
      selectedProductId,
      chatOpen,
      setChatOpen,
      loading,
      login,
      logout,
      addToCart: handleAddToCart,
      updateQty: handleUpdateQty,
      removeFromCart: handleRemoveFromCart,
      clearCart: handleClearCart,
      addToCompare,
      removeFromCompare,
      clearCompare,
      createOrder,
      fetchOrders,
      fetchAdminStats,
      fetchAllOrders,
      updateOrderStatus,
      createProduct,
      updateProduct,
      deleteProduct,
      fetchReviews,
      createReview,
      fetchQnas,
      createQna,
      answerQna,
      loginWithNaver,
      loginWithKakao,
      loginWithGoogle,
      linkSocialAccount,
      linkSocialAccountByEmail,
      updateSocialProfile,
      setUser,
      backendUrl: BACKEND_BASE_URL
    }}>
      {children}
    </ShopContext.Provider>
  );
};
