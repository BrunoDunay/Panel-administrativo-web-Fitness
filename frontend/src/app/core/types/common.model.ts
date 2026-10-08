/** Imagen servida desde Cloudinary. */
export interface Media {
  id: string;
  url: string;
  publicId?: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Error normalizado por el errorInterceptor. */
export interface ApiError {
  status: number;
  message: string;
  code: string;
  fields?: Record<string, string>;
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value && 'code' in value;
}
