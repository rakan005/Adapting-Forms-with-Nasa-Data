import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  CloudSun,
  Layers3,
  Leaf,
  LockKeyhole,
  MapPinned,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Wheat,
} from 'lucide-react'

export { Link, useLocation, ArrowLeft, BarChart3, Bell, Bot, CloudSun, Layers3, Leaf, LockKeyhole, MapPinned, RotateCcw, ShieldCheck, Sprout, Wheat }

export const cardClass = 'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900'

export const featureLinks = [
  { to: '/farms', title: 'إدارة المزارع', text: 'سجّل موقع الأرض ومساحتها وخصائصها.', icon: MapPinned },
  { to: '/advice', title: 'تحليل الأرض', text: 'افهم أثر الطقس والتربة على اختيار المحاصيل.', icon: BarChart3 },
  { to: '/seasons', title: 'الدورة الزراعية', text: 'خطّط للمواسم وسجّل المحاصيل بالتتابع.', icon: RotateCcw },
  { to: '/assistant', title: 'المساعد الزراعي', text: 'اسأل ورتّب ملاحظاتك الزراعية.', icon: Bot },
]

export function FeatureSnapshot({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
      <Icon className="mb-3 text-emerald-200" size={22} />
      <h2 className="font-extrabold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-emerald-50/75">{text}</p>
    </div>
  )
}

export const pageContent = [
  { match: path => path === '/farms' || path === '/farms/new' || /^\/farms\/[^/]+$/.test(path), title: 'إدارة المزارع', subtitle: 'لكل مزارع مساحة خاصة ببيانات أرضه.', icon: MapPinned, description: 'بعد تسجيل الدخول، أضف مزارعك وحدد الموقع والمساحة وخصائص التربة. تبقى تفاصيل الأراضي غير معروضة للزوار.', bullets: ['تحديد الموقع على الخريطة', 'تسجيل مساحة الأرض بالدونم', 'حفظ خصائص التربة والمحصول السابق'] },
  { match: path => path.includes('/advice') || path === '/advice', title: 'تحليل الأرض وتوصيات المحاصيل', subtitle: 'شاهد كيف تساعدك المنصة في اتخاذ القرار.', icon: BarChart3, description: 'يربط التحليل بين موقع مزرعتك والبيانات المناخية وخصائص التربة، ثم يوضح ملاءمة المحاصيل وأسباب التوصية والتحذيرات.', bullets: ['مؤشرات المناخ والتربة المتاحة', 'مستوى التغطية والثقة', 'أسباب التوصية واستبعاد المحاصيل'] },
  { match: path => path.includes('/decisions') || path === '/decisions', title: 'سجل القرارات', subtitle: 'قراراتك الزراعية محفوظة ضمن حسابك.', icon: Wheat, description: 'بعد الدخول، راجع التوصيات التي طلبتها لكل مزرعة، وتابع ما اعتمدته أو أجّلته.', bullets: ['التصفية حسب المزرعة', 'متابعة الإجراء على التوصية', 'فتح التقرير وطباعته'] },
  { match: path => path === '/seasons', title: 'الدورة الزراعية وسجل المواسم', subtitle: 'خطّط للمواسم ووثّق ما زرعته.', icon: RotateCcw, description: 'تساعدك هذه الصفحة على الاحتفاظ بسجل المواسم والمحاصيل لكل مزرعة. بيانات السجل خاصة بصاحب الحساب.', bullets: ['ربط الموسم بالمزرعة', 'تسجيل المحصول وتاريخ الزراعة', 'الرجوع إلى المواسم السابقة'] },
  { match: path => path === '/assistant', title: 'المساعد الزراعي', subtitle: 'مساعدك في الأسئلة وتنظيم ملاحظات المزرعة.', icon: Bot, description: 'يمكن للمساعد الإجابة عن أسئلتك الزراعية وتنظيم وصف الأرض إلى بيانات تراجعها قبل حفظها.', bullets: ['محادثة حول توصياتك', 'تنظيم وصف الأرض إلى مسودة', 'اختيار مزرعة كسياق للمحادثة'] },
  { match: path => path === '/alerts', title: 'التنبيهات الزراعية', subtitle: 'تابع التنبيهات المرتبطة بمزارعك.', icon: Bell, description: 'بعد الدخول، تظهر تنبيهات حسابك وتفضيلاتك. لا نعرض تنبيهات خاصة بمزارع مستخدمين آخرين.', bullets: ['عرض التنبيهات النشطة', 'تعديل تفضيلات التنبيه', 'ربط التنبيه بسياق المزرعة'] },
  { match: path => path === '/subscription', title: 'الاشتراك والخطط', subtitle: 'إدارة خطتك بعد تسجيل الدخول.', icon: ShieldCheck, description: 'يمكنك استكشاف هذا القسم كزائر. تفاصيل خطتك الحالية وتغييرها محفوظة لحسابك بعد تسجيل الدخول.', bullets: ['عرض الخطة الحالية', 'مقارنة حدود الاستخدام', 'إدارة اشتراك الحساب'] },
  { match: path => path.startsWith('/reports/'), title: 'تقرير التوصية', subtitle: 'التقرير مرتبط بقرار خاص بحسابك.', icon: LockKeyhole, description: 'سجّل الدخول لعرض التقرير أو طباعته. لن تظهر تفاصيل القرار من رابط عام.', bullets: ['ملخص التوصية', 'مؤشرات المناخ والتحذيرات', 'طباعة التقرير بصيغة PDF'] },
]
