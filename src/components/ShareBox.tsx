import { copyText, shareText, waLink } from '../lib/share';
import { Button } from './Button';
import { Icon } from './Icon';
import { toast } from './Toast';

/** نص جاهز للمشاركة: واتساب + نسخ + مشاركة */
export function ShareBox({ text, phone, title, show = true }: { text: string; phone?: string; title?: string; show?: boolean }) {
  return (
    <div class="stack">
      {title && <span class="field__label">{title}</span>}
      {show && <div class="pre">{text}</div>}
      <div class="list-row__actions">
        <a class="btn btn--primary" href={waLink(text, phone)} target="_blank" rel="noopener">
          <Icon name="send" size={20} />
          <span>ابعت واتساب</span>
        </a>
        <Button
          variant="secondary"
          icon="copy"
          onClick={async () => toast((await copyText(text)) ? 'اتنسخ' : 'ما اتنسخش، انسخه بإيدك')}
        >
          انسخ
        </Button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button variant="secondary" icon="share" onClick={() => shareText(text, title)}>
            شارك
          </Button>
        )}
      </div>
    </div>
  );
}
