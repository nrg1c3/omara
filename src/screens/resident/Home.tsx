import { useEffect } from 'preact/hooks';
import { Card, Progress } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { CardSkeleton } from '../../components/Loading';
import { formatMoney, formatNumber, formatDate } from '../../lib/format';
import { buildingName } from '../../lib/view';
import { refreshX, refreshY, useAppState } from '../../store';
import { isPendingClaim } from '../../lib/claims';

export function Home() {
  const { resident: v, x, y } = useAppState();
  useEffect(() => {
    refreshX().catch(() => {});
    refreshY().catch(() => {});
  }, []);

  if (!v) {
    return (
      <>
        <CardSkeleton lines={2} />
        <CardSkeleton lines={3} />
      </>
    );
  }
  const due = Number(v.account?.balance_due ?? 0);
  const credit = Number(v.account?.credit ?? 0);
  const unpaid = v.account?.unpaid ?? [];
  const fund = v.fund;
  const openPolls = (x?.polls ?? []).filter((p) => !p.closed && !p.my_choice).length;
  const plan = (y?.plans ?? []).find((p) => p.left > 0);
  const pendingClaims = (v.claims ?? []).filter(isPendingClaim).length;
  const lastNotice = v.notices?.[0];

  return (
    <>
      <header class="stack" style={{ gap: '2px' }}>
        <h1 class="screen__title">{buildingName(v.building)}</h1>
        <p class="screen__subtitle">
          شقة {v.unit?.unit}
          {v.unit?.owner_name ? ` · ${v.unit.owner_name}` : ''}
        </p>
      </header>

      <Card hero>
        <div class="screen__header" style={{ alignItems: 'flex-start' }}>
          <div class="stack" style={{ gap: '4px' }}>
            <span style={{ fontSize: '16px', opacity: 0.95 }}>{due > 0 ? (unpaid.length > 1 ? `عليك ${unpaid.length} شهور` : `عليك اشتراك ${unpaid[0]?.label ?? ''}`) : 'مفيش عليك حاجة'}</span>
            <span class="num" style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.1 }} data-testid="balance-due">
              {formatMoney(due)}
            </span>
          </div>
          {due > 0 && unpaid[0]?.due_date && (
            <span class="badge badge--warn">
              آخر ميعاد {formatDate(unpaid[0].due_date, false)}
            </span>
          )}
        </div>
        {credit > 0 && <span>ليك رصيد {formatMoney(credit)} هيتخصم من الشهور الجاية.</span>}
        {pendingClaims > 0 && <span>عندك {formatNumber(pendingClaims)} تحويل مستني موافقة أمين الصندوق.</span>}
        {due > 0 && (
          <a class="btn btn--on-primary btn--block" href="#r/pay">
            ادفع
          </a>
        )}
      </Card>

      {plan && (
        <a class="alert alert--warn" href="#r/more/plans" style={{ textDecoration: 'none' }}>
          <Icon name="calendar" size={20} />
          <span>
            عندك خطة تقسيط: القسط {formatMoney(plan.per_month)} في الشهر، والباقي {formatMoney(plan.left)}.
            {plan.late_installments > 0 ? ` متأخر ${formatNumber(plan.late_installments)} قسط.` : ''}
          </span>
        </a>
      )}

      {fund && (
        <Card>
          <div class="section-title">
            <span class="muted" style={{ fontWeight: 400 }}>
              رصيد صندوق العمارة
            </span>
            <a href="#r/ledger" class="btn btn--ghost" style={{ paddingInline: '8px' }}>
              شوف المصاريف
            </a>
          </div>
          <span class="num big-num">{formatMoney(fund.balance)}</span>
          <Progress value={fund.paid_units} max={fund.total_units} label="نسبة الشقق اللي دفعت" />
          <span class="muted">
            دفعوا {fund.month_label ? `شهر ${fund.month_label}` : 'الشهر ده'}: {formatNumber(fund.paid_units)} شقة من {formatNumber(fund.total_units)}
          </span>
        </Card>
      )}

      <div class="grid-2">
        <a class="tile" href="#r/requests/new-ticket">
          <Icon name="wrench" size={24} />
          <span>بلّغ عن عطل</span>
        </a>
        <a class="tile" href="#r/requests/new-visitor">
          <Icon name="qr" size={24} />
          <span>تصريح زائر</span>
        </a>
        <a class="tile" href="#r/more/polls">
          <Icon name="vote" size={24} />
          <span>
            صوّت
            {openPolls > 0 && <span style={{ color: 'var(--warn-ink)', fontSize: '15px' }}> · {formatNumber(openPolls)} مفتوح</span>}
          </span>
        </a>
        <a class="tile" href="#r/requests/new-service">
          <Icon name="tools" size={24} />
          <span>اطلب صنايعي</span>
        </a>
      </div>

      {lastNotice && (
        <a class="list" href="#r/more/notices" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div class="list-row">
            <span class="muted" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Icon name="megaphone" size={18} /> آخر إعلان
            </span>
            <span class="list-row__title">{lastNotice.title}</span>
          </div>
        </a>
      )}

      <a class="tile" href="#r/more/chat" style={{ flexDirection: 'row', alignItems: 'center', minHeight: '56px' }}>
        <Icon name="chat" size={24} />
        <span>عندك سؤال؟ اسأل المساعد</span>
      </a>
    </>
  );
}
