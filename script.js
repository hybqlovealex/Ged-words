let words=[];
fetch('data.json').then(r=>r.json()).then(j=>{words=j;});
function showAll(){
  let c=document.getElementById('content');
  c.innerHTML=words.map(w=>`${w.en} - ${w.cn}<br>例: ${w.example_en}<br>中: ${w.example_cn}`).join("<hr>");
}
function flash(){
  let w=words[Math.floor(Math.random()*words.length)];
  document.getElementById('content').innerHTML=`<h2>${w.en}</h2><p>${w.cn}</p>`;
}
function quizCN(){
  let w=words[Math.floor(Math.random()*words.length)];
  let ans=prompt("中文："+w.cn+"\n请输入英文：");
  document.getElementById('content').innerHTML = (ans&&ans.toLowerCase()==w.en.toLowerCase())?"正确":"错误，正确答案："+w.en;
}
function quizEN(){
  let w=words[Math.floor(Math.random()*words.length)];
  let ans=prompt("英文："+w.en+"\n请输入中文：");
  document.getElementById('content').innerHTML = (ans&&ans==w.cn)?"正确":"错误，正确答案："+w.cn;
}
document.getElementById('btnShowAll').onclick=showAll;
document.getElementById('btnFlash').onclick=flash;
document.getElementById('btnQuizCN').onclick=quizCN;
document.getElementById('btnQuizEN').onclick=quizEN;
