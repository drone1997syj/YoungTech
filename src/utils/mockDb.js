// LocalStorage Mock DB for YoungTech Shopping Mall

const KEYS = {
  USERS: 'yt_users',
  CURRENT_USER: 'yt_current_user',
  CART: 'yt_cart',
  ORDERS: 'yt_orders',
  CHAT: 'yt_chat_messages'
};

// Initialize DB structure if not present
export const initDb = () => {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify([
      { username: 'test', password: 'password', name: '홍길동', address: '서울특별시 강남구 테헤란로 123', phone: '010-1234-5678' }
    ]));
  }
  if (!localStorage.getItem(KEYS.CART)) {
    localStorage.setItem(KEYS.CART, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.ORDERS)) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.CHAT)) {
    localStorage.setItem(KEYS.CHAT, JSON.stringify([
      { id: 1, sender: 'bot', text: '안녕하세요! 영테크 고객센터입니다. 서보모터 및 서보드라이버 사양 문의나 견적 요청을 도와드릴 수 있습니다. 무엇을 도와드릴까요?', timestamp: new Date().toISOString() }
    ]));
  }
};

// --- AUTH SERVICES ---
export const getUsers = () => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');

export const registerUser = (username, password, name, address = '', phone = '') => {
  const users = getUsers();
  if (users.some(u => u.username === username)) {
    return { success: false, message: '이미 존재하는 아이디입니다.' };
  }
  const newUser = { username, password, name, address, phone };
  users.push(newUser);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  return { success: true, user: newUser };
};

export const loginUser = (username, password) => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  // Sync guest cart to user cart if needed (for simplicity, we just keep cart global or user-scoped)
  return { success: true, user };
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem(KEYS.CURRENT_USER);
  return userStr ? JSON.parse(userStr) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.CURRENT_USER);
};

// --- CART SERVICES ---
export const getCart = () => JSON.parse(localStorage.getItem(KEYS.CART) || '[]');

export const addToCart = (product, quantity = 1) => {
  const cart = getCart();
  const existingItemIndex = cart.findIndex(item => item.product.id === product.id);
  
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({ product, quantity });
  }
  
  localStorage.setItem(KEYS.CART, JSON.stringify(cart));
  return cart;
};

export const updateCartQuantity = (productId, quantity) => {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter(item => item.product.id !== productId);
  } else {
    cart = cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity };
      }
      return item;
    });
  }
  localStorage.setItem(KEYS.CART, JSON.stringify(cart));
  return cart;
};

export const removeFromCart = (productId) => {
  let cart = getCart();
  cart = cart.filter(item => item.product.id !== productId);
  localStorage.setItem(KEYS.CART, JSON.stringify(cart));
  return cart;
};

export const clearCart = () => {
  localStorage.setItem(KEYS.CART, JSON.stringify([]));
};

// --- ORDER SERVICES ---
export const getOrders = () => {
  const currentUser = getCurrentUser();
  const allOrders = JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
  if (!currentUser) return [];
  // Filter orders by logged in user
  return allOrders.filter(order => order.username === currentUser.username);
};

export const createOrder = (orderData) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, message: '로그인이 필요합니다.' };
  }
  
  const allOrders = JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
  const newOrder = {
    id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
    username: currentUser.username,
    ...orderData,
    status: '결제완료 (배송준비중)',
    createdAt: new Date().toISOString()
  };
  
  allOrders.unshift(newOrder); // Newest first
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(allOrders));
  clearCart(); // Clear cart on successful order
  return { success: true, order: newOrder };
};

// --- CHAT SERVICES ---
export const getChatMessages = () => JSON.parse(localStorage.getItem(KEYS.CHAT) || '[]');

export const sendChatMessage = (sender, text) => {
  const messages = getChatMessages();
  const newMessage = {
    id: messages.length + 1,
    sender,
    text,
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  localStorage.setItem(KEYS.CHAT, JSON.stringify(messages));
  return newMessage;
};
