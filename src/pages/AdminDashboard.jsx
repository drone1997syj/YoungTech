import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { 
  TrendingUp, Users, ShoppingBag, Truck, Plus, Edit2, Trash2, 
  CheckCircle, AlertTriangle, ChevronRight, X, UserCheck, RefreshCw, Cpu, Upload, Lock, ShieldCheck 
} from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { 
    user, navigate, fetchAdminStats, fetchAllOrders, updateOrderStatus,

    createProduct, updateProduct, updateProductActive, deleteProduct, products, fetchProducts,
    categories, createCategory, updateCategory, deleteCategory, reorderCategories, reorderProducts,
    motorBrands, createMotorBrand, deleteMotorBrand, fetchMotorBrands,
    backendUrl
  } = useShop();

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      alert('관리자만 접근할 수 있는 영역입니다.');
      navigate('home');
    } else {
      fetchProducts(true);
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Tab State: 'overview', 'products', 'orders', 'users', 'categories'
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [customerAuthTarget, setCustomerAuthTarget] = useState(null);
  const [customerAuthPassword, setCustomerAuthPassword] = useState('');
  const [customerAuthError, setCustomerAuthError] = useState('');
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false);

  // Pagination State for Products List
  const [prodPage, setProdPage] = useState(1);
  const [prodFilter, setProdFilter] = useState('all');
  const [prodSortField, setProdSortField] = useState('created_at');
  const [prodSortDirection, setProdSortDirection] = useState('desc');
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setProdPage(1);
  }, [prodFilter, prodSortField, prodSortDirection]);

  // Category Selector / Creation Modal States
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState('');
  const [catSuccess, setCatSuccess] = useState('');

  // Form States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodForm, setProdForm] = useState({
    id: '', name: '', category: 'motor', brand: '', price: '', image: '', images: [], description: '', stock: 50, is_active: true,
    specs: { '메이커': '', '스펙설명': '' }
  });
  const [formError, setFormError] = useState('');
  const [priceConfirmed, setPriceConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedProdIds, setSelectedProdIds] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [inputUrl, setInputUrl] = useState('');
  const [trackingInputs, setTrackingInputs] = useState({});
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [localCategories, setLocalCategories] = useState([]);
  const [newMotorBrandName, setNewMotorBrandName] = useState('');
  const [motorBrandMessage, setMotorBrandMessage] = useState('');

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const maskName = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.length === 1) return '*';
    if (text.length === 2) return `${text[0]}*`;
    return `${text[0]}${'*'.repeat(text.length - 2)}${text[text.length - 1]}`;
  };

  const maskEmail = (value = '') => {
    const [id, domain] = String(value || '').split('@');
    if (!id || !domain) return value || '';
    const maskedId = id.length <= 2 ? `${id[0] || '*'}*` : `${id.slice(0, 2)}${'*'.repeat(Math.max(2, id.length - 2))}`;
    const [domainName, ...domainRest] = domain.split('.');
    const maskedDomain = domainName ? `${domainName[0]}${'*'.repeat(Math.max(2, domainName.length - 1))}` : '***';
    return `${maskedId}@${maskedDomain}${domainRest.length ? `.${domainRest.join('.')}` : ''}`;
  };

  const maskText = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.length <= 6) return `${text.slice(0, 1)}${'*'.repeat(Math.max(2, text.length - 1))}`;
    return `${text.slice(0, 4)}${'*'.repeat(Math.min(12, text.length - 6))}${text.slice(-2)}`;
  };

  const formatOrderDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getClaimReasonLabel = (order) => {
    if (!order?.claim_reason) return null;
    const typeLabel = order.claim_type === 'exchange' ? '교환 사유' : '환불 사유';
    const reasonTypeLabel = order.claim_reason_type === 'seller' ? '판매자 귀책' : '고객 사유';
    return { typeLabel, reasonTypeLabel, reason: order.claim_reason };
  };

  const getShippingControlState = (order) => {
    const terminalStatuses = new Set(['cancelled', 'returned', 'refunded', 'exchanged', 'confirmed']);
    const activeItems = (order?.order_items || []).filter(item => {
      const itemStatus = item.status || order.status;
      return !terminalStatuses.has(itemStatus);
    });
    const statuses = activeItems.map(item => item.status || order.status);

    return {
      hasActiveItems: activeItems.length > 0,
      hasPendingItems: statuses.some(status => status === 'pending' || status === 'part_cancelled'),
      hasPreparingItems: statuses.includes('preparing'),
      hasShippingItems: statuses.includes('shipping')
    };
  };

  const getTaxDocumentLabel = (order) => {
    if (order?.tax_document_type === 'cash_receipt') return '현금영수증';
    return '카드 매출전표';
  };

  const getTaxDocumentStatusLabel = (order) => {
    if (order?.tax_document_type === 'cash_receipt') return '발급 대상';
    return 'PG 전표';
  };

  const openCustomerAuth = (customer) => {
    if (!customer?.id) return;
    const confirmed = window.confirm(
      '보안 안내\n\n고객 상세정보는 관리자만 접근할 수 있습니다.\n개인정보 열람 목적과 책임을 확인한 뒤 관리자 비밀번호를 입력해야 합니다.'
    );
    if (!confirmed) return;
    setCustomerAuthTarget(customer);
    setCustomerAuthPassword('');
    setCustomerAuthError('');
  };

  const closeCustomerAuth = () => {
    setCustomerAuthTarget(null);
    setCustomerAuthPassword('');
    setCustomerAuthError('');
    setLoadingCustomerDetail(false);
  };

  const handleCustomerDetailAuth = async (e) => {
    e.preventDefault();
    if (!customerAuthTarget) return;
    if (!customerAuthPassword.trim()) {
      setCustomerAuthError('관리자 비밀번호를 입력해 주세요.');
      return;
    }

    setLoadingCustomerDetail(true);
    setCustomerAuthError('');
    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/admin/users/${customerAuthTarget.id}/detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: customerAuthPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setCustomerAuthError(data.message || '고객정보 확인에 실패했습니다.');
        return;
      }
      setCustomerDetail(data);
      closeCustomerAuth();
    } catch (err) {
      console.error(err);
      setCustomerAuthError('고객정보 확인 중 오류가 발생했습니다.');
    } finally {
      setLoadingCustomerDetail(false);
    }
  };

  // Drag and Drop state for categories
  const [draggedCatIndex, setDraggedCatIndex] = useState(null);

  const handleCatDragStart = (index) => {
    setDraggedCatIndex(index);
  };

  const handleCatDragOver = (e, index) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === index) return;

    const reordered = [...localCategories];
    const target = reordered[draggedCatIndex];
    reordered.splice(draggedCatIndex, 1);
    reordered.splice(index, 0, target);
    
    setLocalCategories(reordered);
    setDraggedCatIndex(index);
  };

  const handleCatDragEnd = async () => {
    if (draggedCatIndex === null) return;
    const categoryIds = localCategories.map(c => c.id);
    await reorderCategories(categoryIds);
    setDraggedCatIndex(null);
  };

  // Product Reorder actions
  const handleProductMoveUp = async (product, index, allProductsInCategory) => {
    if (index === 0) return;
    const prevProduct = allProductsInCategory[index - 1];

    const currentOrder = product.sort_order || 0;
    const prevOrder = prevProduct.sort_order || 0;

    await reorderProducts([
      { id: product.id, sort_order: prevOrder },
      { id: prevProduct.id, sort_order: currentOrder }
    ]);
  };

  const handleProductMoveDown = async (product, index, allProductsInCategory) => {
    if (index === allProductsInCategory.length - 1) return;
    const nextProduct = allProductsInCategory[index + 1];

    const currentOrder = product.sort_order || 0;
    const nextOrder = nextProduct.sort_order || 0;

    await reorderProducts([
      { id: product.id, sort_order: nextOrder },
      { id: nextProduct.id, sort_order: currentOrder }
    ]);
  };

  const handleProductOrderChange = async (productId, val) => {
    const orderVal = parseInt(val);
    if (isNaN(orderVal)) return;
    await reorderProducts([{ id: productId, sort_order: orderVal }]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if ((prodForm.images || []).length >= 3) {
      setFormError('상품 사진은 최대 3장까지만 등록할 수 있습니다.');
      return;
    }

    setUploading(true);
    setFormError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '이미지 업로드 실패');
      }

      setProdForm(prev => {
        const currentImages = prev.images || [];
        const nextImages = [...currentImages, data.url];
        return {
          ...prev,
          images: nextImages,
          image: nextImages.join(',')
        };
      });
    } catch (err) {
      console.error(err);
      setFormError(err.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrlImage = () => {
    if (!inputUrl.trim()) return;
    if ((prodForm.images || []).length >= 3) {
      alert('상품 사진은 최대 3장까지만 등록할 수 있습니다.');
      return;
    }
    setProdForm(prev => {
      const currentImages = prev.images || [];
      const nextImages = [...currentImages, inputUrl.trim()];
      return {
        ...prev,
        images: nextImages,
        image: nextImages.join(',')
      };
    });
    setInputUrl('');
  };

  const handleRemoveImageIndex = (indexToRemove) => {
    setProdForm(prev => {
      const currentImages = prev.images || [];
      const nextImages = currentImages.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: nextImages,
        image: nextImages.join(',')
      };
    });
  };

  // Batch API functions
  const handleBatchDelete = async () => {
    if (selectedProdIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedProdIds.length}개의 상품을 정말로 영구 삭제하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/products/batch-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedProdIds })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '일괄 삭제 실패');

      alert(data.message);
      setSelectedProdIds([]);
      await fetchProducts(); // Refresh products list
    } catch (err) {
      console.error(err);
      alert(err.message || '일괄 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBatchOutOfStock = async () => {
    if (selectedProdIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedProdIds.length}개의 상품을 품절 처리하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/products/batch-out-of-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedProdIds })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '일괄 품절 처리 실패');

      alert(data.message);
      setSelectedProdIds([]);
      await fetchProducts(); // Refresh list
    } catch (err) {
      console.error(err);
      alert(err.message || '일괄 품절 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/products/bulk-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'CSV 업로드에 실패했습니다.');
      }
      alert(`CSV 등록 완료: ${data.inserted}개 추가, ${data.skipped}개 중복 제외`);
      await fetchProducts(true);
    } catch (err) {
      console.error(err);
      alert(err.message || 'CSV 업로드 중 오류가 발생했습니다.');
    }
  };

  // Copy Product function
  const handleCopyProduct = (p) => {
    setEditingProduct(null); // Copy counts as new product creation
    setPriceConfirmed(false);
    
    // Parse specs if it's a string, or copy directly if it's already an object
    let parsedSpecs = { '메이커': '', '스펙설명': '' };
    if (p.specs) {
      try {
        parsedSpecs = typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs;
      } catch (e) {
        console.error('Failed to parse specs', e);
      }
    }

    setProdForm({
      id: `${p.id}-copy`,
      name: `${p.name} (복사본)`,
      category: p.category,
      brand: p.brand || '',
      price: p.price,
      image: p.image,
      images: p.image ? p.image.split(',').filter(Boolean) : [],
      description: p.description || '',
      stock: p.stock || 50,
      is_active: p.is_active !== false && p.is_active !== 0,
      specs: parsedSpecs
    });

    setFormError('');
    setShowProductModal(true);
  };

  const handleSelectRow = (id) => {
    setSelectedProdIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Claims & Settlements State
  const [claims, setClaims] = useState([]);
  const [settlementData, setSettlementData] = useState(null);
  const [claimAnswers, setClaimAnswers] = useState({}); // { claimId: answerText }

  // Load Admin Data
  const loadStatsData = async () => {
    setLoadingStats(true);
    try {
      const statsData = await fetchAdminStats();
      setStats(statsData);
      await fetchMotorBrands();
      const ordersData = await fetchAllOrders();
      setOrders(ordersData);
      
      // Fetch Claims
      const token = localStorage.getItem('yt_token');
      const claimRes = await fetch(`${backendUrl}/api/admin/claims`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (claimRes.ok) {
        const claimsData = await claimRes.json();
        setClaims(claimsData);
      }

      // Fetch Settlements
      const sRes = await fetch(`${backendUrl}/api/admin/settlements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        setSettlementData(sData);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleClaimStatusChange = async (claimId, status) => {
    const answer = claimAnswers[claimId] || '';
    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/admin/claims/${claimId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, answer })
      });
      if (res.ok) {
        alert('요청 처리가 성공적으로 완료되었습니다.');
        setClaimAnswers(prev => ({ ...prev, [claimId]: '' }));
        await loadStatsData();
      } else {
        const err = await res.json();
        alert(err.message || '처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const handleApproveCancel = async (orderId, action, productId) => {
    const confirmMsg = action === 'approve' 
      ? '선택한 상품의 주문 취소를 승인하시겠습니까? 승인 시 결제가 취소되고 재고가 자동으로 복구됩니다.' 
      : '선택한 상품의 주문 취소 요청을 거절하시겠습니까? 거절 시 주문 상품은 배송 준비 상태로 되돌아갑니다.';
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/admin/orders/${orderId}/approve-cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, product_id: productId })
      });
      if (res.ok) {
        alert('성공적으로 처리되었습니다.');
        await loadStatsData();
      } else {
        const err = await res.json();
        alert(err.message || '처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadStatsData();
    }
  }, [user]);

  const openAddModal = (initialCategory = 'motor') => {
    setEditingProduct(null);
    setProdForm({
      id: '', name: '', category: initialCategory, brand: '', price: '', image: '', images: [], description: '', stock: 50, is_active: true,
      specs: { '메이커': '', '상세정보': '' }
    });
    setFormError('');
    setPriceConfirmed(false);
    setShowProductModal(true);
  };

  const handleAddMotorBrand = async (e) => {
    e.preventDefault();
    const name = newMotorBrandName.trim();
    if (!name) {
      setMotorBrandMessage('브랜드명을 입력해 주세요.');
      return;
    }

    const res = await createMotorBrand(name);
    if (res.success) {
      setNewMotorBrandName('');
      setMotorBrandMessage('모터 브랜드가 추가되었습니다.');
      await fetchMotorBrands();
    } else {
      setMotorBrandMessage(res.message || '브랜드 추가에 실패했습니다.');
    }
  };

  const handleRemoveMotorBrand = async (brandId, brandName) => {
    if (!window.confirm(`'${brandName}' 브랜드를 숨김 처리할까요?`)) return;

    const res = await deleteMotorBrand(brandId);
    if (res.success) {
      setMotorBrandMessage('브랜드가 숨김 처리되었습니다.');
      await fetchMotorBrands();
    } else {
      setMotorBrandMessage(res.message || '브랜드 삭제에 실패했습니다.');
    }
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setProdForm({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand || '',
      price: p.price,
      image: p.image || '',
      images: p.image ? p.image.split(',').filter(Boolean) : [],
      description: p.description || '',
      stock: p.stock || 0,
      is_active: p.is_active !== false && p.is_active !== 0,
      specs: p.specs || { '메이커': '', '상세정보': '' }
    });
    setFormError('');
    setPriceConfirmed(false);
    setShowProductModal(true);
  };

  const handleSpecChange = (key, val) => {
    setProdForm(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [key]: val
      }
    }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!prodForm.id || !prodForm.name || !prodForm.price) {
      setFormError('상품 ID, 이름, 가격은 필수 입력 사항입니다.');
      return;
    }

    const priceNum = Number(prodForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('올바른 가격 숫자를 입력해주세요.');
      return;
    }

    // Front-end Price Anomaly Detection (10x check)
    // Find other products in the same category
    const sameCatProds = products.filter(p => p.category === prodForm.category && p.id !== prodForm.id);
    if (sameCatProds.length > 0 && !priceConfirmed) {
      const sum = sameCatProds.reduce((acc, curr) => acc + curr.price, 0);
      const avg = sum / sameCatProds.length;

      if (priceNum > avg * 10 || priceNum < avg / 10) {
        const confirmResult = window.confirm(
          `⚠️ [가격 오입력 경고]\n\n입력하신 가격(${priceNum.toLocaleString()}원)은 해당 카테고리 평균 가격(${Math.round(avg).toLocaleString()}원) 대비 10배 이상 현격한 차이가 있습니다.\n\n정말로 이 가격으로 등록하시겠습니까?`
        );
        if (!confirmResult) {
          return;
        }
        setPriceConfirmed(true);
      }
    }

    // Merge images array to a single comma-separated string for DB storage
    const submitData = {
      ...prodForm,
      image: prodForm.images.join(',')
    };

    let res;
    if (editingProduct) {
      res = await updateProduct(prodForm.id, submitData);
    } else {
      res = await createProduct(submitData);
    }

    if (res.success) {
      setShowProductModal(false);
      await loadStatsData();
      alert('상품 정보가 성공적으로 반영되었습니다.');
    } else {
      setFormError(res.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('정말로 이 상품을 완전히 삭제하시겠습니까?')) {
      const res = await deleteProduct(productId);
      if (res.success) {
        await loadStatsData();
        alert('상품이 삭제되었습니다.');
      } else {
        alert(res.message);
      }
    }
  };

  const applyOrderStatusLocally = (orderId, newStatus) => {
    const terminalStatuses = new Set(['cancelled', 'returned', 'refunded', 'exchanged', 'confirmed']);

    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id !== orderId) return order;

      const updatedItems = (order.order_items || []).map(item => {
        const itemStatus = item.status || order.status;
        if (terminalStatuses.has(itemStatus)) return item;
        return { ...item, status: newStatus };
      });

      return {
        ...order,
        status: newStatus,
        order_items: updatedItems
      };
    }));
  };

  const handleStatusChange = async (orderId, newStatus) => {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      applyOrderStatusLocally(orderId, newStatus);
    } else {
      alert(res.message);
    }
  };

  const handleSendDelivery = async (orderId) => {
    const tInput = trackingInputs[orderId];
    const carrier = tInput?.carrier || 'logen';
    const tracking_number = tInput?.tracking_number || '';

    if (!tracking_number.trim()) {
      alert('송장번호를 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/admin/orders/${orderId}/delivery`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ carrier, tracking_number })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '발송 처리 실패');

      alert('성공적으로 발송 처리가 완료되었습니다.');
      // clear input
      setTrackingInputs(prev => ({
        ...prev,
        [orderId]: { carrier: 'logen', tracking_number: '' }
      }));
      await loadStatsData();
    } catch (err) {
      console.error(err);
      alert(err.message || '발송 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCompleteDelivery = async (orderId) => {
    if (!window.confirm('이 주문을 배송 완료 처리하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/admin/orders/${orderId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '배송 완료 처리 실패');

      alert('배송 완료 처리가 완료되었습니다.');
      await loadStatsData();
    } catch (err) {
      console.error(err);
      alert(err.message || '배송 완료 처리 중 오류가 발생했습니다.');
    }
  };

  // Helper to generate SVG Chart coordinates
  const renderSVGChart = (chartData = [], key = 'visitors', color = '#7c3aed') => {
    if (chartData.length === 0) return null;

    const width = 600;
    const height = 180;
    const padding = 20;

    const maxVal = Math.max(...chartData.map(d => d[key])) || 100;
    const points = chartData.map((d, index) => {
      const x = padding + (index / (chartData.length - 1)) * (width - padding * 2);
      const y = height - padding - (d[key] / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="admin-chart-svg" viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
        />
        {chartData.map((d, index) => {
          const x = padding + (index / (chartData.length - 1)) * (width - padding * 2);
          const y = height - padding - (d[key] / maxVal) * (height - padding * 2);
          if (index % 5 === 0) {
            return (
              <g key={index}>
                <circle cx={x} cy={y} r="4" fill={color} />
                <text x={x} y={height - 2} fontSize="9" fill="#94a3b8" textAnchor="middle">{d.date.substring(5)}</text>
              </g>
            );
          }
          return null;
        })}
      </svg>
    );
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-dashboard-page container py-8 animate-fade-in">
      <div className="admin-header flex justify-between items-center mb-8 pb-4 border-b">
        <div>
          <h1 className="font-extrabold text-dark text-2xl flex items-center gap-2">
            영테크 관리자 모드
          </h1>
          <p className="text-xs text-light">종합 매출 분석 및 상품 등록 관리를 제어합니다.</p>
        </div>
        <button onClick={loadStatsData} className="btn btn-secondary py-2 px-3 text-xs flex items-center gap-1">
          <RefreshCw size={14} /> 데이터 갱신
        </button>
      </div>

      <div className="admin-layout flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="admin-sidebar lg:w-64 flex flex-row lg:flex-col gap-2 border-b lg:border-b-0 lg:border-r pb-4 lg:pb-0 pr-0 lg:pr-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`admin-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <TrendingUp size={16} /> 대시보드 현황
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`admin-nav-btn ${activeTab === 'products' ? 'active' : ''}`}
          >
            <ShoppingBag size={16} /> 상품 관리
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`admin-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <Truck size={16} /> 주문/배송 관리
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`admin-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          >
            <Users size={16} /> 회원 조회
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`admin-nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
          >
            <Cpu size={16} /> 품목군 관리
          </button>
          <button 
            onClick={() => setActiveTab('claims')}
            className={`admin-nav-btn ${activeTab === 'claims' ? 'active' : ''}`}
          >
            <AlertTriangle size={16} /> 반품/교환 관리
          </button>
          <button 
            onClick={() => setActiveTab('settlement')}
            className={`admin-nav-btn ${activeTab === 'settlement' ? 'active' : ''}`}
          >
            <TrendingUp size={16} /> 정산 현황
          </button>
        </aside>

        {/* Tab Contents */}
        <main className="admin-main flex-grow">
          {loadingStats ? (
            <div className="flex justify-center items-center py-16">
              <span className="loading-spinner"></span>
              <span className="text-sm text-light ml-2">관리자 데이터를 로드 중입니다...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && stats && (
                <div className="tab-overview flex flex-col gap-8">
                  {/* Indicators Grid */}
                  <div className="stats-card-grid grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card stat-card p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-light font-bold">누적 매출액</span>
                        <div className="icon-bg bg-purple-50 text-primary p-2 rounded"><TrendingUp size={16} /></div>
                      </div>
                      <h3 className="font-extrabold text-dark text-xl">{(stats.revenue || 0).toLocaleString()}원</h3>
                    </div>

                    <div className="card stat-card p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-light font-bold">누적 주문량</span>
                        <div className="icon-bg bg-blue-50 text-blue-600 p-2 rounded"><ShoppingBag size={16} /></div>
                      </div>
                      <h3 className="font-extrabold text-dark text-xl">{(stats.orders || 0)}건</h3>
                    </div>

                    <div className="card stat-card p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-light font-bold">가입 고객수</span>
                        <div className="icon-bg bg-green-50 text-green-600 p-2 rounded"><Users size={16} /></div>
                      </div>
                      <h3 className="font-extrabold text-dark text-xl">{(stats.users || 0)}명</h3>
                    </div>

                    <div className="card stat-card p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-light font-bold">오늘 방문객</span>
                        <div className="icon-bg bg-orange-50 text-orange-600 p-2 rounded"><UserCheck size={16} /></div>
                      </div>
                      <h3 className="font-extrabold text-dark text-xl">{stats.visitorsToday}명</h3>
                    </div>
                  </div>

                  {/* Chart and Shipping */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="card p-6 lg:col-span-2">
                      <h4 className="font-extrabold text-dark text-sm mb-4">매출액 & 방문자 추이 (최근 30일)</h4>
                      <div className="chart-legend flex gap-4 mb-2 text-2xs">
                        <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-purple-500 rounded-sm"></span> 방문자 수</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-500 rounded-sm"></span> 매출액</span>
                      </div>
                      <div className="chart-container border rounded p-4 bg-slate-50">
                        {renderSVGChart(stats.chartData, 'visitors', '#7c3aed')}
                        <div className="border-t my-4"></div>
                        {renderSVGChart(stats.chartData, 'revenue', '#3b82f6')}
                      </div>
                    </div>

                    <div className="card p-6 flex flex-col gap-4">
                      <h4 className="font-extrabold text-dark text-sm border-b pb-2">실시간 배송 현황판</h4>
                      <div className="shipping-dashboard flex flex-col gap-4 justify-around py-4 h-full">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-xs text-light font-bold">결제 완료 (배송대기)</span>
                          <span className="badge badge-purple text-xs px-2.5 py-1">
                            {orders.filter(o => o.status === 'pending').length}건
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-xs text-light font-bold">상품 배송중</span>
                          <span className="badge badge-blue text-xs px-2.5 py-1">
                            {orders.filter(o => o.status === 'shipping').length}건
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-light font-bold">배송 완료</span>
                          <span className="badge badge-green text-xs px-2.5 py-1">
                            {orders.filter(o => o.status === 'delivered').length}건
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Best Sellers */}
                  <div className="card p-6">
                    <h4 className="font-extrabold text-dark text-sm mb-4">인기 판매 상품 순위 (베스트셀러)</h4>
                    <div className="bestsellers-list flex flex-col gap-3">
                      {stats.bestSellers && stats.bestSellers.length > 0 ? (
                        stats.bestSellers.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b">
                            <span className="text-xs text-dark font-bold">{index + 1}. {item.name}</span>
                            <span className="text-xs text-primary font-bold">{item.sales}개 판매</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-light py-4 text-center">아직 판매 내역이 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Products */}
              {activeTab === 'products' && (() => {
                const filteredProducts = prodFilter === 'all'
                  ? products
                  : products.filter(p => p.category === prodFilter);

                const getProductCategoryName = (product) => {
                  const category = categories.find(c => c.id === product.category);
                  return category ? category.name : product.category || '';
                };
                const getProductSortValue = (product) => {
                  switch (prodSortField) {
                    case 'category':
                      return getProductCategoryName(product);
                    case 'name':
                      return product.name || '';
                    case 'price':
                      return Number(product.price || 0);
                    case 'stock':
                      return Number(product.stock || 0);
                    case 'created_at':
                      return new Date(product.created_at || 0).getTime();
                    default:
                      return new Date(product.created_at || 0).getTime();
                  }
                };
                const sortedProducts = [...filteredProducts].sort((a, b) => {
                  const aValue = getProductSortValue(a);
                  const bValue = getProductSortValue(b);
                  let result = 0;

                  if (typeof aValue === 'number' && typeof bValue === 'number') {
                    result = aValue - bValue;
                  } else {
                    result = String(aValue).localeCompare(String(bValue), 'ko-KR', { numeric: true, sensitivity: 'base' });
                  }

                  if (result === 0) {
                    result = String(a.name || '').localeCompare(String(b.name || ''), 'ko-KR', { numeric: true, sensitivity: 'base' });
                  }

                  return prodSortDirection === 'desc' ? -result : result;
                });

                const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
                const startIndex = (prodPage - 1) * itemsPerPage;
                const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

                const pageNumbers = [];
                for (let i = 1; i <= totalPages; i++) {
                  pageNumbers.push(i);
                }

                // Batch select computed states
                const isAllSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProdIds.includes(p.id));
                const handleSelectAll = () => {
                  if (isAllSelected) {
                    setSelectedProdIds(prev => prev.filter(id => !paginatedProducts.some(p => p.id === id)));
                  } else {
                    const pageIds = paginatedProducts.map(p => p.id);
                    setSelectedProdIds(prev => [...new Set([...prev, ...pageIds])]);
                  }
                };

                return (
                  <div className="tab-products flex flex-col gap-6">
                    {/* 스마트스토어 스타일 상품 현황 대시보드 */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="card p-4 flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #8b5cf6' }}>
                        <span className="text-2xs text-light font-bold">전체 상품</span>
                        <span className="text-lg font-black text-dark mt-1">{products.length} <span className="text-xs font-normal text-light">건</span></span>
                      </div>
                      <div className="card p-4 flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #10b981' }}>
                        <span className="text-2xs text-light font-bold">판매 중</span>
                        <span className="text-lg font-black text-green-600 mt-1">{products.filter(p => p.stock > 0).length} <span className="text-xs font-normal text-light">건</span></span>
                      </div>
                      <div className="card p-4 flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #f59e0b' }}>
                        <span className="text-2xs text-light font-bold">품절 임박/품절</span>
                        <span className="text-lg font-black text-amber-600 mt-1">{products.filter(p => p.stock === 0).length} <span className="text-xs font-normal text-light">건</span></span>
                      </div>
                      <div className="card p-4 flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #3b82f6' }}>
                        <span className="text-2xs text-light font-bold">카테고리 수</span>
                        <span className="text-lg font-black text-blue-600 mt-1">{categories.length} <span className="text-xs font-normal text-light">개</span></span>
                      </div>
                    </div>



                    <div className="card p-4 flex flex-col gap-3 bg-white rounded-xl border">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h4 className="text-sm font-extrabold text-dark">모터 브랜드 관리</h4>
                          <p className="text-3xs text-light mt-1">모터 카테고리에 노출할 브랜드만 추가하거나 숨길 수 있습니다.</p>
                        </div>
                        <form onSubmit={handleAddMotorBrand} className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={newMotorBrandName}
                            onChange={(e) => setNewMotorBrandName(e.target.value)}
                            placeholder="브랜드명"
                            className="form-input text-xs py-2 px-3 border rounded-lg bg-white"
                            style={{ minWidth: '180px' }}
                          />
                          <button type="submit" className="btn btn-primary py-2 px-3 text-xs font-bold flex items-center gap-1">
                            <Plus size={14} /> 추가
                          </button>
                        </form>
                      </div>

                      {motorBrandMessage && (
                        <div className="text-xs text-slate-500">{motorBrandMessage}</div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {(motorBrands || []).map((brand) => {
                          const brandId = brand.id || brand.name || brand;
                          const brandName = brand.name || brand;
                          return (
                            <span
                              key={brandId}
                              className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 text-xs font-bold"
                            >
                              {brandName}
                              <button
                                type="button"
                                onClick={() => handleRemoveMotorBrand(brandId, brandName)}
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/70 text-violet-500 hover:bg-violet-100"
                                aria-label={`${brandName} 숨기기`}
                                title="숨기기"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                        {(!motorBrands || motorBrands.length === 0) && (
                          <div className="text-xs text-light">등록된 모터 브랜드가 없습니다.</div>
                        )}
                      </div>
                    </div>
                    {/* 필터 및 신규 등록 영역 */}
                    <div className="flex justify-between items-center gap-4 flex-wrap bg-white p-4 rounded-xl border">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-light font-bold">카테고리 필터:</span>
                          <select
                            value={prodFilter}
                            onChange={(e) => {
                              setProdFilter(e.target.value);
                              setProdPage(1);
                            }}
                            className="form-select text-2xs py-1 px-2 border rounded-lg bg-white"
                            style={{ width: '110px' }}
                          >
                            <option value="all">전체 보기</option>
                            {categories && categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-light font-bold">보기 개수:</span>
                          <select 
                            value={itemsPerPage} 
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setProdPage(1);
                            }}
                            className="form-select text-2xs py-1 px-2 border rounded-lg bg-white"
                            style={{ width: '90px' }}
                          >
                            <option value={20}>20개씩</option>
                            <option value={50}>50개씩</option>
                            <option value={100}>100개씩</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-light font-bold">정렬 기준:</span>
                          <select
                            value={prodSortField}
                            onChange={(e) => setProdSortField(e.target.value)}
                            className="form-select text-2xs py-1 px-2 border rounded-lg bg-white"
                            style={{ width: '120px' }}
                          >
                            <option value="category">카테고리별</option>
                            <option value="created_at">등록일시별</option>
                            <option value="name">이름별</option>
                            <option value="stock">재고수량별</option>
                            <option value="price">가격별</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setProdSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                            className="btn btn-secondary py-1 px-2 text-2xs font-bold"
                            title="정렬 방향 전환"
                          >
                            {prodSortDirection === 'asc' ? '오름차순' : '내림차순'}
                          </button>
                        </div>
                      </div>

                      <input
                        id="product-csv-upload"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleCsvUpload}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="product-csv-upload" className="btn btn-secondary py-2 px-3 text-xs flex items-center gap-1 cursor-pointer">
                        <Upload size={14} /> CSV 일괄 등록
                      </label>
                      <button onClick={() => setShowCategorySelector(true)} className="btn btn-primary py-2 px-3 text-xs flex items-center gap-1">
                        <Plus size={14} /> 신규 상품 등록
                      </button>
                    </div>

                    {/* 일괄 변경 툴바 (Batch Toolbar) */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={isAllSelected} 
                          onChange={handleSelectAll} 
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs text-dark font-bold">
                          선택 상품: <span className="text-primary">{selectedProdIds.length}</span>개
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          disabled={selectedProdIds.length === 0}
                          onClick={handleBatchOutOfStock}
                          className={`btn py-1 px-3 text-2xs font-bold ${selectedProdIds.length > 0 ? 'btn-secondary text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100' : 'opacity-40 cursor-not-allowed bg-slate-200 text-light'}`}
                        >
                          일괄 품절 처리
                        </button>
                        <button 
                          disabled={selectedProdIds.length === 0}
                          onClick={handleBatchDelete}
                          className={`btn py-1 px-3 text-2xs font-bold ${selectedProdIds.length > 0 ? 'btn-danger bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'opacity-40 cursor-not-allowed bg-slate-200 text-light'}`}
                        >
                          일괄 삭제
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive card p-4">
                      <table className="admin-table w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b text-xs text-light font-bold">
                            <th className="py-3 px-2 w-8">
                              <input 
                                type="checkbox" 
                                checked={isAllSelected} 
                                onChange={handleSelectAll} 
                                className="cursor-pointer"
                              />
                            </th>
                            <th className="py-3 px-2">카테고리</th>
                            <th className="py-3 px-2">상품명</th>
                            <th className="py-3 px-2">가격</th>
                            <th className="py-3 px-2">재고수량</th>
                            <th className="py-3 px-2">등록일시</th>
                            <th className="py-3 px-2 text-center">관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProducts.length > 0 ? (
                            paginatedProducts.map(p => {
                              const catObj = categories.find(c => c.id === p.category);
                              const categoryName = catObj ? catObj.name : p.category;
                              return (
                                <tr key={p.id} className="border-b text-sm text-dark hover:bg-slate-50">
                                  <td className="py-3 px-2">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedProdIds.includes(p.id)} 
                                      onChange={() => handleSelectRow(p.id)}
                                      className="cursor-pointer w-4 h-4"
                                    />
                                  </td>
                                  <td className="py-3 px-2"><span className="badge badge-purple text-xs px-2 py-0.5">{categoryName}</span></td>
                                  <td className="py-3 px-2 font-bold text-base">{p.name}</td>
                                  <td className="py-3 px-2 text-xs font-bold text-slate-600">{p.brand || '-'}</td>
                                  <td className="py-3 px-2 font-bold text-base">{p.price.toLocaleString()}원</td>
                                  <td className="py-3 px-2 text-base">
                                    {p.stock === 0 ? (
                                      <span className="badge badge-red text-xs px-2 py-0.5 font-extrabold">품절</span>
                                    ) : (
                                      <span className="font-semibold">{p.stock}개</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const nextActive = !(p.is_active !== false && p.is_active !== 0);
                                        const res = await updateProductActive(p.id, nextActive);
                                        if (!res.success) alert(res.message || '노출 상태 변경 실패');
                                      }}
                                      className={`btn py-1 px-3 text-2xs font-bold ${(p.is_active !== false && p.is_active !== 0) ? 'btn-secondary text-green-700 bg-green-50 border-green-200' : 'btn-secondary text-slate-500 bg-slate-100 border-slate-200'}`}
                                    >
                                      {(p.is_active !== false && p.is_active !== 0) ? '노출중' : '숨김'}
                                    </button>
                                  </td>
                                  <td className="py-3 px-2 text-xs text-light">{p.created_at ? formatOrderDateTime(p.created_at) : '-'}</td>
                                  <td className="py-3 px-2 text-center flex justify-center items-center gap-2">
                                    <button 
                                      onClick={() => handleCopyProduct(p)} 
                                      className="btn-icon text-amber-600 hover:bg-amber-50 px-2 py-1 rounded border border-amber-200 text-xs font-bold"
                                      title="이 상품 복사하여 새로 등록"
                                    >
                                      복사
                                    </button>
                                    <button onClick={() => openEditModal(p)} className="btn-icon text-primary hover:bg-purple-50 p-1.5 rounded border border-slate-200">
                                      <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteProduct(p.id)} className="btn-icon text-red-600 hover:bg-red-50 p-1.5 rounded border border-slate-200">
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="7" className="text-center py-6 text-sm text-light">해당 분류의 등록된 상품이 없습니다.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t flex-wrap">
                          <button 
                            disabled={prodPage === 1}
                            onClick={() => setProdPage(prev => Math.max(1, prev - 1))}
                            className="btn btn-secondary py-1 px-2 text-2xs"
                          >
                            이전
                          </button>
                          {pageNumbers.map(num => (
                            <button
                               key={num}
                               onClick={() => setProdPage(num)}
                               className={`py-1 px-2.5 text-2xs rounded border transition-all ${
                                 prodPage === num 
                                   ? 'bg-primary text-white border-primary font-bold' 
                                   : 'bg-white text-dark border-slate-200 hover:bg-slate-50'
                               }`}
                            >
                              {num}
                            </button>
                          ))}
                          <button 
                            disabled={prodPage === totalPages}
                            onClick={() => setProdPage(prev => Math.min(totalPages, prev + 1))}
                            className="btn btn-secondary py-1 px-2 text-2xs"
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              {/* Tab 3: Orders */}
              {activeTab === 'orders' && (
                <div className="tab-orders flex flex-col gap-6">
                  <h3 className="font-extrabold text-dark text-sm">전체 고객 주문 목록 ({orders.length}건)</h3>
                  <div className="table-responsive card p-4">
                    <table className="admin-table w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b text-sm text-light font-bold">
                          <th className="py-4 px-2.5">주문번호</th>
                          <th className="py-4 px-2.5">고객 정보</th>
                          <th className="py-4 px-2.5">주문 내역</th>
                          <th className="py-4 px-2.5">결제액</th>
                          <th className="py-4 px-2.5">배송지</th>
                          <th className="py-4 px-2.5">배송 상태</th>
                          <th className="py-4 px-2.5">처리 상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => (
                          <tr key={o.id} className="border-b text-sm text-dark hover:bg-slate-50">
                            <td className="py-4 px-2.5">
                              <div className="admin-order-id-card">
                                <span className="admin-order-id-label">주문번호</span>
                                <strong className="admin-order-id-value">{o.id}</strong>
                                <div className="admin-order-time">
                                  <span>주문 일시</span>
                                  <b>{formatOrderDateTime(o.created_at)}</b>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-2.5">
                              <button
                                type="button"
                                onClick={() => openCustomerAuth({ id: o.user_id, name: o.user_name, email: o.user_email })}
                                className="admin-customer-link"
                                title="관리자 비밀번호 확인 후 고객정보 보기"
                              >
                                {maskName(o.user_name) || '고객명 없음'}
                              </button>
                              <div className="text-xs text-light">{maskEmail(o.user_email)}</div>
                            </td>
                            <td className="py-4 px-2.5" style={{ minWidth: '220px' }}>
                              <div className="flex flex-col gap-2">
                                {o.order_items.map((item, idx) => {
                                  const itemStatus = item.status || o.status;
                                  return (
                                    <div key={idx} className="border border-slate-100 bg-slate-50/50 rounded-lg p-2 flex flex-col gap-1 shadow-2xs">
                                      <div className="flex justify-between items-center gap-1.5">
                                        <span className="font-bold text-slate-800 text-2xs">{item.name} x {item.quantity}</span>
                                        <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded ${
                                          itemStatus === 'pending' ? 'bg-purple-50 text-primary border border-purple-200' : 
                                          itemStatus === 'preparing' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                                          itemStatus === 'shipping' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
                                          itemStatus === 'delivered' ? 'bg-green-50 text-green-600 border border-green-200' : 
                                          itemStatus === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                          itemStatus === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 
                                          itemStatus === 'cancel_requested' ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                                          (itemStatus === 'returned' || itemStatus === 'refunded') ? 'bg-purple-600 text-white' :
                                          itemStatus.endsWith('ing') ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                          'bg-slate-50 text-slate-600 border border-slate-200'
                                        }`}
                                        style={
                                          (itemStatus === 'returned' || itemStatus === 'refunded') ? { backgroundColor: '#7c3aed', color: '#ffffff' } : {}
                                        }>
                                          {itemStatus === 'cancel_requested' ? '취소 요청중' : 
                                           itemStatus === 'pending' ? '결제완료' : 
                                           itemStatus === 'preparing' ? '배송준비중' : 
                                           itemStatus === 'shipping' ? '배송중' : 
                                           itemStatus === 'delivered' ? '배송완료' : 
                                           itemStatus === 'confirmed' ? '구매확정' : 
                                           itemStatus === 'cancelled' ? '취소완료' : 
                                           itemStatus === 'returned' ? '반품완료' : 
                                           itemStatus === 'refunded' ? '환불완료' : 
                                           itemStatus === 'exchanged' ? '교환완료' : 
                                           itemStatus === 'exchanging' ? '교환진행중' : 
                                           itemStatus === 'returning' ? '반품진행중' :
                                           itemStatus === 'refunding' ? '환불진행중' : itemStatus}
                                        </span>
                                      </div>

                                      {/* 개별 품목 취소 요청 관리자 액션 */}
                                      {itemStatus === 'cancel_requested' && (
                                        <div className="flex gap-1 mt-1 border-t pt-1">
                                          <button 
                                            onClick={() => handleApproveCancel(o.id, 'approve', item.id)}
                                            className="btn btn-primary text-3xs py-1 px-1.5 font-bold flex-1"
                                            style={{ backgroundColor: '#e11d48', borderColor: '#be123c', fontSize: '10px' }}
                                          >
                                            취소 승인
                                          </button>
                                          <button 
                                            onClick={() => handleApproveCancel(o.id, 'reject', item.id)}
                                            className="btn btn-secondary text-3xs py-1 px-1.5 font-bold flex-1"
                                            style={{ backgroundColor: '#ffffff', color: '#64748b', borderColor: '#cbd5e1', fontSize: '10px' }}
                                          >
                                            거부
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-4 px-2.5 font-bold text-primary text-base">{o.total_amount.toLocaleString()}원</td>
                            <td className="py-4 px-2.5">
                              <div className="tax-proof-admin-chip">
                                <strong>{getTaxDocumentLabel(o)}</strong>
                                <span>{getTaxDocumentStatusLabel(o)}</span>
                              </div>
                              {o.tax_invoice_required ? (
                                <div className="text-3xs text-red-600 font-bold mt-1">세금계산서 확인 필요</div>
                              ) : (
                                <div className="text-3xs text-slate-400 mt-1">세금계산서 대상 아님</div>
                              )}
                            </td>
                            <td className="py-4 px-2.5 max-w-xs truncate text-xs" title="상세 배송지는 고객정보창에서 확인할 수 있습니다.">{maskText(o.address)}</td>
                            <td className="py-4 px-2.5">
                              {(() => {
                                const claimReason = getClaimReasonLabel(o);
                                const shippingState = getShippingControlState(o);
                                return (
                                  <>
                              {/* 종합 대표 상태 배지 노출 및 배송관리 기능 */}
                              {(o.status === 'pending' || (o.status === 'part_cancelled' && shippingState.hasPendingItems)) && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="badge badge-purple text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content' }}>
                                    {o.status === 'part_cancelled' ? '부분취소 후 배송대기' : '결제완료 (배송대기)'}
                                  </span>
                                  <button 
                                    onClick={() => handleStatusChange(o.id, 'preparing')}
                                    className="btn btn-primary text-2xs py-1.5 px-3 font-bold w-full"
                                  >
                                    배송 준비 처리
                                  </button>
                                </div>
                              )}

                              {(o.status === 'preparing' || (o.status === 'part_cancelled' && shippingState.hasPreparingItems)) && (
                                <div className="flex flex-col gap-2.5 p-3 bg-slate-50 border rounded-xl" style={{ minWidth: '200px' }}>
                                  <span className="badge badge-orange text-2xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5" style={{ width: 'fit-content' }}>
                                    배송준비중
                                  </span>
                                  <div className="flex flex-col gap-1.5">
                                    <select 
                                      value={trackingInputs[o.id]?.carrier || 'logen'}
                                      onChange={(e) => setTrackingInputs(prev => ({
                                        ...prev,
                                        [o.id]: {
                                          ...prev[o.id],
                                          carrier: e.target.value
                                        }
                                      }))}
                                      className="form-select text-2xs p-1.5 border rounded-lg bg-white"
                                    >
                                      <option value="logen">로젠택배</option>
                                      <option value="cj">CJ대한통운</option>
                                      <option value="post">우체국택배</option>
                                    </select>
                                    <input 
                                      type="text" 
                                      placeholder="송장번호 입력"
                                      value={trackingInputs[o.id]?.tracking_number || ''}
                                      onChange={(e) => setTrackingInputs(prev => ({
                                        ...prev,
                                        [o.id]: {
                                          ...prev[o.id],
                                          tracking_number: e.target.value
                                        }
                                      }))}
                                      className="form-input text-2xs p-1.5 border rounded-lg"
                                      style={{ height: '32px' }}
                                    />
                                    <button 
                                      onClick={() => handleSendDelivery(o.id)}
                                      className="btn btn-primary text-2xs py-1.5 px-3 font-bold w-full"
                                    >
                                      발송 처리 (배송시작)
                                    </button>
                                  </div>
                                </div>
                              )}

                              {o.status === 'cancel_requested' && (
                                <div className="flex flex-col gap-1.5 p-3 bg-red-50 border border-red-200 rounded-xl" style={{ minWidth: '190px' }}>
                                  <span className="badge text-2xs font-extrabold px-2 py-0.5" style={{ width: 'fit-content', backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>
                                    구매취소 승인 대기
                                  </span>
                                  <span className="text-3xs text-red-700 font-semibold">
                                    주문 내역의 상품별 버튼으로 승인 또는 거부 처리하세요.
                                  </span>
                                </div>
                              )}

                              {(o.status === 'shipping' || (o.status === 'part_cancelled' && shippingState.hasShippingItems)) && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="badge badge-blue text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                                    배송 중
                                  </span>
                                  <div className="text-xs text-light">
                                    {o.carrier === 'logen' ? '로젠택배' : o.carrier === 'cj' ? 'CJ대한통운' : '우체국택배'}
                                  </div>
                                  <div className="text-xs font-mono font-bold text-dark">{o.tracking_number}</div>
                                  <button 
                                    onClick={() => handleCompleteDelivery(o.id)}
                                    className="btn btn-secondary text-2xs py-1.5 px-3 font-bold w-full"
                                    style={{ color: '#10b981', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }}
                                  >
                                    배송완료 처리
                                  </button>
                                </div>
                              )}

                              {o.status === 'delivered' && (
                                <div className="flex flex-col gap-1">
                                  <span className="badge badge-green text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                                    배송 완료
                                  </span>
                                  <div className="text-xs text-light">
                                    {o.carrier === 'logen' ? '로젠택배' : o.carrier === 'cj' ? 'CJ대한통운' : '우체국택배'}
                                  </div>
                                  <div className="text-xs font-mono text-light">{o.tracking_number}</div>
                                </div>
                              )}

                              {o.status === 'confirmed' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                                  구매 확정 완료
                                </span>
                              )}

                              {o.status === 'part_confirmed' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                                  부분 구매확정
                                </span>
                              )}

                              {o.status === 'cancelled' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#ffe4e6', color: '#e11d48', border: '1px solid #fecdd3' }}>
                                  주문취소 완료
                                </span>
                              )}

                              {o.status === 'part_cancelled' && !shippingState.hasActiveItems && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#ffe4e6', color: '#e11d48', border: '1px solid #fecdd3' }}>
                                  부분 취소완료
                                </span>
                              )}

                              {o.status === 'returning' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                                  반품-환불 신청중
                                </span>
                              )}

                              {o.status === 'returned' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                                  반품-환불 완료
                                </span>
                              )}

                              {o.status === 'exchanging' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                                  반품-교환 신청중
                                </span>
                              )}

                              {o.status === 'exchanged' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                                  반품-교환 완료
                                </span>
                              )}

                              {o.status === 'refunding' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d' }}>
                                  반품-환불 신청중
                                </span>
                              )}

                              {o.status === 'refunded' && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                                  반품-환불 완료
                                </span>
                              )}

                              {['part_returning', 'part_exchanging', 'part_refunding'].includes(o.status) && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                  일부 상품 교환/환불 신청중
                                </span>
                              )}

                              {['part_returned', 'part_exchanged', 'part_refunded'].includes(o.status) && (
                                <span className="badge text-xs px-2 py-1 text-center font-bold" style={{ display: 'inline-block', width: 'fit-content', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                                  일부 상품 교환/환불 완료
                                </span>
                              )}
                              {claimReason && (
                                <div className="admin-claim-reason-card">
                                  <div className="admin-claim-reason-head">
                                    <span>{claimReason.typeLabel}</span>
                                    <em>{claimReason.reasonTypeLabel}</em>
                                  </div>
                                  <p>{claimReason.reason}</p>
                                </div>
                              )}
                                  </>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: Users */}
              {activeTab === 'users' && (
                <div className="tab-users flex flex-col gap-6">
                  <h3 className="font-extrabold text-dark text-sm">가입 고객 및 회원 리스트</h3>
                  <div className="table-responsive card p-4">
                    <table className="admin-table w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b text-xs text-light font-bold">
                          <th className="py-3 px-2">ID</th>
                          <th className="py-3 px-2">이메일</th>
                          <th className="py-3 px-2">고객명</th>
                          <th className="py-3 px-2">권한</th>
                          <th className="py-3 px-2">가입일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.reduce((acc, curr) => {
                          if (!acc.some(u => u.id === curr.user_id)) {
                            acc.push({
                              id: curr.user_id,
                              email: curr.user_email,
                              name: curr.user_name,
                              role: 'user',
                              created_at: curr.created_at
                            });
                          }
                          return acc;
                        }, []).map(u => (
                          <tr key={u.id} className="border-b text-xs text-dark hover:bg-slate-50">
                            <td className="py-3 px-2 font-mono font-bold text-light">{u.id}</td>
                            <td className="py-3 px-2 font-bold">{maskEmail(u.email)}</td>
                            <td className="py-3 px-2">
                              <button
                                type="button"
                                onClick={() => openCustomerAuth(u)}
                                className="admin-customer-link compact"
                                title="관리자 비밀번호 확인 후 고객정보 보기"
                              >
                                {maskName(u.name) || '고객명 없음'}
                              </button>
                            </td>
                            <td className="py-3 px-2">
                              <span className="badge badge-purple text-2xs">USER</span>
                            </td>
                            <td className="py-3 px-2 text-light">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 5: Categories */}
              {activeTab === 'categories' && (
                <div className="tab-categories flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-dark text-sm">품목군(카테고리) 목록 ({categories.length}종)</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Category Form */}
                    <div className="card p-5 h-fit">
                      <h4 className="font-bold text-dark text-sm mb-4">신규 품목군 등록</h4>
                      
                      {catError && (
                        <div className="alert-box alert-danger mb-3 text-xs font-semibold flex items-center gap-1">
                          <AlertTriangle size={12} /> {catError}
                        </div>
                      )}
                      {catSuccess && (
                        <div className="alert-box alert-success mb-3 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle size={12} /> {catSuccess}
                        </div>
                      )}

                      <div className="form-group mb-3">
                        <label className="form-label text-xs font-bold mb-1">품목군 고유 코드 ID *</label>
                        <input 
                          type="text" 
                          className="form-input text-xs"
                          value={newCatId}
                          onChange={(e) => setNewCatId(e.target.value)}
                          placeholder="영문 소문자 (예: sensor)"
                        />
                      </div>
                      <div className="form-group mb-4">
                        <label className="form-label text-xs font-bold mb-1">품목군 한글 노출명 *</label>
                        <input 
                          type="text" 
                          className="form-input text-xs"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="한글 (예: 센서)"
                        />
                      </div>
                      <button 
                        onClick={async () => {
                          setCatError('');
                          setCatSuccess('');
                          if(!newCatId || !newCatName) {
                            setCatError('코드 ID와 이름을 모두 입력해주세요.');
                            return;
                          }
                          const res = await createCategory(newCatId, newCatName);
                          if(res.success) {
                            setCatSuccess('품목군이 추가되었습니다.');
                            setNewCatId('');
                            setNewCatName('');
                          } else {
                            setCatError(res.message || '추가 실패');
                          }
                        }}
                        className="btn btn-primary w-full py-2 text-xs font-bold"
                      >
                        품목군 추가하기
                      </button>
                    </div>

                    {/* Category List */}
                    <div className="lg:col-span-2 table-responsive card p-4">
                      <table className="admin-table w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b text-xs text-light font-bold">
                            <th className="py-3 px-2">품목군 코드 (ID)</th>
                            <th className="py-3 px-2">노출 이름</th>
                            <th className="py-3 px-2 text-center">삭제</th>
                          </tr>
                        </thead>
                        <tbody>
                          {localCategories.map((cat, index) => (
                            <tr 
                              key={cat.id} 
                              className="border-b text-xs text-dark hover:bg-slate-50 draggable-row"
                              draggable={true}
                              onDragStart={() => handleCatDragStart(index)}
                              onDragOver={(e) => handleCatDragOver(e, index)}
                              onDragEnd={handleCatDragEnd}
                            >
                              <td className="py-3 px-2 font-mono font-bold text-light">{cat.id}</td>
                              <td className="py-3 px-2">
                                {editingCatId === cat.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingCatName}
                                      onChange={(e) => setEditingCatName(e.target.value)}
                                      className="form-input text-xs py-1 px-2 border rounded-lg bg-white"
                                      style={{ width: '150px', height: '30px' }}
                                    />
                                    <button
                                      onClick={async () => {
                                        if (!editingCatName.trim()) {
                                          alert('품목군 이름을 입력해주세요.');
                                          return;
                                        }
                                        const res = await updateCategory(cat.id, editingCatName.trim());
                                        if (res.success) {
                                          setEditingCatId(null);
                                        } else {
                                          alert(res.message || '수정 실패');
                                        }
                                      }}
                                      className="btn btn-primary text-2xs py-1 px-2.5 font-bold"
                                    >
                                      저장
                                    </button>
                                    <button
                                      onClick={() => setEditingCatId(null)}
                                      className="btn btn-secondary text-2xs py-1 px-2.5 font-bold"
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-dark text-sm">{cat.name}</span>
                                    <button
                                      onClick={() => {
                                        setEditingCatId(cat.id);
                                        setEditingCatName(cat.name);
                                      }}
                                      className="text-primary hover:underline text-3xs font-bold bg-purple-50 px-1.5 py-0.5"
                                      style={{ cursor: 'pointer', border: '1px solid #c084fc', borderRadius: '4px' }}
                                    >
                                      수정
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <button 
                                  onClick={async () => {
                                    if(window.confirm(`정말로 '${cat.name}' 품목군을 삭제하시겠습니까?`)) {
                                      const res = await deleteCategory(cat.id);
                                      if(res.success) {
                                        alert('품목군이 삭제되었습니다.');
                                      } else {
                                        alert(res.message);
                                      }
                                    }
                                  }}
                                  className="btn-icon text-red-600 hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {/* Tab 6: Claims Management */}
              {activeTab === 'claims' && (
                <div className="tab-claims flex flex-col gap-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-dark text-sm">반품-환불 / 반품-교환 요청 내역 ({claims.length}건)</h3>
                  </div>

                  <div className="table-responsive card p-4">
                    {claims.length > 0 ? (
                      <table className="admin-table w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b text-xs text-light font-bold">
                            <th className="py-3 px-2">신청정보</th>
                            <th className="py-3 px-2">고객명</th>
                            <th className="py-3 px-2">신청구분</th>
                            <th className="py-3 px-2">사유</th>
                            <th className="py-3 px-2">진행 상태</th>
                            <th className="py-3 px-2">관리자 답변 / 처리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.map(claim => (
                            <tr key={claim.id} className="border-b text-xs text-dark hover:bg-slate-50">
                              <td className="py-3 px-2">
                                <span className="font-bold block text-primary">{claim.order_id}</span>
                                {(() => {
                                  try {
                                    const items = typeof claim.order_items === 'string' ? JSON.parse(claim.order_items) : claim.order_items;
                                    const match = items.find(item => item.id === claim.product_id);
                                    return match ? (
                                      <div className="text-2xs font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-1" style={{ width: 'fit-content' }}>
                                        🎯 대상: {match.name} ({match.quantity}개)
                                      </div>
                                    ) : (
                                      <div className="text-2xs text-light mt-1">대상 상품 정보를 찾을 수 없음</div>
                                    );
                                  } catch (e) {
                                    return <div className="text-2xs text-light mt-1">대상: {claim.product_id}</div>;
                                  }
                                })()}
                                <span className="text-3xs text-light block mt-1">
                                  {new Date(claim.created_at).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <span className="font-bold block">{maskName(claim.user_name) || '고객명 없음'}</span>
                                <span className="text-3xs text-light font-mono block">{maskEmail(claim.user_email)}</span>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`badge font-bold px-2 py-0.5 rounded text-2xs ${
                                    claim.claim_type === 'return' || claim.claim_type === 'refund' ? 'bg-red-50 text-red-600 border border-red-200' :
                                    'bg-blue-50 text-blue-600 border border-blue-200'
                                  }`}>
                                    {claim.claim_type === 'return' || claim.claim_type === 'refund' ? '반품-환불' : '반품-교환'}
                                  </span>
                                  <span className={`text-3xs font-extrabold px-1 py-0.2 rounded ${
                                    claim.reason_type === 'buyer' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {claim.reason_type === 'buyer' ? '단순변심/고객과실' : '제품불량/오발송'}
                                  </span>
                                  <span className="text-3xs text-light">
                                    {claim.pickup_type === 'pickup' ? ' 지정택배수거' : ' 자가반송(선불)'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 font-medium" style={{ maxWidth: '200px', wordBreak: 'break-all' }}>
                                <div className="text-xs text-dark">{claim.reason}</div>
                                {claim.sweettracker_receipt_no && (
                                  <div className="text-3xs text-blue-600 font-bold mt-1 bg-blue-50 p-1 rounded border border-blue-100" style={{ display: 'inline-block' }}>
                                    택배예약: {claim.sweettracker_receipt_no}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className={`badge font-black text-2xs px-2 py-0.5 rounded ${
                                    claim.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                                    claim.status === 'approved' || claim.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    'bg-slate-100 text-slate-800'
                                  }`}>
                                    {claim.status === 'requested' ? '신청접수' :
                                     claim.status === 'approved' || claim.status === 'completed' ? '승인완료' : '반려됨'}
                                  </span>
                                  
                                  {/* 정산 수식액 노출 */}
                                  {(claim.claim_type === 'return' || claim.claim_type === 'refund') && (
                                    <div className="text-3xs font-semibold text-slate-500 mt-1">
                                      {claim.shipping_fee > 0 ? (
                                        <>
                                          <div>배송비: -{claim.shipping_fee.toLocaleString()}원</div>
                                          <div className="text-primary font-bold">환불액: {claim.refund_amount.toLocaleString()}원</div>
                                        </>
                                      ) : (
                                        <div className="text-primary font-bold">환불액: {claim.refund_amount.toLocaleString()}원 (전액)</div>
                                      )}
                                    </div>
                                  )}
                                  {claim.claim_type === 'exchange' && (
                                    <div className="text-3xs font-semibold text-slate-500 mt-1">
                                      {claim.shipping_fee > 0 ? (
                                        <div className="text-red-600 font-bold">청구 배송비: {claim.shipping_fee.toLocaleString()}원</div>
                                      ) : (
                                        <div className="text-green-700 font-bold">배송비 면제 (무상)</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {claim.answer && (
                                  <div className="text-3xs text-light mt-1 bg-slate-50 p-1.5 rounded border">
                                    <b>답변:</b> {claim.answer}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                {claim.status === 'requested' ? (
                                  <div className="flex flex-col gap-1.5" style={{ maxWidth: '200px' }}>
                                    <input
                                      type="text"
                                      placeholder="처리 답변 입력..."
                                      value={claimAnswers[claim.id] || ''}
                                      onChange={(e) => setClaimAnswers({ ...claimAnswers, [claim.id]: e.target.value })}
                                      className="form-input text-3xs p-1"
                                      style={{ height: '24px', fontSize: '11px' }}
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleClaimStatusChange(claim.id, 'approved')}
                                        className="btn btn-primary text-3xs py-1 px-2 font-bold flex-1"
                                        style={{ fontSize: '10px' }}
                                      >
                                        {claim.claim_type === 'refund' || claim.claim_type === 'return' ? '반품-환불 승인' : '반품-교환 승인'}
                                      </button>
                                      <button
                                        onClick={() => handleClaimStatusChange(claim.id, 'rejected')}
                                        className="btn btn-secondary text-3xs py-1 px-2 font-bold flex-1"
                                        style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#64748b' }}
                                      >
                                        거절 (반려)
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-3xs text-light italic">처리 완료</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-light text-xs italic">
                        접수된 환불/교환 요청 내역이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 7: Simulated Settlements Dashboard */}
              {activeTab === 'settlement' && settlementData && (
                <div className="tab-settlement flex flex-col gap-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-dark text-sm">정산 관리 및 현황</h3>
                      <p className="text-3xs text-light mt-0.5">※ 구매확정 처리가 끝난 모의 신용카드 결제 주문들의 정산 요약본입니다.</p>
                    </div>
                  </div>

                  {/* Summary Indicator Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-5 bg-white border border-slate-100 flex flex-col justify-between">
                      <span className="text-xs font-bold text-light">정산 대상 총 주문</span>
                      <h4 className="font-extrabold text-lg text-dark mt-2">{settlementData.summary.total_orders} 건</h4>
                    </div>
                    <div className="card p-5 bg-white border border-slate-100 flex flex-col justify-between">
                      <span className="text-xs font-bold text-light">누적 총 주문금액 (VAT포함)</span>
                      <h4 className="font-extrabold text-lg text-primary mt-2">{(settlementData.summary.total_sales || 0).toLocaleString()}원</h4>
                    </div>
                    <div className="card p-5 bg-green-50 border border-green-100 flex flex-col justify-between">
                      <span className="text-xs font-bold text-green-700">정산 완료 지급액 (수수료 제함)</span>
                      <h4 className="font-extrabold text-lg text-green-700 mt-2">{(settlementData.summary.total_settled || 0).toLocaleString()}원</h4>
                    </div>
                    <div className="card p-5 bg-amber-50 border border-amber-100 flex flex-col justify-between">
                      <span className="text-xs font-bold text-amber-700">정산 대기 예정액</span>
                      <h4 className="font-extrabold text-lg text-amber-700 mt-2">{(settlementData.summary.pending_settled || 0).toLocaleString()}원</h4>
                    </div>
                  </div>

                  {/* Settlement Detailed Ledger Table */}
                  <div className="table-responsive card p-4">
                    <h4 className="font-bold text-dark text-xs mb-3">정산 상세 명세 대장</h4>
                    {settlementData.settlements.length > 0 ? (
                      <table className="admin-table w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b text-xs text-light font-bold">
                            <th className="py-3 px-2">주문번호</th>
                            <th className="py-3 px-2">구매고객</th>
                            <th className="py-3 px-2">구매확정일</th>
                            <th className="py-3 px-2 text-right">총 주문액</th>
                            <th className="py-3 px-2 text-right">수수료 (3.3%)</th>
                            <th className="py-3 px-2 text-right">최종 정산지급액</th>
                            <th className="py-3 px-2">정산지급일 (예정)</th>
                            <th className="py-3 px-2">지급상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlementData.settlements.map((s, idx) => (
                            <tr key={idx} className="border-b text-xs text-dark hover:bg-slate-50">
                              <td className="py-3 px-2 font-bold font-mono text-primary">{s.order_id}</td>
                              <td className="py-3 px-2 font-medium">{maskName(s.user_name) || '고객명 없음'}</td>
                              <td className="py-3 px-2 text-light">{new Date(s.confirmed_at).toLocaleDateString()}</td>
                              <td className="py-3 px-2 font-bold text-right">{s.total_amount.toLocaleString()}원</td>
                              <td className="py-3 px-2 text-red-500 text-right">-{s.fee.toLocaleString()}원</td>
                              <td className="py-3 px-2 font-extrabold text-green-600 text-right">{s.payout_amount.toLocaleString()}원</td>
                              <td className="py-3 px-2 font-mono text-dark">{s.settlement_date}</td>
                              <td className="py-3 px-2">
                                <span className={`badge font-bold px-2 py-0.5 rounded text-3xs ${
                                  s.status === '정산완료' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-light text-xs italic">
                        정산 가능한 구매확정 완료 건이 아직 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal: Product Add/Edit */}
      {showProductModal && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div 
            className="modal-content card p-6 max-w-lg w-full relative animate-scale-up"
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            <button onClick={() => setShowProductModal(false)} className="absolute top-4 right-4 text-light hover:text-dark">
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-dark text-sm border-b pb-2 mb-4">
              {editingProduct ? '상품 정보 수정' : '신규 상품 등록'}
            </h3>

            {formError && (
              <div className="alert-box alert-danger mb-4 text-xs font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> {formError}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border rounded-xl p-3">
                <div className="form-group">
                  <label className="form-label text-xs font-bold mb-1">브랜드</label>
                  <input
                    type="text"
                    className="form-input text-xs"
                    value={prodForm.brand || ''}
                    onChange={(e) => setProdForm({...prodForm, brand: e.target.value})}
                    placeholder="예: 파나소닉, 미쓰비시, 파스텍"
                  />
                </div>
                <label className="form-group flex items-center gap-2 pt-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodForm.is_active !== false}
                    onChange={(e) => setProdForm({...prodForm, is_active: e.target.checked})}
                  />
                  <span className="text-xs font-bold text-dark">고객 화면에 노출</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-xs font-bold mb-1">상품 고유 ID *</label>
                  <input 
                    type="text" 
                    className="form-input text-xs"
                    value={prodForm.id}
                    onChange={(e) => setProdForm({...prodForm, id: e.target.value})}
                    placeholder="예: inovance-sv670"
                    disabled={!!editingProduct}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-bold mb-1">카테고리 *</label>
                  <select 
                    className="form-select text-xs"
                    value={prodForm.category}
                    onChange={(e) => setProdForm({...prodForm, category: e.target.value})}
                  >
                    {categories && categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold mb-1">상품명 *</label>
                <input 
                  type="text" 
                  className="form-input text-xs"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({...prodForm, name: e.target.value})}
                  placeholder="예: 이노밴스 SV670 서보드라이브"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-xs font-bold mb-1">판매 가격 (원) *</label>
                  <input 
                    type="number" 
                    className="form-input text-xs font-bold text-primary"
                    value={prodForm.price}
                    onChange={(e) => {
                      setProdForm({...prodForm, price: e.target.value});
                      setPriceConfirmed(false); // Reset confirmation on change
                    }}
                    placeholder="숫자만 입력"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-bold mb-1">초기 재고수량</label>
                  <input 
                    type="number" 
                    className="form-input text-xs"
                    value={prodForm.stock}
                    onChange={(e) => setProdForm({...prodForm, stock: Number(e.target.value)})}
                    placeholder="수량"
                  />
                </div>
              </div>

              <div className="form-group flex flex-col gap-2">
                <label className="form-label text-xs font-bold">
                  상품 이미지 등록 (최대 3장 - 현재 {(prodForm.images || []).length}/3장)
                </label>
                
                {/* Images Preview List */}
                {(prodForm.images || []).length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {prodForm.images.map((imgUrl, idx) => (
                      <div 
                        key={idx}
                        className="border rounded overflow-hidden"
                        style={{ 
                          position: 'relative', 
                          width: '80px', 
                          height: '80px', 
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Preview ${idx + 1}`} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover' 
                          }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveImageIndex(idx)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: '9999px',
                            border: 'none',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                          title="이미지 삭제"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add controls - only display if images count < 3 */}
                {(prodForm.images || []).length < 3 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* File Upload Trigger */}
                    <div>
                      <input 
                        type="file" 
                        onChange={handleImageUpload} 
                        style={{ display: 'none' }} 
                        id="img-upload-input" 
                        accept="image/*" 
                      />
                      <label 
                        htmlFor="img-upload-input" 
                        className={`btn btn-secondary py-1.5 px-3 text-2xs cursor-pointer flex items-center gap-1.5 w-fit ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Upload size={12} />
                        {uploading ? '업로드 중...' : '컴퓨터에서 파일 선택'}
                      </label>
                    </div>

                    <span className="text-2xs text-light font-bold">또는</span>

                    {/* URL Text input with Add button */}
                    <div className="flex-1 min-w-[200px] flex items-center gap-1">
                      <input 
                        type="text" 
                        className="form-input text-xs flex-1 py-1.5"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="이미지 URL 입력"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddUrlImage}
                        className="btn btn-primary py-1.5 px-2.5 text-2xs font-bold"
                        style={{ height: '32px' }}
                      >
                        추가
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xs text-light italic">최대 3장의 사진 등록이 완료되었습니다. 다른 이미지를 올리려면 위 썸네일에서 삭제해 주세요.</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold mb-1">상품 설명</label>
                <textarea 
                  className="form-input text-xs h-20 resize-none"
                  value={prodForm.description}
                  onChange={(e) => setProdForm({...prodForm, description: e.target.value})}
                  placeholder="상품 상세 소개 글"
                />
              </div>

              <div className="specs-section bg-slate-50 p-3 rounded border">
                <h4 className="text-xs font-bold mb-2">상세 사양 명세 (Specs)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group">
                    <label className="text-2xs text-light font-bold">제조 메이커</label>
                    <input 
                      type="text" 
                      className="form-input text-xs"
                      value={prodForm.specs['메이커'] || ''}
                      onChange={(e) => handleSpecChange('메이커', e.target.value)}
                      placeholder="예: INOVANCE"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-2xs text-light font-bold">상세 스펙 항목</label>
                    <input 
                      type="text" 
                      className="form-input text-xs"
                      value={prodForm.specs['상세정보'] || ''}
                      onChange={(e) => handleSpecChange('상세정보', e.target.value)}
                      placeholder="예: 23-bit, EtherCAT 지원"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full py-2.5 font-bold text-xs mt-2">
                {editingProduct ? '정보 수정하기' : '신규 상품 등록하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Category Selector before Product Add */}
      {showCategorySelector && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div className="modal-content card p-6 max-w-md w-full relative animate-scale-up text-center">
            <button onClick={() => setShowCategorySelector(false)} className="absolute top-4 right-4 text-light hover:text-dark">
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-dark text-base mb-2">등록 품목군(카테고리) 선택</h3>
            <p className="text-xs text-light mb-6">등록하려는 상품의 대분류 품목군을 먼저 선택해 주세요.</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {categories && categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setShowCategorySelector(false);
                    openAddModal(cat.id);
                  }}
                  className="p-4 border rounded-lg hover:border-primary hover:bg-purple-50 transition-all text-xs font-bold text-dark flex flex-col items-center justify-center gap-2"
                >
                  <Cpu size={24} className="text-primary" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {customerAuthTarget && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div className="modal-content admin-secure-modal card p-6 max-w-md w-full relative animate-scale-up">
            <button onClick={closeCustomerAuth} className="absolute top-4 right-4 text-light hover:text-dark">
              <X size={18} />
            </button>
            <div className="secure-modal-icon">
              <Lock size={22} />
            </div>
            <h3 className="font-extrabold text-dark text-lg mb-2">관리자 보안 확인</h3>
            <p className="text-xs text-light leading-relaxed mb-4">
              고객 상세정보와 구매내역은 개인정보가 포함된 관리자 전용 영역입니다. 업무 목적 외 열람을 금지하며,
              계속하려면 관리자 비밀번호를 입력해 주세요.
            </p>
            <div className="secure-warning-box mb-4">
              <ShieldCheck size={15} />
              <span>관리자만 접근 가능하며, 고객정보는 외부 공유 및 무단 저장을 금지합니다.</span>
            </div>
            <form onSubmit={handleCustomerDetailAuth} className="flex flex-col gap-3">
              <input
                type="password"
                className="form-input text-sm"
                value={customerAuthPassword}
                onChange={(e) => setCustomerAuthPassword(e.target.value)}
                placeholder="관리자 비밀번호 입력"
                autoFocus
              />
              {customerAuthError && (
                <div className="alert-box alert-danger text-xs font-bold">
                  {customerAuthError}
                </div>
              )}
              <button type="submit" className="btn btn-primary w-full py-2.5 font-bold" disabled={loadingCustomerDetail}>
                {loadingCustomerDetail ? '확인 중...' : '고객정보창 열기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {customerDetail && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div className="modal-content admin-customer-detail card p-0 max-w-5xl w-full relative animate-scale-up">
            <div className="customer-detail-header">
              <div>
                <span className="customer-detail-kicker">Secure Customer Profile</span>
                <h3 className="font-extrabold text-xl text-white">고객정보창</h3>
                <p className="text-xs text-purple-100 mt-1">관리자 비밀번호 확인 후 표시되는 전체 고객정보입니다.</p>
              </div>
              <button onClick={() => setCustomerDetail(null)} className="customer-detail-close">
                <X size={18} />
              </button>
            </div>

            <div className="customer-detail-body">
              <div className="secure-warning-box strong mb-5">
                <AlertTriangle size={16} />
                <span>보안경고: 본 화면의 개인정보는 고객 응대, 배송, 주문 관리 목적 외 사용하거나 외부로 공유할 수 없습니다.</span>
              </div>

              <div className="customer-detail-grid">
                <section className="customer-detail-card">
                  <h4>기본 고객정보</h4>
                  <div className="detail-row"><span>고객명</span><b>{customerDetail.user.name || ''}</b></div>
                  <div className="detail-row"><span>이메일</span><b>{customerDetail.user.email}</b></div>
                  <div className="detail-row"><span>연락처</span><b>{customerDetail.user.phone || '-'}</b></div>
                  <div className="detail-row"><span>기본 배송지</span><b>{customerDetail.user.address || '-'}</b></div>
                  <div className="detail-row"><span>가입일</span><b>{new Date(customerDetail.user.created_at).toLocaleString()}</b></div>
                </section>

                <section className="customer-detail-card summary">
                  <h4>구매 요약</h4>
                  <div className="summary-metric"><span>총 주문</span><b>{customerDetail.summary.order_count}건</b></div>
                  <div className="summary-metric"><span>누적 구매금액</span><b>{customerDetail.summary.total_spent.toLocaleString()}원</b></div>
                  <div className="summary-metric"><span>교환/환불 이력</span><b>{customerDetail.summary.claim_count}건</b></div>
                  <div className="summary-metric"><span>최근 주문일</span><b>{customerDetail.summary.last_order_at ? new Date(customerDetail.summary.last_order_at).toLocaleDateString() : '-'}</b></div>
                </section>
              </div>

              <section className="customer-detail-section">
                <h4>구매내역</h4>
                {customerDetail.orders.length > 0 ? (
                  <div className="customer-order-list">
                    {customerDetail.orders.map(order => (
                      <div key={order.id} className="customer-order-card">
                        <div className="customer-order-top">
                          <b>{order.id}</b>
                          <span>{order.status}</span>
                        </div>
                        <div className="customer-order-items">
                          {order.order_items.map((item, idx) => (
                            <span key={`${order.id}-${item.id}-${idx}`}>{item.name} x {item.quantity}</span>
                          ))}
                        </div>
                        <div className="customer-order-meta">
                          <span>{Number(order.total_amount || 0).toLocaleString()}원</span>
                          <span>{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        <p>{order.address}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-light">구매내역이 없습니다.</p>
                )}
              </section>

              <section className="customer-detail-section">
                <h4>취소/교환/환불 이력</h4>
                {customerDetail.claims.length > 0 ? (
                  <div className="customer-claim-list">
                    {customerDetail.claims.map(claim => (
                      <div key={claim.id} className="customer-claim-card">
                        <b>{claim.claim_type === 'exchange' ? '반품-교환' : '반품-환불'} · {claim.status}</b>
                        <span>주문번호: {claim.order_id}</span>
                        <span>사유: {claim.reason}</span>
                        <span>처리일: {new Date(claim.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-light">취소/교환/환불 이력이 없습니다.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
