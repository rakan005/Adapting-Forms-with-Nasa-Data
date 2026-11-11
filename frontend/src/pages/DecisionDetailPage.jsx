import { AdviceResult, EmptyState, FileDown, LoadingSpinner, Title, decisionsApi, useFetch, useNavigate, useParams, useSearchParams } from './pageShared'

function DecisionDetailPage(){const {id}=useParams(),[q]=useSearchParams(),{data,loading,refresh}=useFetch(()=>decisionsApi.get(id),[id]),item=data?.data,nav=useNavigate();if(loading)return <LoadingSpinner/>;return <><Title title={`تفاصيل القرار #${id}`} eyebrow="سجل التوصيات" action={<button className="btn-primary" onClick={()=>nav(`/reports/${id}?farmId=${item?.farmId||q.get('farmId')||''}`)}><FileDown size={17}/> التقرير</button>}/>{item?<><AdviceResult result={item} farmId={item.farmId||q.get('farmId')} onDecision={()=>refresh()}/></>:<EmptyState title="تعذر العثور على القرار"/>}</>}

export default DecisionDetailPage
