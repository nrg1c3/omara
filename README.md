# عمارتنا — تطبيق PWA

عميل للـ API الموجود على n8n (`API.md`). مفيش باك إند هنا.

## التشغيل
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build في dist/
npm test           # Playwright: unit + 375×667 + 390×844 (الـ API متعمله mock)
npm run test:smoke # اختبار واحد على الـ API الحقيقي بـ TEST14 (بيعمل logout في الآخر)
npm run icons      # يولّد أيقونات PNG من public/icons/icon.svg
```

## الهيكل
| المسار | فيه إيه |
|---|---|
| `src/api.ts` | عميل API واحد: أنواع كل الـ actions من API.md، وبيضيف `token` و`role` لوحده، و`SESSION` بيرجّع للدخول |
| `src/store.ts` | الجلسة وآخر شاشة اتحمّلت، والدخول والخروج |
| `src/session.ts` | حفظ الجلسة والكاش في localStorage |
| `src/router.ts` | توجيه بالـ hash: `#login`، `#c=CODE`، `#guard`، `#nrg`، `#register`، `#r/<tab>`، `#a/<tab>` |
| `src/components/` | كارت، زرار، حقل، شريط تحت، رسايل، تحميل، أيقونات SVG |
| `src/lib/` | الأرقام العربي، التنسيق، ضغط صور الإيصالات، المسودات |
| `src/styles/` | الـ tokens والـ CSS الأساسي |

## ملاحظات
- كل الطلبات `POST` بـ `text/plain;charset=utf-8`.
- ممنوع أي سر في الريبو (مفتاح NRG، أرقام سرية، مفاتيح API).
- قبل النشر على دومين جديد، الـ origin لازم يتضاف لـ `ALLOWED` في n8n (CLAUDE.md §4).
