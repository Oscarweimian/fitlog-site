const DATABASE = 'fitlog-personal-v1';
let database;
function open() {
  if (!database) database = new Promise((resolve,reject) => {
    const request = indexedDB.open(DATABASE,1);
    request.onupgradeneeded = () => request.result.createObjectStore('journal');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other FitLog tabs to open storage.'));
  });
  return database;
}
export async function readJournal() {
  const db=await open();
  return new Promise((resolve,reject)=>{
    const r=db.transaction('journal').objectStore('journal').get('current');
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
}
export async function writeJournal(data, expectedRevision = 0) {
  const db=await open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('journal','readwrite');
    const store=tx.objectStore('journal');
    const current=store.get('current');
    let conflict=null,nextRevision;
    current.onsuccess=()=>{
      const revision=current.result?._revision || 0;
      if(revision!==expectedRevision){conflict=new Error('Records changed in another tab. Export your draft, then reload.');conflict.name='ConflictError';tx.abort();return;}
      nextRevision=revision+1;
      try{store.put({...data,_revision:nextRevision},'current');}catch(error){conflict=error;tx.abort();}
    };
    tx.oncomplete=()=>resolve(nextRevision); tx.onerror=()=>reject(conflict||tx.error); tx.onabort=()=>reject(conflict||tx.error);
  });
}
export function downloadBackup(data) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=`fitlog-backup-${new Date().toISOString().replaceAll(':','-')}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function validateBackupPhotos(photos) {
  for(const photo of photos) {
    const blob=await (await fetch(photo.image)).blob();
    const bitmap=await createImageBitmap(blob).catch(()=>{throw new Error('A backup photo is not a readable image.');});
    try{if(bitmap.width*bitmap.height>40000000)throw new Error('A backup photo is too large.');}finally{bitmap.close();}
  }
}
export async function preparePhoto(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) throw new Error('Use a JPEG, PNG or WebP smaller than 10 MB.');
  const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('This file is not a readable image.');});
  try {
    if(bitmap.width*bitmap.height>40000000) throw new Error('Image is too large (maximum 40 megapixels).');
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const image=canvas.toDataURL('image/webp',.8);
    if(image.length>1800000) throw new Error('Image is too detailed; choose a smaller photo.');
    return {id:crypto.randomUUID(),image,title:file.name.replace(/\.[^.]+$/,'').slice(0,100)};
  } finally { bitmap.close(); }
}
