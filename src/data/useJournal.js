import { useEffect, useRef, useState } from 'react';
import { emptyJournal, validateJournal } from './journal';
import { readJournal, writeJournal } from './storage';

export function useJournal() {
  const [journal,setJournal]=useState(emptyJournal);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState('Opening local storage…');
  const savedRef=useRef(journal), queue=useRef(Promise.resolve()), revision=useRef(0);
  const storageRevision=useRef(0);
  const channel=useRef(null);
  useEffect(()=>{
    let active=true;
    readJournal().then(saved=>{if(active){const loaded=saved?validateJournal(saved):emptyJournal();storageRevision.current=loaded._revision || 0;savedRef.current=loaded;setJournal(loaded);setReady(true);setStatus('Saved on this browser');}}).catch(()=>{if(active)setStatus('Cannot read local storage. Nothing was overwritten. Reload or recover from a backup.');});
    // Prevent a stale tab silently overwriting newer data from another tab.
    if('BroadcastChannel' in window){channel.current=new BroadcastChannel('fitlog-journal');
    channel.current.onmessage=()=>{setReady(false);setStatus('Records changed in another tab. Export your draft if needed, then reload.');};}
    return ()=>{active=false;channel.current?.close();};
  },[]);
  useEffect(()=>{
    if(!ready || journal===savedRef.current)return;
    const rev=++revision.current;
    setStatus('Saving…');
    const timer=setTimeout(()=>{queue.current=queue.current.catch(()=>{}).then(()=>writeJournal(journal,storageRevision.current)).then(nextRevision=>{
      storageRevision.current=nextRevision;
      if(rev===revision.current){savedRef.current=journal;setStatus('Saved on this browser');channel.current?.postMessage('saved');}
    }).catch(error=>{if(error?.name==='ConflictError'){setReady(false);setStatus(error.message);}else setStatus('Save failed. Your changes are only in memory — export a backup now.');});},200);
    return ()=>clearTimeout(timer);
  },[journal,ready]);
  useEffect(()=>{
    if(!status.startsWith('Saving') && !status.startsWith('Save failed'))return;
    const warn=event=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn);
  },[status]);
  return {journal,setJournal,ready,status};
}
