(() => {
  // Reference locations: tourism authority pages and the restaurants' location information.
  const coordinates = {
    brown:[23.09878,121.21260], buns:[22.969962,121.30431], coast:[23.12316,121.41104],
    noodles:[22.754734,121.153381], luye:[22.91645,121.12159], bento:[23.124256,121.220904],
    lake:[23.12010,121.22404], liji:[22.81547,121.13825], wuling:[22.95945,121.12530]
  };
  const modes = {car:{label:'開車',google:'driving'},bike:{label:'自行車',google:'bicycling'},foot:{label:'步行',google:'walking'}};
  const byId=id=>places.find(p=>p.id===id);
  const section=document.createElement('section');
  section.id='travel-map'; section.className='section map-section';
  section.innerHTML=`<div class="section-top"><div><div class="eyebrow">MAP YOUR JOURNEY / 03</div><h2>下一站，還要多久？</h2><p>在地圖上串起想去的地方，看看路上的時間。</p></div><a href="#explore" class="text-btn">繼續探索 ↑</a></div><div class="map-layout"><div class="map-planner"><div class="map-endpoints"><label for="map-from">出發地 A</label><select id="map-from"></select><button type="button" id="map-swap" aria-label="交換出發地與目的地">⇅ 交換起終點</button><label for="map-to">目的地 B</label><select id="map-to"></select></div><label for="map-mode">交通方式</label><select id="map-mode"><option value="car">開車</option><option value="bike">自行車</option><option value="foot">步行</option></select><button type="button" class="primary" id="map-calculate">計算點到點時間 ↗</button><button type="button" class="map-trip-button" id="map-load-trip">計算我的行程各段時間</button><div id="map-status" role="status" aria-live="polite">選擇兩個地點，再按計算。也可以點選地圖上的標記。</div><div id="map-result" hidden></div></div><div class="map-view-wrap"><div id="interactive-map" role="region" aria-label="台東景點互動地圖，可拖曳及縮放"></div><div id="map-fallback" hidden>地圖目前無法載入，仍可使用左側選單查詢時間。</div><p class="map-hint">雙指縮放、拖曳地圖；點選標記可設為起點或終點。</p></div></div><div class="map-notes"><p>時間依道路路網推估，未包含即時塞車、等紅燈、停車及景點停留時間。景點位置為參考點，請以現場入口與道路管制為準。</p><p>伯朗大道汽機車禁入：開車須停合法停車區，再步行或騎單車；三仙台八拱橋整修封閉，僅規劃至本島側。</p><p>路線：<a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">FOSSGIS / OSRM</a>・地圖：<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>・<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">回報地圖問題</a></p></div>`;
  document.querySelector('#routes').before(section);
  const el=s=>section.querySelector(s);
  for(const select of [el('#map-from'),el('#map-to')]) for(const p of places){const option=document.createElement('option');option.value=p.id;option.textContent=`${p.title}・${p.town}`;select.append(option);}
  el('#map-from').value='bento';el('#map-to').value='lake';
  let map,routeLayer,pointsLayer,controller,requestVersion=0,lastRequest=0;
  const cache=new Map();
  const markers=new Map();
  try {
    if(!window.L)throw Error('Map library unavailable');
    map=L.map('interactive-map',{scrollWheelZoom:false,tap:true}).setView([22.98,121.25],10);
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    let failed=0;
    tiles.on('tileerror',()=>{if(++failed>=3)el('#map-fallback').hidden=false;});
    tiles.on('tileload',()=>{el('#map-fallback').hidden=true;});
    pointsLayer=L.layerGroup().addTo(map);
    places.forEach((p,index)=>{
      const popup=document.createElement('div');popup.className='map-popup';
      const title=document.createElement('strong');title.textContent=p.title;popup.append(title);
      const meta=document.createElement('p');meta.textContent=`${p.town}・${labels[p.category]}`;popup.append(meta);
      for(const [type,text] of [['from','設為起點 A'],['to','設為終點 B']]){const button=document.createElement('button');button.type='button';button.textContent=text;button.addEventListener('click',()=>{el(type==='from'?'#map-from':'#map-to').value=p.id;invalidate();map.closePopup();el('#map-status').textContent=`已將${p.title}設為${type==='from'?'出發地':'目的地'}，請按計算。`;});popup.append(button);}
      const marker=L.marker(coordinates[p.id],{title:p.title,alt:p.title,icon:L.divIcon({className:'travel-marker',html:`<span><b>${index+1}</b></span>`,iconSize:[32,38],iconAnchor:[16,38],popupAnchor:[0,-35]})}).addTo(pointsLayer).bindPopup(popup);
      markers.set(p.id,marker);
    });
    const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(el('#interactive-map'));
    map.fitBounds(places.map(p=>coordinates[p.id]),{padding:[25,25]});
  }catch{el('#map-fallback').hidden=false;}

  function invalidate(){requestVersion++;controller?.abort();if(routeLayer){routeLayer.remove();routeLayer=null;}el('#map-result').hidden=true;el('#map-status').textContent='條件已更新，請重新計算。';}
  for(const selector of ['#map-from','#map-to','#map-mode'])el(selector).addEventListener('change',invalidate);
  el('#map-swap').onclick=()=>{const a=el('#map-from').value;el('#map-from').value=el('#map-to').value;el('#map-to').value=a;invalidate();};
  const duration=s=>{const minutes=Math.max(1,Math.ceil(s/60));return minutes<60?`${minutes} 分鐘`:`${Math.floor(minutes/60)} 小時${minutes%60?' '+minutes%60+' 分鐘':''}`;};
  function googleLink(ids,mode){const query=new URLSearchParams({api:'1',origin:coordinates[ids[0]].join(','),destination:coordinates[ids.at(-1)].join(','),travelmode:modes[mode].google});if(ids.length>2)query.set('waypoints',ids.slice(1,-1).map(id=>coordinates[id].join(',')).join('|'));return 'https://www.google.com/maps/dir/?'+query;}
  function showResult(route,ids,mode,snapshot=false){
    const result=el('#map-result');result.replaceChildren();
    const headline=document.createElement('div');headline.className='map-result-total';
    const caption=document.createElement('span');caption.textContent=`${modes[mode].label}・${ids.length>2?'行程總交通時間':'點到點預估'}`;
    const time=document.createElement('strong');time.textContent='約 '+duration(route.duration);
    const distance=document.createElement('span');distance.textContent=`沿道路約 ${(route.distance/1000).toFixed(1)} 公里`;
    headline.append(caption,time,distance);result.append(headline);
    const list=document.createElement('ol');list.className='map-legs';
    route.legs.forEach((leg,index)=>{const li=document.createElement('li');const title=document.createElement('span');title.textContent=`${byId(ids[index]).title} → ${byId(ids[index+1]).title}`;const value=document.createElement('b');value.textContent=`約 ${duration(leg.duration)}・${(leg.distance/1000).toFixed(1)} km`;li.append(title,value);list.append(li);});result.append(list);
    const link=document.createElement('a');link.className='map-google';link.href=googleLink(ids,mode);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Google 地圖查看導航與路況 ↗';result.append(link);
    if(ids.some(id=>['brown','coast'].includes(id))){const note=document.createElement('p');note.className='map-access-note';note.textContent='包含管制景點：伯朗大道汽機車禁入；三仙台八拱橋封閉。路線終點以附近可通行道路為準。';result.append(note);}
    if(snapshot){const note=document.createElement('p');note.className='map-snapshot-note';note.textContent=`道路時間表估算・資料日期 ${new Date(window.TAITUNG_ROAD_DATA.checkedAt).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}・非即時路況`;result.append(note);}
    result.hidden=false;
    if(map&&route.geometry){if(routeLayer)routeLayer.remove();routeLayer=L.geoJSON(route.geometry,{style:{color:'#bd7a2d',weight:5,opacity:.9}}).addTo(map);map.fitBounds(routeLayer.getBounds(),{padding:[35,35],maxZoom:15});}
  }
  function tableRoute(ids,mode){
    const data=window.TAITUNG_ROAD_DATA,table=data?.modes?.[mode];if(!table)return null;
    const legs=[];for(let i=0;i<ids.length-1;i++){const a=data.ids.indexOf(ids[i]),b=data.ids.indexOf(ids[i+1]);const duration=table.durations[a]?.[b],distance=table.distances[a]?.[b];if(!Number.isFinite(duration)||!Number.isFinite(distance))return null;legs.push({duration,distance});}
    return {duration:legs.reduce((sum,l)=>sum+l.duration,0),distance:legs.reduce((sum,l)=>sum+l.distance,0),legs};
  }
  async function calculate(ids){
    const mode=el('#map-mode').value;
    invalidate();
    if(ids.length<2){el('#map-status').textContent='請先在「我的行程」收藏至少兩個地點。';return;}
    if(ids.some((id,index)=>index&&id===ids[index-1])){el('#map-status').textContent='起點與終點相同，請選擇兩個不同的地點。';return;}
    const fallback=tableRoute(ids,mode);if(fallback)showResult(fallback,ids,mode,true);
    const version=requestVersion;
    controller=new AbortController();const signal=controller.signal;
    const key=mode+':'+ids.join(',');
    const buttons=[el('#map-calculate'),el('#map-load-trip')];buttons.forEach(b=>b.disabled=true);
    el('#map-status').textContent=fallback?'已顯示道路時間表估算，正在載入路線圖…':'正在計算道路路線與預估時間…';el('#map-status').setAttribute('aria-busy','true');
    try {
      let route=cache.get(key);
      if(!route){
        const delay=Math.max(0,1100-(Date.now()-lastRequest));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
        if(signal.aborted)return;lastRequest=Date.now();
        const coords=ids.map(id=>[coordinates[id][1],coordinates[id][0]].join(',')).join(';');
        const timeout=setTimeout(()=>controller?.abort(),20000);
        const base=mode==='car'?'https://router.project-osrm.org/route/v1/driving/':`https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/`;
        let response;try{response=await fetch(`${base}${coords}?overview=full&geometries=geojson&steps=false`,{signal});}finally{clearTimeout(timeout);}
        if(!response.ok)throw Error('network');const data=await response.json();
        route=data.routes?.[0];if(data.code!=='Ok'||!route||!Number.isFinite(route.duration)||!Number.isFinite(route.distance)||route.legs?.length!==ids.length-1)throw Error('route');
        cache.set(key,route);
      }
      if(version!==requestVersion)return;
      showResult(route,ids,mode);el('#map-status').textContent='已完成道路估算・不含即時路況與停留時間。';
    }catch{
      if(version!==requestVersion)return;
      if(fallback){el('#map-status').textContent='已顯示道路時間表估算；路線圖暫時無法載入，可用 Google 地圖導航。';return;}
      el('#map-status').textContent='暫時無法取得路線時間，請稍後重試，或使用 Google 地圖查看。';
      const link=document.createElement('a');link.href=googleLink(ids,mode);link.target='_blank';link.rel='noopener noreferrer';link.className='map-google';link.textContent='改用 Google 地圖查詢 ↗';el('#map-result').replaceChildren(link);el('#map-result').hidden=false;
    }finally{buttons.forEach(b=>b.disabled=false);el('#map-status').removeAttribute('aria-busy');}
  }
  el('#map-calculate').onclick=()=>calculate([el('#map-from').value,el('#map-to').value]);
  el('#map-load-trip').onclick=()=>{if(selected.length>=2){el('#map-from').value=selected[0];el('#map-to').value=selected.at(-1);}calculate([...selected]);};
  function openOnMap(id){
    for(const d of document.querySelectorAll('dialog[open]'))d.close();
    if(el('#map-from').value===id)el('#map-from').value=places.find(p=>p.id!==id).id;
    el('#map-to').value=id;invalidate();section.scrollIntoView({block:'start'});
    if(map){map.invalidateSize();map.setView(coordinates[id],12);markers.get(id)?.openPopup();}
    el('#map-status').textContent=`已選擇${byId(id).title}為目的地，選好出發地後按計算。`;
  }
  function addMapButtons(){
    document.querySelectorAll('#cards .card').forEach(card=>{
      if(card.querySelector('[data-map-id]'))return;const id=card.querySelector('[data-detail]')?.dataset.detail;if(!id)return;
      const button=document.createElement('button');button.type='button';button.className='map-card-button';button.dataset.mapId=id;button.textContent='⌖ 在地圖看交通時間';card.querySelector('.card-info').append(button);
    });
    const detailBody=document.querySelector('#detail-content .detail-body');
    if(detailBody&&!detailBody.querySelector('[data-map-id]')&&currentId){const button=document.createElement('button');button.type='button';button.className='map-card-button';button.dataset.mapId=currentId;button.textContent='⌖ 選擇出發地，計算到這裡的時間';detailBody.querySelector('.detail-actions').after(button);}
  }
  new MutationObserver(addMapButtons).observe(document.querySelector('#cards'),{childList:true});
  new MutationObserver(addMapButtons).observe(document.querySelector('#detail-content'),{childList:true});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-map-id]');if(button)openOnMap(button.dataset.mapId);});
  for(const nav of [document.querySelector('.header nav'),document.querySelector('.mobile-nav')]){const link=document.createElement('a');link.href='#travel-map';link.textContent='地圖';if(nav.classList.contains('mobile-nav'))link.innerHTML='<span aria-hidden="true" class="map-nav-icon">⌖</span>地圖';nav.append(link);}
  addMapButtons();
})();
