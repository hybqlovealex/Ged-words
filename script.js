const DATA_URL='data.json';
const STORAGE_KEY='ged_trainer_progress_v1';
let data = {}, list = [];

function toast(msg){ const el=document.getElementById('toast'); el.innerText=msg; el.style.display='block'; setTimeout(()=>el.style.display='none',2000); }

async function load(){ try{ const r=await fetch(DATA_URL); data = await r.json(); list = Object.keys(data).map(k=>({en:k, ...data[k]})); restoreProgress(); renderList(list.slice(0,200)); } catch(e){ toast('加载词库失败'); console.error(e);} }

function restoreProgress(){ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw){ const stored=JSON.parse(raw); // merge counts
  for(const w of list){ const s = stored[w.en]; if(s){ w.correct = s.correct||w.correct; w.wrong = s.wrong||w.wrong; } }
 }}catch(e){} }

function saveProgress(){ try{ const out={}; for(const w of list){ out[w.en] = {correct:w.correct||0, wrong:w.wrong||0}; } localStorage.setItem(STORAGE_KEY, JSON.stringify(out)); }catch(e){} }

function renderList(items){ const el=document.getElementById('wordList'); if(!items||items.length===0){ el.innerHTML='<div class="small">无匹配词条</div>'; return; } el.innerHTML = items.map(w=>`<div class="word-row"><div><strong>${escapeHtml(w.en)}</strong><div class="meta">${escapeHtml(w.cn||'')}</div><div class="small">例：${escapeHtml(w.example_en)}</div></div><div class="meta">${w.correct||0}✓ ${w.wrong||0}✗</div></div>`).join(''); }

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

document.getElementById('btnShowAll').addEventListener('click', ()=>renderList(list));
document.getElementById('btnExport').addEventListener('click', ()=>{
  const rows = list.map(w=>`"${(w.cn||'').replace(/"/g,'""')}","${(w.en||'').replace(/"/g,'""')}","${(w.example_en||'').replace(/"/g,'""')}","${(w.example_cn||'').replace(/"/g,'""')}"`);
  const csv = '中文,英文,例句(EN),例句(CN)\n' + rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='ged_words.csv'; a.click();
  toast('已导出 CSV');
});

document.getElementById('btnFlash').addEventListener('click', ()=>{
  if(list.length===0){ toast('词库空'); return; }
  const w = list[Math.floor(Math.random()*list.length)];
  document.getElementById('playArea').innerHTML = `<div class="card"><h2>${escapeHtml(w.en)}</h2><p class="small">${escapeHtml(w.cn||'')}</p><p class="small">例：${escapeHtml(w.example_en)}</p><p class="small">中：${escapeHtml(w.example_cn)}</p></div>`;
});

document.getElementById('btnWrong').addEventListener('click', ()=>{
  const wrong = list.filter(w=>w.wrong && w.wrong>0);
  if(wrong.length===0){ toast('错题本为空'); return; }
  renderList(wrong);
  toast('显示错题本');
});

document.getElementById('btnQuizCE').addEventListener('click', ()=>startQuiz('cn2en'));
document.getElementById('btnQuizEC').addEventListener('click', ()=>startQuiz('en2cn'));

function startQuiz(mode){
  if(list.length===0){ toast('词库空'); return; }
  const pool = list.slice().sort(()=>Math.random()-0.5);
  let i=0, score=0;
  const area = document.getElementById('playArea');
  const ask = ()=>{
    if(i>=pool.length){ area.innerHTML=`<div class="small">完成！得分 ${score}/${pool.length}</div>`; saveProgress(); return; }
    const w = pool[i];
    if(mode==='cn2en'){
      area.innerHTML = `<div class="card"><div class="small">中文：${escapeHtml(w.cn||'')}</div><input id="ans" placeholder="输入英文拼写"/><div style="margin-top:8px"><button id="submit" class="btn">提交</button></div><div id="res" class="small"></div></div>`;
    } else {
      area.innerHTML = `<div class="card"><div class="small">英文：${escapeHtml(w.en)}</div><input id="ans" placeholder="输入中文释义"/><div style="margin-top:8px"><button id="submit" class="btn">提交</button></div><div id="res" class="small"></div></div>`;
    }
    document.getElementById('submit').onclick = ()=>{
      const a = document.getElementById('ans').value.trim();
      let ok=false;
      if(mode==='cn2en'){ ok = a.toLowerCase() === (w.en||'').toLowerCase(); }
      else { ok = a === (w.cn||''); }
      if(ok){ score++; w.correct=(w.correct||0)+1; document.getElementById('res').innerText='正确'; toast('回答正确'); }
      else { w.wrong=(w.wrong||0)+1; document.getElementById('res').innerText='错误，答案：'+(mode==='cn2en'?w.en:w.cn); toast('回答错误'); }
      i++; ask();
    };
  };
  ask();
}

document.getElementById('search').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ const q = e.target.value.trim().toLowerCase(); if(!q) renderList(list); else { const res = list.filter(w=> (w.en||'').toLowerCase().includes(q) || (w.cn||'').toLowerCase().includes(q)); renderList(res); } }
});

load();
