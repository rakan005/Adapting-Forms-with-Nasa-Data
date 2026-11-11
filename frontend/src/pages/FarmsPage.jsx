import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, ArrowLeft, Plus, Search, Trash2 } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import FarmForm from '../components/forms/FarmForm'
import LoadingSpinner from '../components/LoadingSpinner'
import { farmsApi } from '../api/farms'
import { errorMessage } from '../api/axiosClient'
import useFetch from '../hooks/useFetch'
import { ErrorBox, FarmTile, Modal, Title } from './pageShared'

const PAGE_SIZE = 8

export default function FarmsPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [show, setShow] = useState(false)
  const [edit, setEdit] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const nav = useNavigate()
  const location = useLocation()
  const { data, loading, error, refresh } = useFetch(() => farmsApi.list({ page, size: PAGE_SIZE }), [page])
  const currentFarms = Array.isArray(data?.content) ? data.content : []
  const filteredFarms = currentFarms.filter(farm => farm.name?.toLocaleLowerCase('ar').includes(search.trim().toLocaleLowerCase('ar')))
  const totalPages = Number.isFinite(data?.totalPages) ? data.totalPages : 1
  const currentPage = data?.number ?? page
  const hasPrevious = data?.first === false || currentPage > 0
  const hasNext = data?.last === false || currentPage + 1 < totalPages

  useEffect(() => {
    if (location.pathname.endsWith('/new')) setShow(true)
  }, [location.pathname])

  const submit = async body => {
    try {
      if (edit) await farmsApi.update(edit.id, body)
      else await farmsApi.create(body)
      toast.success(edit ? 'تم تحديث المزرعة' : 'تمت إضافة المزرعة')
      setShow(false)
      setEdit(null)
      nav('/farms')
      if (page === 0) refresh()
      else setPage(0)
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    }
  }

  const remove = async () => {
    try {
      await farmsApi.remove(deleting.id)
      toast.success('تم حذف المزرعة')
      const lastVisibleItem = currentFarms.length === 1 && currentPage > 0
      setDeleting(null)
      if (lastVisibleItem) setPage(currentPage - 1)
      else refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return <>
    <Title
      title="مزارعي"
      eyebrow="إدارة الأراضي"
      description="أضف موقع الأرض ومساحتها وخصائصها لإعداد توصيات أدق."
      action={<button onClick={() => { setEdit(null); setShow(true) }} className="btn-primary"><Plus size={17} /> إضافة مزرعة</button>}
    />
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">ابحث في مزارع الصفحة الحالية</span>
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input className="field pr-10" placeholder="ابحث في مزارع الصفحة الحالية" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        {data && <p className="text-sm text-slate-500 dark:text-slate-400">الصفحة {totalPages ? currentPage + 1 : 0} من {totalPages} · {data.totalElements ?? currentFarms.length} مزرعة</p>}
      </div>

      {loading ? <LoadingSpinner label="جارٍ تحميل مزارعك..." /> : error ? <ErrorBox error={error} retry={refresh} /> : filteredFarms.length ? <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredFarms.map(farm => <div key={farm.id} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <FarmTile farm={farm} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary min-w-28 flex-1" onClick={() => nav(`/farms/${farm.id}`)}>عرض التفاصيل</button>
              <button className="btn-secondary" onClick={() => { setEdit(farm); setShow(true) }}>تعديل</button>
              <button className="btn-danger" onClick={() => setDeleting(farm)} title="حذف" aria-label={`حذف ${farm.name}`}><Trash2 size={17} /></button>
            </div>
          </div>)}
        </div>
        {totalPages > 1 && <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <button className="btn-secondary" disabled={!hasPrevious || loading} onClick={() => setPage(currentPage - 1)}><ArrowRight size={16} /> السابقة</button>
          <span className="text-sm text-slate-500">{currentPage + 1} / {totalPages}</span>
          <button className="btn-secondary" disabled={!hasNext || loading} onClick={() => setPage(currentPage + 1)}>التالية <ArrowLeft size={16} /></button>
        </div>}
      </> : <EmptyState title={search ? 'لا توجد نتائج في هذه الصفحة' : 'لم تضف أي مزرعة بعد'} description={search ? 'جرّب اسمًا آخر أو انتقل بين الصفحات.' : 'ابدأ بإضافة أرضك وموقعها ومساحتها.'} />}
    </section>

    {show && <Modal title={edit ? 'تعديل بيانات المزرعة' : 'إضافة مزرعة'} onClose={() => { setShow(false); setEdit(null); if (location.pathname.endsWith('/new')) nav('/farms') }}>
      <FarmForm key={edit?.id || 'new-farm'} initial={edit || undefined} onSubmit={submit} submitLabel={edit ? 'حفظ التعديلات' : 'إضافة المزرعة'} />
    </Modal>}
    <ConfirmDialog open={Boolean(deleting)} onCancel={() => setDeleting(null)} onConfirm={remove}>سيتم حذف «{deleting?.name}» وسجلاتها المرتبطة بحسب إعدادات الخادم.</ConfirmDialog>
  </>
}
