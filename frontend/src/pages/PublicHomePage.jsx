import { ArrowLeft, CloudSun, FeatureSnapshot, Layers3, Link, ShieldCheck, Sprout, Wheat, cardClass, featureLinks } from './publicShared'

function PublicHomePage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#10261e] via-[#174d32] to-[#27834a] px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -left-12 -top-16 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-emerald-100">
              <Sprout size={16} /> منصة القرار الزراعي الذكي
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
              خطّط لمزرعتك بوضوح، موسمًا بعد موسم
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-emerald-50/85 sm:text-lg">
              استكشف أدوات تحليل الأرض وتوصية المحاصيل والدورة الزراعية. تصفّح الموقع كزائر، وسجّل الدخول عندما تريد فتح بيانات مزارعك الخاصة.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-forest-800 transition hover:bg-emerald-50" to="/register">
                أنشئ حساب مزارع <ArrowLeft size={17} />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10" to="/advice">
                استكشف المنصة
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureSnapshot icon={CloudSun} title="مؤشرات المناخ" text="الحرارة والأمطار وبيانات الموقع المتاحة" />
            <FeatureSnapshot icon={Layers3} title="خصائص التربة" text="الملوحة والتغطية بحسب البيانات المتوفرة" />
            <FeatureSnapshot icon={Wheat} title="ملاءمة المحاصيل" text="أسباب الاختيار والتحذيرات ومستوى الثقة" />
            <FeatureSnapshot icon={ShieldCheck} title="بياناتك خاصة" text="مزارعك وسجلاتك لا تظهر إلا بعد الدخول" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-forest-600">تصفّح كزائر</p>
            <h2 className="mt-1 text-2xl font-extrabold">استكشف أقسام المنصة</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">لن نعرض بيانات شخصية قبل تسجيل الدخول.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureLinks.map(({ to, title, text, icon: Icon }) => (
            <Link key={to} to={to} className={`${cardClass} group transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg`}>
              <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-forest-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Icon size={21} /></span>
              <h3 className="font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-forest-700 dark:text-emerald-300">استكشف <ArrowLeft size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${cardClass} grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-forest-600">كيف تبدأ؟</p>
          <h2 className="mt-1 text-xl font-extrabold">أنشئ حسابك لتظهر لك بياناتك الشخصية</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            بعد تسجيل الدخول، أضف مزرعتك وموقعها ومساحتها. بعدها ستجد تحليلات أرضك وتوصياتها وسجل قراراتك ومواسمك في لوحة خاصة بك.
          </p>
          <p className="mt-3 text-xs text-slate-400">بيانات المناخ والمحاصيل في النسخة الحالية قد تكون تجريبية إلى حين ربط مجموعة NASA المعتمدة.</p>
        </div>
        <Link className="btn-primary whitespace-nowrap" to="/register">ابدأ الآن</Link>
      </section>
    </div>
  )
}

export default PublicHomePage
