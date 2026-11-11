import { Card, EmptyState, ErrorBox, LoadingSpinner, SeasonForm, SeasonRow, Title, errorMessage, farmsApi, referenceApi, seasonsApi, toast, useFetch, useSearchParams, useState, valueOf } from './pageShared'

export default function SeasonsPage() {
  const farms = useFetch(() => farmsApi.list({ page: 0, size: 100 }), [])
  const crops = useFetch(() => referenceApi.crops(), [])
  const [params] = useSearchParams()
  const [farmId, setFarmId] = useState(params.get('farmId') || '')
  const seasons = useFetch(() => farmId ? seasonsApi.list(farmId) : Promise.resolve({ data: [] }), [farmId])
  const add = async data => {
    try {
      await seasonsApi.create(farmId, data)
      toast.success('تم حفظ الموسم')
      await seasons.refresh()
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    }
  }
  const rows = valueOf(seasons)

  return <>
    <Title title="الدورة الزراعية وسجل المواسم" eyebrow="تخطيط وإدارة المحاصيل" description="وثّق المحاصيل المزروعة والمخططة. تقسيم الأرض إلى أجزاء غير متاح في واجهة الباك اند الحالية." />
    <Card>
      <label className="mb-5 block max-w-md text-sm font-bold">المزرعة
        <select className="field mt-1" value={farmId} onChange={event => setFarmId(event.target.value)}>
          <option value="">اختر المزرعة</option>
          {valueOf(farms).map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
        </select>
      </label>
      {farms.loading && <LoadingSpinner label="جارٍ تحميل المزارع…" />}
      {farms.error && <ErrorBox error={farms.error} retry={farms.refresh} />}
      {farmId ? <>
        <h2 className="mb-3 font-extrabold">إضافة موسم</h2>
        {crops.error && <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">تعذر تحميل قائمة المحاصيل؛ يمكنك إدخال رمز المحصول يدويًا.</p>}
        <SeasonForm crops={valueOf(crops)} onSubmit={add} />
        <hr className="my-6 border-slate-100 dark:border-slate-800" />
        <h2 className="mb-3 font-extrabold">المواسم المسجلة</h2>
        {seasons.loading ? <LoadingSpinner /> : seasons.error ? <ErrorBox error={seasons.error} retry={seasons.refresh} /> : rows.length ? <div className="space-y-3">{rows.map(season => <SeasonRow key={season.id} season={season} farmId={farmId} onDeleted={seasons.refresh} />)}</div> : <EmptyState title="لا توجد مواسم مسجلة" description="أدخل أول محصول وموسم لبدء توثيق الدورة." />}
      </> : <EmptyState title="اختر مزرعة" description="سجل المواسم مرتبط بمزرعة محددة." />}
    </Card>
  </>
}
