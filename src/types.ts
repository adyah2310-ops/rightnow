export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string; // e.g., "Shirts", "T-Shirts", "Jeans", "Trousers", "Jackets", "Accessories"
  subCategory: string; // e.g., "Printed Shirts", "Linen Shirts", "Checked Shirts", "Plain Shirts", "Oversized T-Shirts", "Polo T-Shirts", "Cargo Pants", "Trousers"
  price: number;
  offerPrice: number;
  images: string[];
  sizes: string[];
  colors: string[];
  ratings: number;
  reviewCount: number;
  description: string;
  specifications: {
    material: string;
    fit: string;
    sleeve?: string;
    neckline?: string;
    fabric: string;
    occasion: string;
  };
  stock: number;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isTodayDeal?: boolean;
  isSummerCollection?: boolean;
  isFormalWear?: boolean;
  isCasualWear?: boolean;
  isFestivalCollection?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    fullName: string;
    mobileNumber: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    notes?: string;
  };
  items: {
    productId: string;
    productName: string;
    brand: string;
    quantity: number;
    price: number;
    selectedSize: string;
    selectedColor: string;
    image: string;
  }[];
  totalAmount: number;
  discountAmount: number;
  couponCode?: string;
  paymentScreenshot: string; // Base64 or URL
  status: 'Payment Verification Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minPurchase: number;
  isActive: boolean;
  description: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}
