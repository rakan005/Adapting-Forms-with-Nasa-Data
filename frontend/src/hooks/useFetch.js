import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { errorMessage } from '../api/axiosClient'
export default function useFetch(loader,deps=[]){const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');const refresh=useCallback(async()=>{setLoading(true);setError('');try{const r=await loader();setData(r.data);return r.data}catch(e){const msg=errorMessage(e);setError(msg);toast.error(msg);return null}finally{setLoading(false)}},deps);useEffect(()=>{refresh()},[refresh]);return {data,setData,loading,error,refresh}}
