import { Pipe, PipeTransform } from '@angular/core';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Convierte **palabras** en negritas para los textos que el coach edita desde el panel.
 * Primero escapa todo el HTML, así el texto nunca puede inyectar etiquetas; se usa con [innerHTML].
 */
@Pipe({ name: 'emphasis' })
export class EmphasisPipe implements PipeTransform {
  transform(text: string | null | undefined): string {
    if (!text) return '';
    return text.replace(/[&<>"']/g, (char) => ESCAPES[char]!).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
}
