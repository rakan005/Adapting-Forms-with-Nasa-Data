import { useForm } from 'react-hook-form'

export default function SeasonForm({ onSubmit, crops = [] }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { cropCode: '', seasonLabel: '', plantingDate: '', harvestDate: '', status: 'PLANNED', yieldKg: '', notes: '' } })
  const submit = async values => {
    const saved = await onSubmit({ ...values, plantingDate: values.plantingDate || null, harvestDate: values.harvestDate || null, yieldKg: values.yieldKg ? Number(values.yieldKg) : null })
    if (saved) reset()
  }
  return <form onSubmit={handleSubmit(submit)} className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm">المحصول{crops.length ? <select className="field mt-1" {...register('cropCode', { required: 'اختر المحصول' })}><option value="">اختر محصولًا</option>{crops.map(c => <option key={c.code} value={c.code}>{c.nameAr || c.nameEn || c.code} ({c.code})</option>)}</select> : <input className="field mt-1" placeholder="WHEAT" {...register('cropCode', { required: 'أدخل رمز المحصول' })}/ >}{errors.cropCode && <span className="text-xs text-red-600">{errors.cropCode.message}</span>}</label>
    <label className="text-sm">اسم الموسم<input className="field mt-1" placeholder="شتاء 2026" {...register('seasonLabel', { required: 'أدخل اسم الموسم' })}/>{errors.seasonLabel && <span className="text-xs text-red-600">{errors.seasonLabel.message}</span>}</label>
    <label className="text-sm">تاريخ الزراعة<input type="date" className="field mt-1" {...register('plantingDate')}/></label>
    <label className="text-sm">تاريخ الحصاد المتوقع<input type="date" className="field mt-1" {...register('harvestDate')}/></label>
    <label className="text-sm">الحالة<select className="field mt-1" {...register('status')}><option value="PLANNED">مخطط</option><option value="PLANTED">مزروع</option><option value="HARVESTED">تم الحصاد</option><option value="FAILED">لم ينجح</option></select></label>
    <label className="text-sm">الإنتاج (كغم)<input type="number" min="0" className="field mt-1" {...register('yieldKg')}/></label>
    <label className="text-sm sm:col-span-2">ملاحظات<textarea className="field mt-1" rows="2" {...register('notes')}/></label>
    <button disabled={isSubmitting} className="btn-primary sm:col-span-2">{isSubmitting ? 'جارٍ الحفظ…' : 'إضافة سجل الموسم'}</button>
  </form>
}
