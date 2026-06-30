import React from 'react';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: string;
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, size: string, color: string, qty?: number) => void;
  onBuyNow: (product: Product, size: string, color: string, qty?: number) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
}

export default function ProductCard({
  product,
  onQuickView,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  isWishlisted,
}: ProductCardProps) {
  // Calculate discount percentage
  const discount = Math.round(((product.price - product.offerPrice) / product.price) * 100);

  const defaultSize = product.sizes[0] || 'M';
  const defaultColor = product.colors[0] || 'Default';

  return (
    <div 
      id={`product-card-${product.id}`}
      onClick={() => onQuickView(product)}
      className="group relative bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-850 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col h-full cursor-pointer"
    >
      {/* Product Image & Badges */}
      <div className="relative aspect-[3/4] bg-neutral-50 dark:bg-neutral-950 overflow-hidden shrink-0">
        <img
          id={`product-image-${product.id}`}
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Wishlist Button */}
        <button
          id={`wishlist-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs hover:bg-white text-neutral-900 p-2 rounded-full shadow-md transition-all z-10 hover:scale-110 active:scale-95"
          title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
        </button>

        {/* Discount Tag */}
        {discount > 0 && (
          <div 
            id={`discount-tag-${product.id}`}
            className="absolute top-3 left-3 bg-orange-500 text-white font-black text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-sm shadow-sm z-10"
          >
            {discount}% OFF
          </div>
        )}

        {/* Stock Alerts */}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute bottom-3 left-3 bg-red-600/90 backdrop-blur-xs text-white text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-sm z-10">
            Only {product.stock} Left!
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-10">
            <span className="bg-red-600 text-white font-black text-xs tracking-widest uppercase px-4 py-2 rounded-sm shadow-md">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick View Hover overlay */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-5">
          <button
            id={`quickview-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="bg-white hover:bg-neutral-900 hover:text-white text-neutral-950 px-4 py-2.5 rounded-full shadow-lg text-xs font-extrabold transition-all flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 duration-300"
          >
            <Eye className="w-3.5 h-3.5" />
            Quick View
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Brand & Ratings */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
            {product.brand}
          </span>
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-sm">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[9px] font-extrabold text-neutral-700 dark:text-neutral-300">{product.ratings}</span>
          </div>
        </div>

        {/* Title */}
        <h3 
          id={`product-title-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-orange-500 transition-colors line-clamp-1 cursor-pointer mb-2"
        >
          {product.name}
        </h3>

        {/* Prices */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-sm font-black text-neutral-950 dark:text-white">
            ₹{product.offerPrice.toLocaleString('en-IN')}
          </span>
          {product.price > product.offerPrice && (
            <span className="text-xs text-neutral-400 line-through">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Available Sizes & Colors (Short summary labels) */}
        <div className="mt-auto space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          {/* Sizes */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0 mr-1">Sizes:</span>
            {product.sizes.map((size) => (
              <span 
                key={size}
                className="text-[9px] font-extrabold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded-xs"
              >
                {size}
              </span>
            ))}
          </div>

          {/* Call to Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              id={`add-to-cart-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product, defaultSize, defaultColor);
              }}
              disabled={product.stock === 0}
              className="border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-400 text-neutral-900 dark:text-neutral-200 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:pointer-events-none hover:bg-neutral-50 dark:hover:bg-neutral-900 active:scale-95"
            >
              <ShoppingBag className="w-3 h-3" />
              Add
            </button>
            <button
              id={`buy-now-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onBuyNow(product, defaultSize, defaultColor);
              }}
              disabled={product.stock === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider py-2 rounded-lg text-center transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-xs hover:shadow-md"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
