export interface UserContact {
  name: string;
  email: string;
  phone?: string;
}

export interface User {
  _id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: string;
  contact?: UserContact;
  usage: {
    users: number;
    customers: number;
    products: number;
  };
  planLimits: {
    users: number;
    products: number;
    customers: number;
  };
  subscription?: {
    status: string;
    endDate: string;
  };
  createdAt?: string;
}
