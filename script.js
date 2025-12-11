const DATA_URL='data.json';
let data={}, list=[];
const STORAGE_KEY='ged_trainer_final_v1';

function toast(msg){ const t=document.getElementById('toast'); t.innerText=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',1800); }

async function load(){ try{ const r=await fetch(DATA_URL); data=await r.json(); list=Object.keys(data).map(k=>({en:k, ...data[k]})); restore(); renderList(list.slice(0,200)); }catch(e){ console.error(e); toast('加载词库失败'); } }

function restore(){ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw){ const obj=JSON.parse(raw); for(const w of list){ if(obj[w.en]){ w.correct=obj[w.en].correct||0; w.wrong=obj[w.en].wrong||0; } } } }catch(e){} }

function save(){ try{ const out={}; for(const w of list){ out[w.en]={correct:w.correct||0, wrong:w.wrong||0}; } localStorage.setItem(STORAGE_KEY, JSON.stringify(out)); }catch(e){} }

function renderList(arr){ const el=document.getElementById('wordList'); if(!arr||arr.length===0){ el.innerHTML='<div class="small">无匹配</div>'; return; } el.innerHTML = arr.map(w=>`<div class="word-row"><div><strong>${escape(w.en)}</strong><div class="small">${escape(w.cn)}</div><div class="small">例：${escape(w.example_en)}</div></div><div class="small">${w.correct||0}✓ ${w.wrong||0}✗</div></div>`).join(''); }

function escape(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

document.getElementById('btnShowAll').onclick = ()=> renderList(list);
document.getElementById('btnExport').onclick = ()=>{
  const rows = list.map(w=>`"${(w.cn||'').replace(/"/g,'""')}","${(w.en||'').replace(/"/g,'""')}","${(w.example_en||'').replace(/"/g,'""')}"`);
  const csv='中文,英文,例句\n'+rows.join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ged_words.csv'; a.click(); toast('已导出 CSV');
};

document.getElementById('btnFlash').onclick = ()=>{
  if(list.length===0){ toast('词库为空'); return; }
  const w=list[Math.floor(Math.random()*list.length)];
  document.getElementById('playArea').innerHTML = `<div class="card"><h2>${escape(w.en)}</h2><p class="small">${escape(w.cn)}</p><p class="small">例：${escape(w.example_en)}</p></div>`;
};

document.getElementById('btnQuizEN').onclick = ()=> startQuiz('en2cn');
document.getElementById('btnQuizCN').onclick = ()=> startQuiz('cn2en');
document.getElementById('btnMatch').onclick = ()=> startMatch();

function startQuiz(mode){
  if(list.length===0){ toast('词库为空'); return; }
  const pool = list.slice().sort(()=>Math.random()-0.5).slice(0,30);
  let i=0, score=0;
  const area=document.getElementById('playArea');
  const ask = ()=>{
    if(i>=pool.length){ area.innerHTML=`<div class="small">完成！得分 ${score}/${pool.length}</div>`; save(); return; }
    const w=pool[i];
    if(mode==='en2cn'){
      const correct = w.cn;
      let opts=[correct];
      while(opts.length<4){
        const r = list[Math.floor(Math.random()*list.length)].cn;
        if(!opts.includes(r)) opts.push(r);
      }
      opts.sort(()=>Math.random()-0.5);
      area.innerHTML = `<div class="card"><div class="small">英文：${escape(w.en)}</div><div class="choice">`+opts.map(o=>`<button class="opt">${escape(o)}</button>`).join('')+`</div></div>`;
      Array.from(area.querySelectorAll('.opt')).forEach(b=>b.onclick=()=>{ if(b.innerText===correct){ score++; w.correct=(w.correct||0)+1; toast('回答正确'); } else { w.wrong=(w.wrong||0)+1; toast('回答错误：'+correct); } i++; ask(); });
    } else {
      const correct = w.en;
      let opts=[correct];
      while(opts.length<4){
        const r = list[Math.floor(Math.random()*list.length)].en;
        if(!opts.includes(r)) opts.push(r);
      }
      opts.sort(()=>Math.random()-0.5);
      area.innerHTML = `<div class="card"><div class="small">中文：${escape(w.cn)}</div><div class="choice">`+opts.map(o=>`<button class="opt">${escape(o)}</button>`).join('')+`</div></div>`;
      Array.from(area.querySelectorAll('.opt')).forEach(b=>b.onclick=()=>{ if(b.innerText===correct){ score++; w.correct=(w.correct||0)+1; toast('回答正确'); } else { w.wrong=(w.wrong||0)+1; toast('回答错误：'+correct); } i++; ask(); });
    }
  };
  ask();
}

function startMatch(){
  if(list.length===0){ toast('词库为空'); return; }
  const pool = list.slice().sort(()=>Math.random()-0.5).slice(0,8);
  const left = pool.map(w=>w.en);
  const right = pool.map(w=>w.cn).sort(()=>Math.random()-0.5);
  const area=document.getElementById('playArea');
  area.innerHTML = `<div class="match-grid"><div class="col" id="colL">${left.map(l=>`<div class="item" data-v="${l}">${escape(l)}</div>`).join('')}</div><div class="col" id="colR">${right.map(r=>`<div class="item" data-v="${r}">${escape(r)}</div>`).join('')}</div></div><div id="matchRes" class="small"></div>`;
  let sel=null, matches=0;
  area.querySelectorAll('.col .item').forEach(it=>it.onclick=()=>{
    if(it.parentElement.id==='colL'){ sel = {side:'L', val: it.dataset.v}; it.style.outline='2px solid var(--accent)'; }
    else if(sel && it.parentElement.id==='colR'){ // check match
      const leftVal = sel.val;
      const rightVal = it.dataset.v;
      const correct = list.find(w=>w.en===leftVal).cn;
      if(rightVal===correct){ it.style.opacity=0.5; const elL=Array.from(document.querySelectorAll('#colL .item')).find(x=>x.dataset.v===leftVal); elL.style.opacity=0.5; document.getElementById('matchRes').innerText='匹配正确'; matches++; if(matches>=left.length){ toast('全部匹配完成！'); } }
      else { toast('匹配错误'); }
      sel=null;
      // clear outlines
      document.querySelectorAll('.col .item').forEach(x=>x.style.outline='none');
    }
  });
}

document.getElementById('search').addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ const q=e.target.value.trim().toLowerCase(); if(!q) renderList(list); else{ const res=list.filter(w=> (w.en||'').toLowerCase().includes(q) || (w.cn||'').toLowerCase().includes(q)); renderList(res); } } });

load();
