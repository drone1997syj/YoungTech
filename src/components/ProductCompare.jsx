import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { X, ShoppingCart, Trash2, ArrowLeftRight } from 'lucide-react';
import './ProductCompare.css';

export default function ProductCompare() {
  const { compareList, removeFromCompare, clearCompare, addToCart } = useShop();
  const [isOpen, setIsOpen] = useState(true);

  if (compareList.length === 0) return null;

  // Extract all unique spec keys across the products in the compare list
  const specKeys = Array.from(
    new Set(compareList.flatMap(p => Object.keys(p.specs || {})))
  );

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    alert(`${product.name} 1개가 장바구니에 담겼습니다.`);
  };

  return (
    <div className="product-compare-section card mb-8">
      {/* Title / Collapse Header */}
      <div 
        className="compare-header flex justify-between items-center p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-dark font-bold">
          <ArrowLeftRight size={20} className="text-primary" />
          <span>선택 상품 사양 비교 ({compareList.length}/3)</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="btn btn-secondary py-1 px-2 text-xs flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              clearCompare();
            }}
          >
            <Trash2 size={12} /> 전체 비우기
          </button>
          <span className="text-xs text-light font-semibold">
            {isOpen ? '[ 접기 ]' : '[ 펼치기 ]'}
          </span>
        </div>
      </div>

      {/* Compare Table */}
      {isOpen && (
        <div className="compare-body p-4 border-t overflow-x-auto">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="spec-label-col">사양 항목</th>
                {compareList.map(product => (
                  <th key={product.id} className="product-data-col">
                    <div className="compare-product-info relative">
                      <button 
                        className="compare-remove-btn"
                        onClick={() => removeFromCompare(product.id)}
                        title="비교에서 제외"
                      >
                        <X size={14} />
                      </button>
                      <img src={product.image ? product.image.split(',')[0] : ''} alt={product.name} className="compare-prod-img mb-2" />
                      <div className="compare-prod-title font-bold text-xs mb-1 text-dark">
                        {product.name}
                      </div>
                      <div className="compare-prod-price text-sm text-primary font-extrabold mb-2">
                        {product.price.toLocaleString()}원
                      </div>
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className="btn btn-primary py-1 px-3 text-xs flex items-center justify-center gap-1 w-full"
                      >
                        <ShoppingCart size={12} /> 장바구니
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Common Details */}
              <tr>
                <td className="spec-label">분류</td>
                {compareList.map(product => (
                  <td key={product.id} className="spec-val font-semibold">
                    {product.category === 'servomotor' ? 'AC 서보모터' : '디지털 서보드라이버'}
                  </td>
                ))}
              </tr>
              {/* Dynamic Specs */}
              {specKeys.map(key => (
                <tr key={key}>
                  <td className="spec-label">{key}</td>
                  {compareList.map(product => (
                    <td key={product.id} className="spec-val">
                      {product.specs[key] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
