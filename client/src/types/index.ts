export interface User {
  id:         string;
  name:       string;
  email:      string;
  role:       'buyer' | 'seller' | 'admin';
  created_at: string;
}

export interface Product {
  id:          string;
  seller_id:   string;
  seller_name: string;
  seller_rating: number;
  name:        string;
  brand:       string;
  oem_code:    string | null;
  car_make:    string;
  car_model:   string;
  year:        number;
  part_type:   string;
  price:       number;
  stock:       number;
  image_url:   string | null;
  description: string | null;
  is_promoted: number;
  created_at:  string;
}

export interface CartItem {
  product:  Product;
  quantity: number;
}

export interface OrderItem {
  product_id: string;
  name:       string;
  brand:      string;
  image_url:  string | null;
  price:      number;
  quantity:   number;
}

export interface Order {
  id:             string;
  buyer_id:       string;
  buyer_name?:    string;
  buyer_email?:   string;
  total_amount:   number;
  status:         'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'card' | 'cash' | 'online';
  address:        string;
  created_at:     string;
  items?:         OrderItem[];
}

export interface Review {
  id:            string;
  seller_id:     string;
  reviewer_id:   string;
  reviewer_name: string;
  rating:        number;
  comment:       string | null;
  created_at:    string;
}

export interface Pagination {
  total:   number;
  page:    number;
  limit:   number;
  pages:   number;
}

export interface ApiResponse<T> {
  data:    T;
  error?:  string;
}