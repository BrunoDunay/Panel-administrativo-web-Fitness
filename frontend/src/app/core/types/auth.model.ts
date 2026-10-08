export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  admin: AdminUser;
}
