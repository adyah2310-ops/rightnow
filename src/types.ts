export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string; // e.g., "Shirts", "T-Shirts", "Jeans", "Trousers", "Jackets", "Accessories"
  subCategory: string; // e.g., "Printed Shirts", "Linen Shirts", "Checked Shirts", "Plain Shirts", "Oversized T-Shirts", "Polo T-Shirts", "Cargo Pants", "Trousers"
  price: number; // Selling Price
  offerPrice: number; // Discounted Price
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
  stock: number; // Combined/Live stock
  warehouseStock?: number;
  storeStock?: number;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isTodayDeal?: boolean;
  isSummerCollection?: boolean;
  isFormalWear?: boolean;
  isCasualWear?: boolean;
  isFestivalCollection?: boolean;

  // New POS & GST Fields
  sku?: string;
  barcode?: string;
  mrp?: number;
  purchasePrice?: number;
  gstPercent?: number; // e.g. 5, 12, 18
  hsnCode?: string;
  minimumStock?: number;
  supplierId?: string;
  createdDate?: string;
  updatedDate?: string;
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
    // GST items
    gstPercent?: number;
    hsnCode?: string;
  }[];
  totalAmount: number;
  discountAmount: number;
  couponCode?: string;
  deliveryMethod?: string;
  deliveryCharge?: number;
  paymentScreenshot: string; // Base64 or URL
  status: 'Payment Verification Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  createdAt: string;
  type?: 'online' | 'offline';
  paymentMode?: string;
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

// ========================================================
// NEW RETAIL POS, GST BILLING & INVENTORY MANAGEMENT SYSTEM TYPES
// ========================================================

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  gstin?: string;
  phone: string;
  email: string;
  address: string;
  balance: number; // Store credit/debt
  createdDate: string;
}

export interface PurchaseRecord {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    purchasePrice: number;
    gstPercent: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }[];
  taxableTotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit';
  status: 'Received' | 'Returned' | 'Cancelled';
  createdAt: string;
}

export interface POSSale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    barcode?: string;
    quantity: number;
    sellingPrice: number;
    mrp: number;
    gstPercent: number;
    hsnCode: string;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }[];
  subTotal: number; // Taxable sum
  taxTotal: number; // Total GST
  discountAmount: number;
  couponCode?: string;
  shippingCharge?: number;
  packingCharge?: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Split';
  splitDetails?: {
    cashAmount: number;
    upiAmount: number;
    cardAmount: number;
  };
  cashierId: string;
  cashierName: string;
  createdAt: string;
  status: 'Completed' | 'Returned' | 'Cancelled' | 'Exchanged';
}

export interface POSCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  loyaltyPoints: number;
  walletBalance: number; // Store credit
  createdDate: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Cashier' | 'Manager' | 'Admin';
  pinCode: string; // 4-6 digit numeric pin for quick lock/auth
  status: 'Active' | 'Inactive';
  createdDate: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO String
  clockOut?: string; // ISO String
  status: 'Present' | 'Absent' | 'On Leave';
}

export interface ActivityLog {
  id: string;
  employeeId: string;
  employeeName: string;
  action: string; // e.g., "Billed Invoice #INV-2026-001", "Updated Stock for Product XYZ"
  details: string;
  timestamp: string;
}

export interface ExpenseRecord {
  id: string;
  category: 'Rent' | 'Electricity' | 'Salaries' | 'Marketing' | 'Supplies' | 'Other';
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface BusinessSettings {
  id: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  storeGstin: string;
  upiQrUrl?: string; // Base64 or Image URL for billing screen display
  invoiceFooterMessage?: string;
  termsAndConditions?: string;
}
