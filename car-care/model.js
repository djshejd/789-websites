(function(root){
 const categories=['定期保養','維修','耗材更換','檢驗／其他'];
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function date(value,optional=false){if(optional&&!value)return '';if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('日期格式不正確');const d=new Date(value+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('日期不存在');return value;}
 function num(value,optional=false){if(optional&&(value===''||value==null))return null;const n=Number(value);if(!Number.isFinite(n)||n<0||n>1000000000)throw Error('金額或里程超出範圍');return n;}
 function text(value,max=2000){return typeof value==='string'?value.slice(0,max):'';}
 function normalize(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.vehicles)||!Array.isArray(raw.records)||!Array.isArray(raw.reminders)||raw.vehicles.length>100||raw.records.length>10000||raw.reminders.length>10000)throw Error('這不是有效的里程誌備份檔');
  const id=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(v))throw Error('紀錄識別碼無效');return v;};
  const vehicles=raw.vehicles.map(v=>({id:id(v.id),name:text(v.name,100).trim(),plate:text(v.plate,30),year:text(v.year,4),mileage:Math.round(num(v.mileage))}));
  if(vehicles.some(v=>!v.name))throw Error('車輛名稱不能空白');
  const vehicleIds=new Set(vehicles.map(v=>v.id));if(vehicleIds.size!==vehicles.length)throw Error('車輛識別碼重複');
  const records=raw.records.map(r=>({id:id(r.id),vehicleId:id(r.vehicleId),date:date(r.date),mileage:Math.round(num(r.mileage)),category:categories.includes(r.category)?r.category:'檢驗／其他',items:text(r.items,300).trim(),cost:Math.round(num(r.cost)*100)/100,shop:text(r.shop,100),notes:text(r.notes),createdAt:text(r.createdAt,40)}));
  const reminders=raw.reminders.map(r=>({id:id(r.id),vehicleId:id(r.vehicleId),recordId:r.recordId?id(r.recordId):'',title:text(r.title,300).trim(),dueDate:date(r.dueDate,true),dueKm: num(r.dueKm,true),done:!!r.done}));
  for(const list of [records,reminders]){if(new Set(list.map(r=>r.id)).size!==list.length||list.some(r=>!vehicleIds.has(r.vehicleId)))throw Error('備份包含重複或不完整的車輛資料');}
  if(records.some(r=>!r.items)||reminders.some(r=>!r.title||(!r.dueDate&&r.dueKm===null)))throw Error('紀錄或提醒缺少必要資料');
  return {version:1,vehicles,records,reminders,selectedId:vehicleIds.has(raw.selectedId)?raw.selectedId:vehicles[0]?.id||''};
 }
 function reminderStatus(reminder,mileage,day=today()){
  if(reminder.done)return {kind:'done',label:'已完成',rank:3};
  const days=reminder.dueDate?Math.round((Date.parse(reminder.dueDate+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000):null;
  const km=reminder.dueKm!==null?reminder.dueKm-mileage:null;
  if((days!==null&&days<=0)||(km!==null&&km<=0))return {kind:'overdue',label:'已到期',rank:0,days,km};
  if((days!==null&&days<=30)||(km!==null&&km<=500))return {kind:'soon',label:'即將到期',rank:1,days,km};
  return {kind:'normal',label:'已排程',rank:2,days,km};
 }
 const api={categories,today,date,num,normalize,reminderStatus};if(typeof module==='object'&&module.exports)module.exports=api;else root.DriveModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
