import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { AdminUser, LoginResponse } from '../types/auth.model';

const STORAGE_KEY = 'fbe.session';

interface Session {
  token: string;
  expiresAt: string;
  admin: AdminUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(API_URL);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly session = signal<Session | null>(this.restore());

  readonly admin = computed(() => this.session()?.admin ?? null);
  readonly token = computed(() => this.session()?.token ?? null);

  /** Se evalúa en cada lectura para respetar la expiración del token. */
  isAuthenticated(): boolean {
    const session = this.session();
    if (!session) return false;
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.clear();
      return false;
    }
    return true;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.persist({ token: res.token, expiresAt: res.expiresAt, admin: res.admin })));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<{ message: string }>(`${this.apiUrl}/auth/password`, { currentPassword, newPassword });
  }

  logout(redirect = true): void {
    this.clear();
    if (redirect) void this.router.navigate(['/login']);
  }

  private persist(session: Session): void {
    this.session.set(session);
    if (this.isBrowser) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private clear(): void {
    this.session.set(null);
    if (this.isBrowser) localStorage.removeItem(STORAGE_KEY);
  }

  private restore(): Session | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const session = raw ? (JSON.parse(raw) as Session) : null;
      return session && Date.parse(session.expiresAt) > Date.now() ? session : null;
    } catch {
      return null;
    }
  }
}
