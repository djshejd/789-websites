(() => {
 const M=DriveModel,KEY='drivelog-data-v1',$=s=>document.querySelector(s),H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',minimumFractionDigits:0,maximumFractionDigits:2}).format(n),number=n=>new Intl.NumberFormat('zh-TW').format(n),uuid=()=>crypto.randomUUID();
 const paths={dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM8 11h8M8 15h8M8 19h5"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/>',settings:'<path d="m10 2-1 3-3 1-3-1-2 4 3 2v3l-2 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-3-2v-3l3-2-2-4-3 1-3-1-1-3z" transform="translate(0 -1) scale(.96)"/><circle cx="12" cy="12" r="3"/>',plus:'<path d="M12 5v14M5 12h14"/>',shield:'<path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5l8-3Z"/><path d="m8 11 3 3 5-6"/>',car:'<path d="m5 7 2-4h10l2 4 2 3v8H3v-8l2-3Z"/><path d="M5 7h14M6 18v3M18 18v3M6 12h2M16 12h2"/>',wrench:'<path d="M14 3a6 6 0 0 0-7 8L2 16a3 3 0 0 0 4 4l5-5a6 6 0 0 0 8-7l-4 4-4-4 3-5Z"/>',wallet:'<path d="M20 6H5a3 3 0 0 1 0-6" transform="translate(0 3)"/><path d="M3 6v14h18V7H5M16 12h5v5h-5z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18M7 14h3M14 14h3M7 18h3"/>',download:'<path d="M12 2v13m-5-5 5 5 5-5M3 16v6h18v-6"/>',compare:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M6 9h3m6 0h3m-12 5h3m6 0h3"/>',chevron:'<path d="m9 5 7 7-7 7"/>'};
 const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[n]||paths.wrench}</svg>`;
 document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
 let state={version:1,vehicles:[],records:[],reminders:[],selectedId:''},rawBackup='',loadError=false,toastTimer,pendingDelete;
 try{rawBackup=localStorage.getItem(KEY)||'';if(rawBackup)state=M.normalize(JSON.parse(rawBackup));}catch{loadError=true;}
 const current=()=>state.vehicles.find(v=>v.id===state.selectedId),rows=()=>state.records.filter(r=>r.vehicleId===state.selectedId).sort((a,b)=>b.date.localeCompare(a.date)||b.mileage-a.mileage),reminders=()=>state.reminders.filter(r=>r.vehicleId===state.selectedId);
 const pages=['overview','records','reminders','compare','settings'];
 let page=pages.includes(location.hash.slice(1))?location.hash.slice(1):'overview',filter='all',query='';
 const compareLimit=10;
 let comparedIds=null,compareYear='all';
 function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
 function commit(next){try{if(loadError)throw Error('原有資料無法讀取，請先在設定匯出原始資料備份。');const clean=M.normalize(next);localStorage.setItem(KEY,JSON.stringify(clean));state=clean;return true;}catch(e){toast(e.name==='QuotaExceededError'?'瀏覽器儲存空間不足，請移除照片或備份後清理資料。':e.message||'無法儲存，請檢查瀏覽器儲存空間。');return false;}}
 const clone=()=>JSON.parse(JSON.stringify(state));
 function navigate(next){page=next;location.hash=next;render();window.scrollTo({top:0,behavior:'instant'});}
 const empty=(title,desc,action,label)=>`<div class="empty-state"><div class="empty-icon">${icon('car')}</div><h2>${H(title)}</h2><p>${H(desc)}</p>${action?`<button class="button" data-action="${action}">${H(label)}</button>`:''}</div>`;
 const carGraphic=`<svg class="car-graphic" viewBox="0 0 520 190" role="img" aria-label="汽車側面插畫"><ellipse cx="270" cy="164" rx="210" ry="12" fill="#0e1924" opacity=".2"/><path d="M64 123 84 89l83-14 57-48h114l61 52 63 15 19 47H58z" fill="#c6d6dd"/><path d="m183 75 47-37h98l46 39z" fill="#354f61"/><path d="M276 38v39" stroke="#c6d6dd" stroke-width="8"/><path d="M67 126h410v20H65z" fill="#9fb9c4"/><path d="M77 105h28M440 108h26M291 94h20" stroke="#ecf4f6" stroke-width="6" stroke-linecap="round"/><path d="M151 83v49M370 84v48" stroke="#688492" stroke-width="2"/><circle cx="142" cy="145" r="30" fill="#102331"/><circle cx="142" cy="145" r="17" fill="#93a6b0"/><circle cx="142" cy="145" r="8" fill="#d9e4e8"/><circle cx="397" cy="145" r="30" fill="#102331"/><circle cx="397" cy="145" r="17" fill="#93a6b0"/><circle cx="397" cy="145" r="8" fill="#d9e4e8"/></svg>`;
 function recordCard(r){return `<article class="record-card"><div class="record-symbol ${r.category==='維修'?'repair':''}">${icon('wrench')}</div><div class="record-main"><div class="record-meta">${H(r.date)} <span>${H(r.category)}</span></div><h3>${H(r.items)}</h3><p>${number(r.mileage)} km${r.shop?' · '+H(r.shop):''}</p>${r.notes?`<p class="record-note">${H(r.notes)}</p>`:''}</div><div class="record-end"><strong>${money(r.cost)}</strong><button class="link-button" data-action="edit-record" data-id="${r.id}">編輯紀錄</button></div></article>`;}
 function reminderCard(r){const s=M.reminderStatus(r,current()?.mileage||0);let detail=[];if(r.dueDate)detail.push(`${H(r.dueDate)}${s.days!==undefined&&s.days!==null&&!r.done?`（${s.days<0?'已超過 '+Math.abs(s.days)+' 天':s.days===0?'今天到期':'還有 '+s.days+' 天'}）`:''}`);if(r.dueKm!==null)detail.push(`${number(r.dueKm)} km${s.km!==undefined&&s.km!==null&&!r.done?`（${s.km<0?'已超過 '+number(Math.abs(s.km))+' km':s.km===0?'已達里程':'還有 '+number(s.km)+' km'}）`:''}`);return `<article class="reminder-card"><div class="reminder-top"><span class="status ${s.kind}">${s.label}</span><button class="icon-button" data-action="edit-reminder" data-id="${r.id}" aria-label="編輯${H(r.title)}">${icon('chevron')}</button></div><h3>${H(r.title)}</h3><p>${detail.join('<br>')}</p><button class="link-button" data-action="toggle-reminder" data-id="${r.id}">${r.done?'重新啟用提醒':'標記為已完成'}</button></article>`;}
 function overview(){const v=current(),r=rows(),year=M.today().slice(0,4),yearRows=r.filter(r=>r.date.startsWith(year)),upcoming=reminders().filter(r=>!r.done).sort((a,b)=>M.reminderStatus(a,v.mileage).rank-M.reminderStatus(b,v.mileage).rank||(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));const total=yearRows.reduce((a,b)=>a+b.cost,0);return `<section class="garage-card"><div class="garage-info"><span class="garage-label">MY DAILY COMPANION</span><h2>${H(v.name)}</h2><p>${H(v.plate||'尚未填寫車牌')}${v.year?' · '+H(v.year)+' 年式':''}</p><div class="odometer"><span>目前里程</span><strong>${number(v.mileage)} <small>km</small></strong></div><button class="garage-edit" data-action="edit-vehicle" data-id="${v.id}">更新車輛與里程</button></div><div class="garage-art"><button type="button" class="garage-photo-button" data-action="edit-vehicle-photo" data-id="${v.id}" aria-label="${v.photo?'更換車輛照片':'新增車輛照片'}">${v.photo?`<img class="garage-photo" src="${H(v.photo)}" alt="${H(v.name)}的車輛照片">`:carGraphic}<span class="garage-photo-label">${v.photo?'更換車輛照片':'新增車輛照片'}</span></button></div></section><div class="stats-grid"><article class="stat-card"><span class="stat-icon">${icon('wallet')}</span><span>今年保養花費</span><strong>${money(total)}</strong><small>${year} 年・包含保養、維修與耗材</small></article><article class="stat-card"><span class="stat-icon purple">${icon('clipboard')}</span><span>今年保養紀錄</span><strong>${yearRows.length}<em> 次</em></strong><small>累積 ${r.length} 筆車輛紀錄</small></article><article class="stat-card"><span class="stat-icon amber">${icon('calendar')}</span><span>上次保養日期</span><strong class="date-stat">${r[0]?r[0].date:'尚無紀錄'}</strong><small>${r[0]?number(r[0].mileage)+' km 時的紀錄':'完成第一次紀錄，開始照顧愛車'}</small></article></div><div class="dashboard-columns"><section class="panel"><div class="panel-heading"><div><h2>接下來的保養</h2><p>依日期或里程，任一先到期即提醒。</p></div><button class="link-button" data-nav="reminders">查看全部</button></div><div class="reminder-grid">${upcoming.length?upcoming.slice(0,2).map(reminderCard).join(''):'<div class="inline-empty">還沒有安排提醒。<button class="link-button" data-action="new-reminder">設定下一次保養</button></div>'}</div></section><section class="panel cost-panel"><div class="panel-heading"><div><h2>年度費用分布</h2><p>${year} 年的愛車照顧開銷</p></div></div><div class="cost-total">${money(total)}</div>${M.categories.map((c,i)=>{const sum=yearRows.filter(r=>r.category===c).reduce((a,b)=>a+b.cost,0);return `<div class="cost-row"><div><span>${H(c)}</span><b>${money(sum)}</b></div><div class="cost-track"><span class="cost-color-${i}" style="width:${total?sum/total*100:0}%"></span></div></div>`;}).join('')}</section></div><section class="panel"><div class="panel-heading"><div><h2>最近的保養紀錄</h2><p>每一次照顧，都有跡可循。</p></div><button class="link-button" data-nav="records">查看全部</button></div>${r.length?r.slice(0,3).map(recordCard).join(''):'<div class="inline-empty">從第一筆保養開始，建立你的愛車履歷。<button class="button secondary" data-action="new-record">新增第一筆紀錄</button></div>'}</section>`;}
 function recordsPage(){const list=rows().filter(r=>(filter==='all'||r.category===filter)&&[r.items,r.shop,r.notes,r.date].join(' ').toLowerCase().includes(query.toLowerCase()));return `<section class="panel"><div class="sheet-toolbar"><button class="button secondary" data-action="sheet-import">匯入保養表單</button></div><div class="record-toolbar"><label class="search-field"><span>搜尋</span><input id="record-search" type="search" placeholder="保養項目、店家或備註" value="${H(query)}" aria-label="搜尋保養紀錄"></label><label class="category-field"><span>紀錄類型</span><select id="record-category"><option value="all">全部類型</option>${M.categories.map(c=>`<option ${filter===c?'selected':''}>${H(c)}</option>`).join('')}</select></label></div><div class="list-summary" id="list-summary">共 ${list.length} 筆紀錄・合計 ${money(list.reduce((a,b)=>a+b.cost,0))}</div><div id="record-results">${list.length?list.map(recordCard).join(''):'<div class="inline-empty">目前沒有符合條件的紀錄。</div>'}</div></section>`;}
 function remindersPage(){const list=reminders().sort((a,b)=>M.reminderStatus(a,current().mileage).rank-M.reminderStatus(b,current().mileage).rank);return `<div class="section-action"><p>開啟 App 時查看提醒；不會傳送背景通知。</p><button class="button" data-action="new-reminder">${icon('plus')}新增提醒</button></div><div class="reminder-grid reminders-page">${list.length?list.map(reminderCard).join(''):empty('安排下一次照顧','設定你與保養廠確認的日期或里程，讓下次保養不再忘記。','new-reminder','新增保養提醒')}</div><p class="helper-note">即將到期：距離設定日期 30 天內，或距離設定里程 500 km 內。這是提醒顯示範圍，保養週期請依車主手冊及保養廠建議自行設定。</p>`;}
 function comparePage(){
  if(state.vehicles.length<2){
   return empty('需要至少兩台車才能比較','新增車輛後，就能比較各車的里程、保養紀錄與費用。','new-vehicle','新增車輛');
  }

  const byId=new Map(state.vehicles.map(v=>[v.id,v]));
  if(!comparedIds){
   comparedIds=[state.selectedId,state.vehicles.find(v=>v.id!==state.selectedId).id];
  }
  const vehicles=comparedIds.map(id=>byId.get(id)).filter(Boolean);
  comparedIds=vehicles.map(v=>v.id);
  const selected=new Set(comparedIds);
  const years=[...new Set([M.today().slice(0,4),...state.records.map(r=>r.date.slice(0,4))])].sort().reverse();
  if(compareYear!=='all'&&!years.includes(compareYear))compareYear='all';

  const summaries=vehicles.map(vehicle=>M.maintenanceSummary(state.records,vehicle.id,compareYear));
  const cost=(summary,category)=>summary.count?money(category?summary.byCategory[category]:summary.total):'—';
  const lines=[
   ['出廠年式',vehicles.map(v=>v.year||'未填寫')],
   ['目前里程',vehicles.map(v=>number(v.mileage)+' km')],
   ['保養紀錄',summaries.map(s=>number(s.count)+' 筆')],
   ['總費用',summaries.map(s=>cost(s))],
   ['最近紀錄',summaries.map(s=>s.latest||'—')],
   ...M.categories.map(category=>[category+'費用',summaries.map(s=>cost(s,category))]),
  ];
  return `
   <section class="panel compare-panel" aria-label="車輛比較設定與結果">
    <div class="compare-filters">
     <fieldset class="compare-choices" aria-describedby="compare-count">
      <legend>選擇比較車輛</legend>
      <p class="helper-note" id="compare-count">已選 ${vehicles.length} / ${compareLimit} 輛</p>
      <div class="compare-options">
       ${state.vehicles.map(v=>`
        <label>
         <input type="checkbox" id="compare-vehicle-${H(v.id)}" value="${H(v.id)}" data-compare-vehicle
          ${selected.has(v.id)?'checked':vehicles.length>=compareLimit?'disabled':''}>
         <span>${H(v.name)}${v.plate?` <small>${H(v.plate)}</small>`:''}</span>
        </label>`).join('')}
      </div>
     </fieldset>
     <label class="vehicle-switch">
      <span>比較期間</span>
      <select id="compare-year">
       <option value="all">全部年度</option>
       ${years.map(year=>`<option value="${year}" ${year===compareYear?'selected':''}>${year} 年</option>`).join('')}
      </select>
     </label>
    </div>
    ${vehicles.length>=2?`
     <div class="compare-scroll" role="region" aria-labelledby="compare-title" tabindex="0">
      <table class="compare-table" aria-describedby="compare-note" style="--compare-columns:${vehicles.length}">
       <caption id="compare-title">${compareYear==='all'?'歷來保養比較':compareYear+' 年保養比較'}</caption>
       <thead><tr><th scope="col">比較項目</th>${vehicles.map(v=>`
        <th scope="col">${H(v.name)}${v.plate?`<small>${H(v.plate)}</small>`:''}</th>`).join('')}</tr></thead>
       <tbody>${lines.map(([label,values])=>`<tr>
        <th scope="row">${H(label)}</th>${values.map(value=>`<td>${H(value)}</td>`).join('')}
       </tr>`).join('')}</tbody>
      </table>
     </div>
     <p class="helper-note" id="compare-note">可左右滑動查看所有車輛。「—」表示所選期間沒有紀錄。目前里程使用各車最新資料。</p>
    `:'<p class="inline-empty" role="status">再選擇車輛，至少選 2 輛即可比較。</p>'}
   </section>`;
 }
 document.addEventListener('change',event=>{
  const control=event.target;
  if(control.id==='compare-year')compareYear=control.value;
  else if(control.matches('[data-compare-vehicle]')){
   comparedIds=control.checked?[...comparedIds,control.value]:comparedIds.filter(id=>id!==control.value);
  }
  else return;
  const optionsScroll=$('.compare-options').scrollTop;
  const tableScroll=$('.compare-scroll')?.scrollLeft||0;
  $('#content').innerHTML=comparePage();
  $('.compare-options').scrollTop=optionsScroll;
  const table=$('.compare-scroll');
  if(table)table.scrollLeft=tableScroll;
  document.getElementById(control.id)?.focus({preventScroll:true});
 });

 function settings(){return `<section class="panel"><div class="panel-heading"><div><h2>我的車庫</h2><p>可管理多台車，各自保留獨立紀錄。</p></div><button class="button secondary" data-action="new-vehicle">新增車輛</button></div><div class="vehicle-list">${state.vehicles.length?state.vehicles.map(v=>`<article class="vehicle-row"><span class="vehicle-symbol">${v.photo?`<img src="${H(v.photo)}" alt="">`:icon('car')}</span><div><h3>${H(v.name)}</h3><p>${H(v.plate||'未填車牌')} · ${number(v.mileage)} km</p></div><button class="link-button" data-action="edit-vehicle" data-id="${v.id}">編輯</button></article>`).join(''):'<p class="inline-empty">你的車庫還是空的，新增第一台愛車吧。</p>'}</div></section><section class="panel backup-panel"><div class="panel-heading"><div><h2>資料備份</h2><p>把愛車紀錄，好好留在手上。</p></div><span class="stat-icon">${icon('download')}</span></div><div class="storage-explainer"><strong>資料保存在目前的瀏覽器</strong><p>更換手機、瀏覽器，或清除網站資料後，紀錄不會自動同步。建議定期匯出完整備份，換裝置時再匯入。</p></div><div class="backup-actions"><button class="button" data-action="export-json">匯出完整備份</button><button class="button secondary" data-action="import">匯入備份並合併</button><button class="button secondary" data-action="export-csv">匯出費用 CSV</button></div><p class="helper-note">完整備份包含所有車輛、紀錄與提醒。匯入時合併新資料，相同識別碼保留目前內容。</p></section><section class="panel"><h2>關於里程誌</h2><p class="about-text">這裡是你的汽車維護日誌。保養項目與週期由你自行填寫；費用以新台幣記錄，里程單位為公里。下次提醒以日期、里程任一先到期為準。</p></section>`;}
 function render(){const v=current();$('#vehicle-select').innerHTML=state.vehicles.length?state.vehicles.map(v=>`<option value="${v.id}" ${v.id===state.selectedId?'selected':''}>${H(v.name)}${v.plate?' · '+H(v.plate):''}</option>`).join(''):'<option value="">尚未新增車輛</option>';$('#vehicle-select').disabled=!state.vehicles.length;$('.vehicle-switch').hidden=page==='compare';const titles={overview:['YOUR GARAGE, AT A GLANCE','每一段里程，都值得照顧。','保養、維修與花費，一次掌握。'],records:['YOUR MAINTENANCE JOURNAL','愛車的照顧日記','留下每一次保養，讓紀錄更完整。'],reminders:['THE NEXT MILESTONE','下次保養，先記起來。','日期和里程，幫你一起留意。'],compare:['','車輛比較','同時比較最多 10 輛車的里程與保養紀錄。'],settings:['YOUR GARAGE & YOUR DATA','好好管理，也好好保存。','車輛資料、紀錄備份，都在這裡。']};const t=titles[page];$('#page-kicker').textContent=t[0];$('#page-kicker').hidden=!t[0];$('#page-title').textContent=t[1];$('#page-description').textContent=t[2];document.querySelectorAll('[data-page]').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});const count=state.reminders.filter(r=>!r.done&&M.reminderStatus(r,state.vehicles.find(v=>v.id===r.vehicleId)?.mileage||0).rank===0).length;$('#due-badge').textContent=count||'';$('#storage-warning').hidden=!loadError;$('#storage-warning').textContent='原有資料無法讀取。請先至設定匯出原始備份，避免覆寫。';$('#content').innerHTML=page==='settings'?settings():page==='compare'?comparePage():!v?empty('從你的第一台愛車開始','新增車輛與目前里程，就能開始記錄保養和維修。','new-vehicle','新增我的車輛'):page==='overview'?overview():page==='records'?recordsPage():remindersPage();}
 const field=(label,name,type='text',value='',attrs='')=>`<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" value="${H(value)}" ${attrs}></label>`;
 let editorType='',editingId='',vehiclePhoto='',photoRequest=0;
 function openForm(type,id=''){
  if(type!=='vehicle'&&!current()){openForm('vehicle');toast('先新增車輛，再開始記錄。');return;}
  editorType=type;editingId=id;const v=state.vehicles.find(v=>v.id===id),r=state.records.find(r=>r.id===id),rem=state.reminders.find(r=>r.id===id),linked=state.reminders.find(x=>x.recordId===id);
  photoRequest++;
  vehiclePhoto=v?.photo||'';
  $('#editor-title').textContent=(id?'編輯':'新增')+({vehicle:'車輛',record:'保養紀錄',reminder:'保養提醒'}[type]);
  let html='';
  if(type==='vehicle')html=`${field('車輛名稱 *','name','text',v?.name||'','required maxlength="100" placeholder="例如：我的 Corolla Cross"') }<div class="form-grid">${field('車牌（選填）','plate','text',v?.plate||'','maxlength="30" placeholder="ABC-1234"')}${field('出廠年式（選填）','year','number',v?.year||'','min="1900" max="'+(Number(M.today().slice(0,4))+1)+'" inputmode="numeric"')}</div>${field('目前里程（km）*','mileage','number',v?.mileage??0,'required min="0" max="10000000" step="1" inputmode="numeric"')}<p class="helper-note">新增保養紀錄時，較高的里程會自動更新到車輛資料。</p>
   <label class="form-field vehicle-photo-field"><span>車輛照片（選填）</span>
    <input id="vehicle-photo-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" aria-describedby="vehicle-photo-help">
   </label>
   <p id="vehicle-photo-help" class="helper-note">支援 JPG、PNG、WebP，限 12 MB 以下。照片會縮小後儲存在此瀏覽器。</p>
   <div id="vehicle-photo-preview" class="vehicle-photo-preview" hidden>
    <img alt="車輛照片預覽">
    <button type="button" class="link-button" id="vehicle-photo-remove">移除照片</button>
   </div>
   <p id="vehicle-photo-message" class="form-error" role="status"></p>`;
  if(type==='record')html=`<p class="form-context">${H(current().name)}・${H(current().plate||'保養紀錄')}</p><div class="form-grid">${field('保養日期 *','date','date',r?.date||M.today(),'required max="'+M.today()+'"')}${field('當時里程（km）*','mileage','number',r?.mileage??current().mileage,'required min="0" max="10000000" step="1" inputmode="numeric"')}</div><label class="form-field"><span>紀錄類型 *</span><select name="category">${M.categories.map(c=>`<option ${r?.category===c?'selected':''}>${c}</option>`).join('')}</select></label>${field('保養／維修項目 *','items','text',r?.items||'','required maxlength="300" placeholder="例如：更換機油、機油濾芯"')}<div class="item-chips">${['更換機油','輪胎','電瓶','煞車','冷氣'].map(s=>`<button type="button" data-chip="${s}">${s}</button>`).join('')}</div><div class="form-grid">${field('費用（NT$）*','cost','number',r?.cost??'','required min="0" max="1000000000" step="0.01" inputmode="decimal" placeholder="0"')}${field('保養廠／店家','shop','text',r?.shop||'','maxlength="100" placeholder="店家名稱（選填）"')}</div><label class="form-field"><span>備註</span><textarea name="notes" rows="3" maxlength="2000" placeholder="油品、料號、車況或其他想留下的紀錄">${H(r?.notes||'')}</textarea></label><div class="form-subheading">下次保養提醒 <small>選填</small></div><div class="form-grid">${field('下次日期','dueDate','date',linked?.dueDate||'')}${field('下次里程（km）','dueKm','number',linked?.dueKm??'','min="0" max="10000000" step="1" inputmode="numeric"')}</div><p class="helper-note">填日期或里程即可建立提醒；任一先到期就會標示。請自行填寫已確認的保養週期。</p>`;
  if(type==='reminder')html=`<p class="form-context">${H(current().name)}</p>${field('提醒事項 *','title','text',rem?.title||'','required maxlength="300" placeholder="例如：下次更換機油"')}<div class="form-grid">${field('預計日期','dueDate','date',rem?.dueDate||'')}${field('預計里程（km）','dueKm','number',rem?.dueKm??'','min="0" max="10000000" step="1" inputmode="numeric"')}</div><p class="helper-note">日期、里程至少填寫一項。提醒會在 App 內顯示，不會傳送背景通知。</p>`;
  $('#editor-form').innerHTML=html+`<p class="form-error" role="alert" id="form-error"></p><div class="form-actions">${id?'<button type="button" class="delete-button" data-action="delete-current">刪除</button>':''}<button type="button" class="button secondary" data-action="close">取消</button><button type="submit" class="button">儲存${type==='record'?'紀錄':type==='vehicle'?'車輛':'提醒'}</button></div>`;$('#editor').showModal();$('#editor').scrollTop=0;
  if(type==='vehicle'){
   updateVehiclePhoto();
   $('#vehicle-photo-remove').onclick=()=>{
    photoRequest++;
    vehiclePhoto='';
    $('#vehicle-photo-file').value='';
    $('#vehicle-photo-message').textContent='';
    $('#editor-form button[type=submit]').disabled=false;
    updateVehiclePhoto();
    $('#vehicle-photo-file').focus();
   };
  }
 }
 function updateVehiclePhoto(){
  const preview=$('#vehicle-photo-preview'), image=preview.querySelector('img');
  preview.hidden=!vehiclePhoto;
  if(vehiclePhoto)image.src=vehiclePhoto;
  else image.removeAttribute('src');
 }

 async function compressVehiclePhoto(file){
  if(file.size>12000000)throw Error('請選擇 12 MB 以下的照片。');
  if(!/\.(?:jpe?g|png|webp)$/i.test(file.name)||
     (file.type&&!['image/jpeg','image/png','image/webp'].includes(file.type)))throw Error('請選擇 JPG、PNG 或 WebP 照片。');
  const url=URL.createObjectURL(file);
  try{
   const image=new Image();
   image.src=url;
   try{await image.decode();}catch{throw Error('無法讀取照片，請重新選擇。');}
   const {naturalWidth:width,naturalHeight:height}=image;
   if(!width||!height||width*height>50000000)throw Error('照片解析度過高，請先縮小。');
   const scale=Math.min(1,720/Math.max(width,height));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(width*scale));
   canvas.height=Math.max(1,Math.round(height*scale));
   const context=canvas.getContext('2d',{alpha:false});
   context.fillStyle='#ffffff';
   context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.8,.65,.5]){
    const data=canvas.toDataURL('image/jpeg',quality);
    if(M.isVehiclePhoto(data))return data;
   }
   throw Error('照片縮小後仍過大，請換一張照片。');
  }finally{
   URL.revokeObjectURL(url);
  }
 }

 $('#editor-form').addEventListener('change',async event=>{
  const input=event.target;
  if(input.id!=='vehicle-photo-file'||!input.files.length)return;
  const request=++photoRequest, message=$('#vehicle-photo-message');
  const save=$('#editor-form button[type=submit]');
  save.disabled=true;
  message.textContent='正在處理照片…';
  const isCurrent=()=>request===photoRequest&&$('#editor').open;
  try{
   const photo=await compressVehiclePhoto(input.files[0]);
   if(isCurrent()){
    vehiclePhoto=photo;
    updateVehiclePhoto();
    message.textContent='';
   }
  }catch(error){
   if(isCurrent()){
    message.textContent=error.message;
    input.value='';
   }
  }finally{
   if(isCurrent())save.disabled=false;
  }
 });

 $('#editor-form').addEventListener('submit',event=>{event.preventDefault();if(event.currentTarget.querySelector('button[type=submit]').disabled)return;$('#form-error').textContent='';const data=new FormData(event.currentTarget),get=name=>String(data.get(name)||'').trim(),next=clone();try{if(editorType==='vehicle'){const value={id:editingId||uuid(),name:get('name'),plate:get('plate'),year:get('year'),mileage:Math.round(M.num(get('mileage'))),photo:vehiclePhoto};if(!value.name)throw Error('請填寫車輛名稱');const i=next.vehicles.findIndex(v=>v.id===editingId);if(i>=0)next.vehicles[i]=value;else next.vehicles.push(value);next.selectedId=value.id;}else if(editorType==='record'){const value={id:editingId||uuid(),vehicleId:state.selectedId,date:M.date(get('date')),mileage:Math.round(M.num(get('mileage'))),category:get('category'),items:get('items'),cost:M.num(get('cost')),shop:get('shop'),notes:get('notes'),createdAt:new Date().toISOString()};if(!value.items)throw Error('請填寫保養項目');const i=next.records.findIndex(r=>r.id===editingId);if(i>=0)next.records[i]=value;else next.records.push(value);const vehicle=next.vehicles.find(v=>v.id===state.selectedId);vehicle.mileage=Math.max(vehicle.mileage,value.mileage);const old=next.reminders.find(r=>r.recordId===value.id);next.reminders=next.reminders.filter(r=>r.recordId!==value.id);if(get('dueDate')||get('dueKm'))next.reminders.push({id:old?.id||uuid(),vehicleId:state.selectedId,recordId:value.id,title:value.items,dueDate:M.date(get('dueDate'),true),dueKm:M.num(get('dueKm'),true),done:old?.done||false});}else{if(!get('dueDate')&&!get('dueKm'))throw Error('請至少填寫預計日期或預計里程');if(!get('title'))throw Error('請填寫提醒事項');const old=next.reminders.find(r=>r.id===editingId);const value={id:editingId||uuid(),vehicleId:state.selectedId,recordId:old?.recordId||'',title:get('title'),dueDate:M.date(get('dueDate'),true),dueKm:M.num(get('dueKm'),true),done:old?.done||false};const i=next.reminders.findIndex(r=>r.id===editingId);if(i>=0)next.reminders[i]=value;else next.reminders.push(value);}if(commit(next)){$('#editor').close();render();toast('已儲存到這個瀏覽器');}else{$('#form-error').textContent=$('#toast').textContent;}}catch(e){$('#form-error').textContent=e.message;}});
 function askDelete(){const type=editorType,id=editingId;$('#confirm-title').textContent='刪除'+({vehicle:'車輛',record:'保養紀錄',reminder:'提醒'}[type]);$('#confirm-message').textContent=type==='vehicle'?'這台車的所有保養紀錄與提醒也會一併刪除。建議先匯出完整備份。':type==='record'?'刪除這筆保養紀錄及其連結提醒？車輛目前里程將保留。':'確定刪除這筆提醒？';pendingDelete=()=>{const next=clone();if(type==='vehicle'){next.vehicles=next.vehicles.filter(v=>v.id!==id);next.records=next.records.filter(r=>r.vehicleId!==id);next.reminders=next.reminders.filter(r=>r.vehicleId!==id);next.selectedId=next.vehicles[0]?.id||'';}if(type==='record'){next.records=next.records.filter(r=>r.id!==id);next.reminders=next.reminders.filter(r=>r.recordId!==id);}if(type==='reminder')next.reminders=next.reminders.filter(r=>r.id!==id);if(commit(next)){$('#confirm-dialog').close();$('#editor').close();render();toast('已刪除');}};$('#confirm-dialog').showModal();}
 function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function exportData(kind){if(kind==='json'){download(loadError?rawBackup:JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'里程誌完整備份-'+M.today()+'.json','application/json');}else{const safe=s=>'"'+String(s??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const data=[['車輛','車牌','日期','里程km','類型','項目','費用NTD','店家','備註'],...state.records.map(r=>{const v=state.vehicles.find(v=>v.id===r.vehicleId);return[v?.name,v?.plate,r.date,r.mileage,r.category,r.items,r.cost,r.shop,r.notes];})];download('\uFEFF'+data.map(row=>row.map(safe).join(',')).join('\r\n'),'里程誌費用紀錄-'+M.today()+'.csv','text/csv;charset=utf-8');}toast('備份檔已匯出');}
 const photoReview = $('#photo-review');
 let pendingSheet, photoRequestController, sheetRequest = 0;

 function resetPhotoReview() {
  photoRequestController?.abort();
  photoRequestController = null;
  photoReview.hidden = true;
  photoReview.reset();
  photoReview.querySelector('details').open = false;
  $('#photo-text').textContent = '';
 }

 function openSheetImport() {
  resetPhotoReview();
  const vehicle = current();
  $('#sheet-context').textContent = `未填車名或車牌的紀錄會匯入「${vehicle.name}」。填了車名或車牌的列會分配給相符的既有車輛。`;
  pendingSheet = null;
  $('#sheet-file').value = '';
  $('#sheet-message').textContent = '';
  $('#sheet-preview').replaceChildren();
  $('#sheet-save').disabled = true;
  $('#sheet-import').showModal();
 }

 function showSheetPreview(sheets) {
  const plan = DriveImport.prepare(sheets, state);
  pendingSheet = { sheets, plan, base: state };
  const { records, issues, duplicates, rejected } = plan;
  const overLimit = state.records.length + records.length > 10000;
  const counts = new Map(M.categories.map(category => [category, 0]));
  records.forEach(record => counts.set(record.category, counts.get(record.category) + 1));

  $('#sheet-message').textContent = `可匯入 ${records.length} 筆，略過 ${duplicates} 筆重複及 ${rejected} 筆有誤的資料。` +
   (overLimit ? '匯入後會超過 10,000 筆紀錄上限，請縮減表單列數。' : '');
  $('#sheet-preview').innerHTML = records.length ? `
   <ul class="sheet-categories">${[...counts].map(([category, count]) => `<li>${H(category)} <strong>${count}</strong></li>`).join('')}</ul>
   <ul class="sheet-rows" aria-label="匯入預覽">
    ${records.slice(0, 8).map(record => `<li><strong>${H(record.items)}</strong><span>${H(record.date)}・${H(state.vehicles.find(v => v.id === record.vehicleId).name)}・${H(record.category)}</span></li>`).join('')}
   </ul>
   ${records.length > 8 ? '<p class="helper-note">預覽顯示前 8 筆。</p>' : ''}
  ` : '';
  if (issues.length) {
   $('#sheet-preview').insertAdjacentHTML('beforeend', `
    <details class="sheet-issues" ${!records.length ? 'open' : ''}>
     <summary>查看需修正的列或工作表</summary>
     <ul>${issues.map(issue => `<li>${H(issue)}</li>`).join('')}</ul>
     ${rejected > 30 ? '<p>最多顯示前 30 筆問題。</p>' : ''}
    </details>
   `);
  }
  $('#sheet-save').disabled = !records.length || overLimit;
 }

 $('#sheet-file').addEventListener('change', async event => {
  const request = ++sheetRequest;
  const file = event.target.files[0];
  resetPhotoReview();
  pendingSheet = null;
  $('#sheet-save').disabled = true;
  $('#sheet-preview').replaceChildren();
  $('#sheet-message').textContent = file ? '正在讀取並分類…' : '';
  if (!file) return;
  const isCurrent = () => request === sheetRequest && $('#sheet-import').open;
  try {
   if (/\.(?:jpe?g|png|webp)$/i.test(file.name)) {
    $('#sheet-message').textContent = '正在載入照片辨識…';
    photoRequestController = new AbortController();
    const text = await DrivePhotoImport.recognize(file, photoRequestController.signal, percent => {
     if (isCurrent()) $('#sheet-message').textContent = `正在辨識照片… ${percent}%`;
    });
    if (!isCurrent()) return;
    const fields = DrivePhotoImport.extract(text);
    for (const [name, value] of Object.entries(fields)) photoReview.elements.namedItem(name).value = value;
    $('#photo-text').textContent = text.trim() || '沒有辨識到文字。';
    photoReview.hidden = false;
    $('#sheet-message').textContent = text.trim()
     ? '辨識完成。請核對欄位，再按「預覽分類」。'
     : '辨識不到文字。你可以手動填寫，或換一張較清晰的照片。';
   } else {
    const sheets = await DriveImport.readFile(file);
    if (isCurrent()) showSheetPreview(sheets);
   }
  } catch (error) {
   if (isCurrent()) {
    $('#sheet-message').textContent = `無法匯入：${error.message}`;
    event.target.value = '';
   }
  }
 });

 photoReview.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(photoReview);
  const values = ['date', 'mileage', 'items', 'cost', 'plate', 'shop'].map(name => fields.get(name));
  showSheetPreview([{ sheet: '照片', data: [['日期', '里程', '項目', '費用', '車牌', '店家'], values] }]);
 });

 photoReview.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement) || !pendingSheet) return;
  pendingSheet = null;
  $('#sheet-preview').replaceChildren();
  $('#sheet-save').disabled = true;
  $('#sheet-message').textContent = '欄位已修改，請重新預覽分類。';
 });

 $('#sheet-import').addEventListener('close', () => {
  if ($('#sheet-import').open) return;
  sheetRequest++;
  pendingSheet = null;
  resetPhotoReview();
 });

 $('#sheet-save').addEventListener('click', () => {
  if (!pendingSheet) return;
  if (pendingSheet.base !== state) {
   showSheetPreview(pendingSheet.sheets);
   $('#sheet-message').textContent += ' 紀錄已更新，請確認最新的預覽。';
   return;
  }
  const { records } = pendingSheet.plan;
  const next = clone(), vehicles = new Map(next.vehicles.map(vehicle => [vehicle.id, vehicle]));
  const createdAt = new Date().toISOString();
  for (const record of records) {
   next.records.push({ ...record, id: uuid(), createdAt });
   const vehicle = vehicles.get(record.vehicleId);
   vehicle.mileage = Math.max(vehicle.mileage, record.mileage);
  }
  if (!commit(next)) {
   $('#sheet-message').textContent = $('#toast').textContent;
   return;
  }
  $('#sheet-import').close();
  filter = 'all';
  query = '';
  render();
  toast(`已匯入 ${records.length} 筆保養紀錄`);
 });

 $('#import-file').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>10000000)throw Error('備份檔過大，請使用 10MB 以下的 JSON');const incoming=M.normalize(JSON.parse(await file.text()));const next=clone();let count=0;for(const key of ['vehicles','records','reminders']){const ids=new Set(next[key].map(v=>v.id));for(const row of incoming[key])if(!ids.has(row.id)){next[key].push(row);count++;}}if(!next.selectedId)next.selectedId=incoming.selectedId;if(commit(next)){render();toast(count?'備份已合併，新增 '+count+' 筆資料':'已檢查備份，沒有新的資料');}}catch(e){toast('匯入失敗：'+e.message);}event.target.value='';});
 $('#confirm-cancel').onclick=()=>$('#confirm-dialog').close();$('#confirm-delete').onclick=()=>pendingDelete?.();
 document.addEventListener('click',event=>{const element=event.target.closest('button,a');if(!element)return;if(element.dataset.page){event.preventDefault();navigate(element.dataset.page);return;}if(element.dataset.nav){navigate(element.dataset.nav);return;}if(element.dataset.chip){const input=$('#editor-form input[name="items"]');if(!input.value.includes(element.dataset.chip))input.value+=(input.value?'、':'')+element.dataset.chip;return;}const a=element.dataset.action,id=element.dataset.id;if(a==='new-vehicle')openForm('vehicle');if(a==='edit-vehicle'||a==='edit-vehicle-photo'){openForm('vehicle',id);if(a==='edit-vehicle-photo'){$('#vehicle-photo-file').focus();$('#vehicle-photo-file').click();}}if(a==='new-record')openForm('record');if(a==='edit-record')openForm('record',id);if(a==='new-reminder')openForm('reminder');if(a==='edit-reminder')openForm('reminder',id);if(a==='close')$('#editor').close();if(a==='delete-current')askDelete();if(a==='toggle-reminder'){const next=clone(),r=next.reminders.find(r=>r.id===id);r.done=!r.done;if(commit(next)){render();toast(r.done?'提醒已標記完成':'提醒已重新啟用');}}if(a==='export-json')exportData('json');if(a==='export-csv')exportData('csv');if(a==='import')$('#import-file').click();if(a==='sheet-import')openSheetImport();if(a==='close-sheet')$('#sheet-import').close();if(a==='sheet-template')download('\uFEFF車輛,車牌,日期,里程km,類型,項目,費用NTD,店家,備註\r\n','里程誌保養匯入範本.csv','text/csv;charset=utf-8');});
 $('#vehicle-select').onchange=event=>{const next=clone();next.selectedId=event.target.value;if(commit(next)){query='';filter='all';render();}};
 document.addEventListener('input',event=>{if(event.target.id!=='record-search')return;query=event.target.value;const temp=document.createElement('div');temp.innerHTML=recordsPage();$('#record-results').replaceWith(temp.querySelector('#record-results'));$('#list-summary').replaceWith(temp.querySelector('#list-summary'));});
 document.addEventListener('change',event=>{if(event.target.id==='record-category'){filter=event.target.value;$('#content').innerHTML=recordsPage();}});
 window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(pages.includes(next)&&page!==next){page=next;render();}});
 window.addEventListener('storage',event=>{if(event.key===KEY&&!$('#editor').open){try{state=event.newValue?M.normalize(JSON.parse(event.newValue)):{version:1,vehicles:[],records:[],reminders:[],selectedId:''};render();}catch{toast('另一個分頁的資料無法讀取，請重新整理。');}}});
 render();
})();
