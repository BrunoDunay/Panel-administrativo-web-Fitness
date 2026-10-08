import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { Catalog, CatalogResource } from '../../types/catalog.model';
import { Client, ClientListItem, ClientStatus, Dashboard, Payment, PaymentDraft } from '../../types/client.model';
import { SettingsSection, SiteSettings } from '../../types/settings.model';

/** Endpoints exclusivos del coach: clientes, catálogos, dashboard y contenido de la landing. */
@Injectable({ providedIn: 'root' })
export class PanelApi {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private catalog$: Observable<Catalog> | null = null;

  dashboard() {
    return this.http.get<Dashboard>(`${this.api}/dashboard`);
  }

  clients(filters: { search?: string; status?: ClientStatus | 'all' }) {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<ClientListItem[]>(`${this.api}/clients`, { params });
  }

  createClient(body: unknown) {
    return this.http.post<Client>(`${this.api}/clients`, body);
  }

  /** Registrar un pago desde el resumen, sin abrir el expediente. */
  registerPayment(clientId: string, body: PaymentDraft) {
    return this.http.post<Payment>(`${this.api}/clients/${clientId}/payments`, body);
  }

  /** Los catálogos cambian poco: se piden una vez y se reutilizan hasta que se edite alguno. */
  catalog(): Observable<Catalog> {
    this.catalog$ ??= this.http.get<Catalog>(`${this.api}/catalog`).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.catalog$;
  }

  private readonly invalidate = () => (this.catalog$ = null);

  createCatalogItem<T>(resource: CatalogResource, body: unknown) {
    return this.http.post<T>(`${this.api}/catalog/${resource}`, body).pipe(tap(this.invalidate));
  }

  updateCatalogItem<T>(resource: CatalogResource, id: number, body: unknown) {
    return this.http.put<T>(`${this.api}/catalog/${resource}/${id}`, body).pipe(tap(this.invalidate));
  }

  deleteCatalogItem(resource: CatalogResource, id: number) {
    return this.http.delete<void>(`${this.api}/catalog/${resource}/${id}`).pipe(tap(this.invalidate));
  }

  settings() {
    return this.http.get<SiteSettings>(`${this.api}/settings`);
  }

  saveSettings<K extends SettingsSection>(section: K, value: SiteSettings[K]) {
    return this.http.put<SiteSettings[K]>(`${this.api}/settings/${section}`, value);
  }
}
