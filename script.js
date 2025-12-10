// Simple GED trainer JS
const STORAGE_KEY = 'ged_site_rebuilt_words_v1';
let words = [];
let filtered = [];

function showBottom(msg, tone){
  const el = document.getElementById('bottomHint');
  el.innerText = msg; el.style.display='block';
  setTimeout(()=> el.style.display='none', 3000);
}

async function loadPreloaded(){
  try{
    const resp = await fetch('data.json');
    if(!resp.ok) throw 'no data';
    const pre = await resp.json();
    // repair localStorage if invalid or absent
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed) && parsed.length>0){
          words = parsed;
          return;
        }
      }
    }catch(e){}
    words = pre;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }catch(e){
    showBottom('加载词库失败','err');
    words = [];
  }
}

function renderList(list){
  const el = document.getElementById('wordList');
  if(!list || list.length===0){ el.innerHTML = '<div class="small">无匹配词条</div>'; return; }
  el.innerHTML = list.map((w,i)=>`<div class="word-row"><div><strong>${escapeHtml(w.cn||'')}</strong> — ${escapeHtml(w.en||'')}<div class="small" style="color:#9aa4b2;margin-top:6px">例：${escapeHtml(w.example_en)}<br/>中：${escapeHtml(w.example_cn)}</div></div><div class="small">${w.correct||0}✓ ${w.wrong||0}✗</div></div>`).join('');
}

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(words)); }catch(e){ console.error('save failed', e); } }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

async function init(){
  await loadPreloaded();
  filtered = words.slice();
  renderList(filtered);
  document.getElementById('btnShowAll').addEventListener('click', ()=>{ filtered = words.slice(); renderList(filtered); });
  document.getElementById('btnExport').addEventListener('click', exportCsv);
  document.getElementById('search').addEventListener('keydown', function(e){
    if(e.key==='Enter'){
      const q=this.value.trim().toLowerCase();
      if(!q){ filtered = words.slice(); renderList(filtered); return; }
      filtered = words.filter(w => (w.cn||'').toLowerCase().includes(q) || (w.en||'').toLowerCase().includes(q));
      renderList(filtered);
    }
  });
  document.getElementById('btnFlash').addEventListener('click', startFlash);
  document.getElementById('btnQuizCE').addEventListener('click', ()=>startQuiz('cn','en'));
  document.getElementById('btnQuizEC').addEventListener('click', ()=>startQuiz('en','cn'));
  document.getElementById('btnWrite').addEventListener('click', startWrite);
}

function exportCsv(){
  const rows = words.map(w=>`"${(w.cn||'').replace(/"/g,'""')}","${(w.en||'').replace(/"/g,'""')}","${(w.example_en||'').replace(/"/g,'""')}","${(w.example_cn||'').replace(/"/g,'""')}\``);
  const csv = '中文,英文,例句(EN),例句(CN)\n'+rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='ged_preloaded.csv'; a.click(); URL.revokeObjectURL(url);
  showBottom('已导出 CSV');
}

function startFlash(){
  if(!words || words.length===0){ showBottom('词库为空','err'); return; }
  let idx=0;
  const area = document.getElementById('playArea'); area.innerHTML='';
  const cn = document.createElement('div'); cn.style.fontSize='22px'; cn.style.marginBottom='8px';
  const en = document.createElement('div'); en.style.marginBottom='8px';
  const ex = document.createElement('div'); ex.className='small'; ex.style.color='#9aa4b2';
  const flip = document.createElement('button'); flip.className='btn'; flip.innerText='翻转';
  const next = document.createElement('button'); next.className='btn'; next.innerText='下一题';
  area.appendChild(cn); area.appendChild(en); area.appendChild(ex); area.appendChild(flip); area.appendChild(next);
  function show(){ const w = words[idx % words.length]; cn.innerText = w.cn || ''; en.innerText = '（点击翻转查看英文）'; ex.innerText = ''; }
  flip.onclick = ()=>{ const w = words[idx % words.length]; en.innerText = w.en; ex.innerText = '例：'+(w.example_en||'')+'\n中：'+(w.example_cn||''); }
  next.onclick = ()=>{ idx++; show(); }
  show();
}

function startQuiz(from,to){
  if(!words || words.length===0){ showBottom('词库为空','err'); return; }
  const pool = words.slice(); shuffle(pool);
  let q=0, score=0;
  const area = document.getElementById('playArea'); area.innerHTML='';
  const stat = document.createElement('div'); stat.className='small'; stat.style.marginBottom='8px'; area.appendChild(stat);
  const prompt = document.createElement('div'); prompt.style.fontSize='22px'; prompt.style.marginBottom='8px'; area.appendChild(prompt);
  const choicesDiv = document.createElement('div'); area.appendChild(choicesDiv);
  const nextBtn = document.createElement('button'); nextBtn.className='btn'; nextBtn.innerText='下一题'; nextBtn.style.display='none'; area.appendChild(nextBtn);
  function updateStat(){ stat.innerText = `题 ${q+1} / ${pool.length}    得分 ${score}`; }
  function ask(){
    if(q>=pool.length){ area.innerHTML = `<div class="small">完成！得分 ${score}/${pool.length}</div>`; return; }
    updateStat();
    const w = pool[q];
    prompt.innerText = from==='cn' ? (w.cn || '') : (w.en || '');
    choicesDiv.innerHTML=''; nextBtn.style.display='none';
    const choices = [w[to]];
    while(choices.length<4){
      const c = pool[Math.floor(Math.random()*pool.length)][to];
      if(choices.indexOf(c)===-1) choices.push(c);
    }
    shuffle(choices);
    choices.forEach(c=>{
      const d = document.createElement('div'); d.className='choice'; d.innerText=c;
      d.onclick = ()=>{
        Array.from(choicesDiv.children).forEach(ch=> ch.style.pointerEvents='none');
        if(c===w[to]){ d.classList.add('correct'); score++; w.correct=(w.correct||0)+1; save(); showBottom('回答正确','ok'); }
        else{ d.classList.add('wrong'); w.wrong=(w.wrong||0)+1; save(); Array.from(choicesDiv.children).forEach(ch=>{ if(ch.innerText===w[to]) ch.classList.add('correct'); }); showBottom('回答错误 — 正确答案：'+w[to],'err'); }
        nextBtn.style.display='inline-block';
      };
      choicesDiv.appendChild(d);
    });
  }
  nextBtn.onclick = ()=>{ q++; ask(); updateStat(); };
  ask();
}

function startWrite(){
  if(!words || words.length===0){ showBottom('词库为空','err'); return; }
  const pool = words.slice(); shuffle(pool);
  let idx=0, score=0;
  const area = document.getElementById('playArea'); area.innerHTML='';
  const stat = document.createElement('div'); stat.className='small'; stat.style.marginBottom='8px'; area.appendChild(stat);
  const prompt = document.createElement('div'); prompt.style.fontSize='22px'; prompt.style.marginBottom='8px'; area.appendChild(prompt);
  const input = document.createElement('input'); input.className='input'; input.style.marginBottom='8px'; area.appendChild(input);
  const submit = document.createElement('button'); submit.className='btn'; submit.innerText='提交'; area.appendChild(submit);
  const nextBtn = document.createElement('button'); nextBtn.className='btn'; nextBtn.innerText='下一题'; nextBtn.style.display='none'; area.appendChild(nextBtn);
  function updateStat(){ stat.innerText = `题 ${idx+1} / ${pool.length}    得分 ${score}`; }
  function ask(){
    if(idx>=pool.length){ area.innerHTML = `<div class="small">完成！得分 ${score}/${pool.length}</div>`; return; }
    updateStat();
    const w = pool[idx];
    prompt.innerText = '中文：' + (w.cn||'');
    input.value=''; submit.style.display='inline-block'; nextBtn.style.display='none';
    submit.onclick = ()=>{
      const a = input.value.trim().toLowerCase();
      const correct = (w.en||'').trim().toLowerCase();
      if(a===correct){ score++; w.correct=(w.correct||0)+1; save(); showBottom('回答正确','ok'); }
      else{ w.wrong=(w.wrong||0)+1; save(); showBottom('回答错误 — 正确答案：'+w.en,'err'); }
      submit.style.display='none'; nextBtn.style.display='inline-block';
    };
  }
  nextBtn.onclick = ()=>{ idx++; ask(); };
  ask();
}

window.addEventListener('DOMContentLoaded', init);
