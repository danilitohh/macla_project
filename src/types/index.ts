export type Category = "planchas" | "secadoras" | "onduladoras" | "bolsos";

export interface Product {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  category: Category;
  price: number;
  currency: "COP";
  stock: number;
  images: string[];
  features: string[];
  highlights: string[];
  tags?: string[];
  specs?: Record<string, string | number>;
  content?: ProductContent;
  isActive?: boolean;
}

export interface ProductContent {
  benefits?: Array<{
    title: string;
    description: string;
    image?: string;
    emoji?: string;
  }>;
  howTo?: Array<{ title: string; image?: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  details?: Array<{ icon?: string; title: string; description: string }>;
  accordion?: Array<{ title: string; items: string[] }>;
  reference?: {
    headline?: string;
    tagline?: string;
    bullets?: Array<{ title: string; description: string }>;
    beforeImage?: string;
    afterImage?: string;
    bannerLeft?: string | null;
    bannerRight?: string | null;
  };
}

export type DiscountType = "percent" | "flat" | "shipping";

export interface DiscountCode {
  code: string;
  type: DiscountType;
  value_cents: number;
  percent_value: number;
  min_subtotal_cents: number;
  max_discount_cents: number;
  label?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: "customer" | "admin";
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  emailVerified?: boolean;
}

export interface ShippingOption {
  id: string;
  label: string;
  description: string;
  price: number;
  regions: string[];
}

export interface PaymentMethod {
  id: string;
  label: string;
  description: string;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
}

export interface OrderPayload {
  customer: OrderCustomer;
  shippingOptionId: string | null;
  paymentMethodId: string | null;
  addressId?: number | null;
  discountCode?: string | null;
  items?: CartItem[];
}

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export interface OrderProductSnapshot extends Record<string, unknown> {
  id: string;
  name: string;
  price: number;
  currency: "COP";
  images?: string[];
  image?: string | null;
  imageUrl?: string | null;
}

export interface OrderItemSummary {
  product: OrderProductSnapshot;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderSummary {
  id: number;
  code: string;
  status: OrderStatus;
  submittedAt: string | null;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: "COP";
  customerName: string;
  customerCity: string;
  notes: string | null;
  discountCode?: string | null;
  paymentMethod: {
    id: string;
    label: string;
    description?: string | null;
  } | null;
  shippingOption: {
    id: string;
    label: string;
    description?: string | null;
    price: number | null;
  } | null;
  items: OrderItemSummary[];
}

export interface Address {
  id: number;
  label: string;
  contactName: string;
  contactPhone: string;
  city: string;
  address: string;
  notes?: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  badge?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Review {
  id: number;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}
