import React, { useMemo, useState } from 'react';
import { useShop } from '../context/ShopContext';
import ProductCompare from '../components/ProductCompare';
import { ArrowLeftRight, Search, ShoppingCart } from 'lucide-react';
import './ProductList.css';

const normalizeParentId = (value) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const buildCategoryTree = (items = []) => {
  const lookup = new Map();
  const childrenMap = new Map();

  items.forEach((item) => {
    const node = {
      ...item,
      parent_id: normalizeParentId(item.parent_id)
    };
    lookup.set(node.id, node);
    const parentKey = normalizeParentId(node.parent_id);
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, []);
    }
    childrenMap.get(parentKey).push(node);
  });

  const sortNodes = (nodes = []) => [...nodes].sort((a, b) => {
    const aOrder = Number(a.sort_order || 0);
    const bOrder = Number(b.sort_order || 0);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
  });

  const buildNode = (node) => ({
    ...node,
    children: sortNodes(childrenMap.get(node.id) || []).map(buildNode)
  });

  return {
    lookup,
    tree: sortNodes(childrenMap.get(null) || []).map(buildNode)
  };
};

const collectDescendantIds = (nodes = [], rootId) => {
  const descendants = new Set();
  const walk = (list) => {
    list.forEach((node) => {
      if (!node) return;
      descendants.add(node.id);
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    });
  };

  const findNode = (list) => {
    for (const node of list) {
      if (node.id === rootId) return node;
      const childMatch = findNode(node.children || []);
      if (childMatch) return childMatch;
    }
    return null;
  };

  const root = findNode(nodes);
  if (root && Array.isArray(root.children)) {
    walk(root.children);
  }
  return descendants;
};

const hasActiveDescendant = (nodes = [], activeCategory) =>
  nodes.some((node) => node.id === activeCategory || hasActiveDescendant(node.children || [], activeCategory));

function CategoryNode({
  node,
  depth,
  activeCategory,
  onSelect
}) {
  const expanded = activeCategory === node.id || hasActiveDescendant(node.children || [], activeCategory);

  return (
    <div className="category-tree-node" style={{ '--node-depth': depth }}>
      <button
        type="button"
        className={`category-tree-button ${activeCategory === node.id ? 'active' : ''}`}
        onClick={() => onSelect(node.id)}
      >
        <span className="category-tree-name">{node.name}</span>
      </button>
      {expanded && node.children?.length > 0 && (
        <div className="category-tree-children">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeCategory={activeCategory}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductList() {
  const {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    navigate,
    addToCart,
    addToCompare,
    compareList,
    products,
    categories
  } = useShop();

  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  const activeProducts = useMemo(
    () => (products || []).filter((product) => product.is_active !== false && product.is_active !== 0),
    [products]
  );

  const { tree, lookup } = useMemo(() => buildCategoryTree(categories || []), [categories]);

  const descendantIds = useMemo(() => {
    if (activeCategory === 'all') return null;
    const ids = new Set([activeCategory, ...collectDescendantIds(tree, activeCategory)]);
    return ids;
  }, [activeCategory, tree]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory = activeCategory === 'all' || descendantIds?.has(product.category);
      const matchesSearch = !query ||
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        (product.specs && typeof product.specs === 'object' && Object.values(product.specs).some((value) =>
          String(value).toLowerCase().includes(query)
        ));
      return matchesCategory && matchesSearch;
    });
  }, [activeProducts, activeCategory, descendantIds, searchQuery]);

  const currentCategoryName = activeCategory === 'all'
    ? '전체 상품'
    : lookup.get(activeCategory)?.name || activeCategory;

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    setSearchQuery('');
  };

  const handleCompareClick = (product, event) => {
    event.stopPropagation();
    const res = addToCompare(product);
    if (!res.success) {
      alert(res.message);
      return;
    }
    alert(`${product.name} 상품이 비교 목록에 추가되었습니다.`);
  };

  const handleCartClick = (product, event) => {
    event.stopPropagation();
    addToCart(product, 1);
    alert(`${product.name} 1개가 장바구니에 담겼습니다.`);
  };

  return (
    <div className="product-list-page">
      <ProductCompare />

      <div className="product-list-shell container">
        <aside className={`category-card ${showSidebarMobile ? 'open' : ''}`}>
          <div className="category-card-head">
            <h4>카테고리</h4>
            <button
              type="button"
              className="category-card-toggle"
              onClick={() => setShowSidebarMobile((prev) => !prev)}
            >
              {showSidebarMobile ? '접기' : '펼치기'}
            </button>
          </div>
          <button
            type="button"
            className={`category-tree-button ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleCategoryClick('all')}
          >
            전체 상품
          </button>
          <div className="category-tree">
            {tree.map((node) => (
              <CategoryNode
                key={node.id}
                node={node}
                depth={0}
                activeCategory={activeCategory}
                onSelect={handleCategoryClick}
              />
            ))}
          </div>
        </aside>

        <main className="product-list-main">
          <section className="list-hero-card">
            <div className="list-hero-copy">
              <span className="list-hero-kicker">B2B FA PARTS</span>
              <h2>{currentCategoryName}</h2>
              <p>카테고리를 선택하면 해당 상품만 깔끔하게 확인할 수 있습니다.</p>
            </div>
            <div className="list-hero-count">{filteredProducts.length}개</div>
          </section>

          {filteredProducts.length > 0 ? (
            <div className="product-card-grid">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="simple-product-card"
                  onClick={() => navigate('productDetail', product.id)}
                >
                  <div className="simple-product-image">
                    <img src={product.image ? product.image.split(',')[0] : ''} alt={product.name} />
                  </div>
                  <div className="simple-product-body">
                    <div className="product-meta-line">
                      <span>{lookup.get(product.category)?.name || product.category}</span>
                      {product.brand && <span>{product.brand}</span>}
                    </div>
                    <h3>{product.name}</h3>
                    <p>
                      {product.description
                        ? `${product.description.slice(0, 58)}...`
                        : '상품 상세 설명은 상품 페이지에서 확인할 수 있습니다.'}
                    </p>
                    <div className="simple-product-bottom">
                      <strong>{Number(product.price || 0).toLocaleString()}원</strong>
                      <div className="product-action-row">
                        <button
                          type="button"
                          className={`mini-action-btn ${compareList.some((item) => item.id === product.id) ? 'active' : ''}`}
                          onClick={(event) => handleCompareClick(product, event)}
                        >
                          <ArrowLeftRight size={13} /> 비교
                        </button>
                        <button
                          type="button"
                          className="mini-action-btn primary"
                          onClick={(event) => handleCartClick(product, event)}
                        >
                          <ShoppingCart size={13} /> 담기
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-product-card">
              <Search size={42} />
              <h4>상품이 없습니다.</h4>
              <p>카테고리를 바꾸거나 검색어를 지우고 다시 확인해 주세요.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                전체 상품 보기
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
