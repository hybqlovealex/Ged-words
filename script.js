let words = {};
let learned = {};      // word -> level 1-5
let wrongBook = [];    // 错题本
let seen = {};         // word -> true 已出现过
let schedule = {};     // word -> 下一次出现时间戳(ms)
let stats = {
  totalSeen: 0,
  totalCorrect: 0
};
let currentTheme = "light";

const STORAGE_KEY = "ged_vocab_state_srs_v2"; // 新版本key，避免和旧版本冲突

const ROOT_MAP = {
  tele: "tele-：远，如 telephone（电话）、television（电视）",
  micro: "micro-：微小，如 microscope（显微镜）",
  bio: "bio-：生命，如 biology（生物学）",
  geo: "geo-：地球，如 geography（地理）",
  auto: "auto-：自己，如 autobiography（自传）",
  anti: "anti-：反，对抗，如 antibiotic（抗生素）",
  sub: "sub-：在下面、次，如 subway（地铁）",
  trans: "trans-：跨越、转变，如 transport（运输）、transform（转变）",
  inter: "inter-：在……之间，如 international（国际的）",
  uni: "uni-：一，如 uniform（制服）、unique（独一无二的）",
  multi: "multi-：多，如 multinational（跨国的）",
  pre: "pre-：在前，如 preview（预览）、predict（预言）",
  re: "re-：再、回，如 review（复习）、return（返回）",
  spect: "spect：看，如 inspect（检查）、respect（尊重）",
  struct: "struct：建造，如 construct（建造）、structure（结构）",
  scrib: "scrib/script：写，如 describe（描述）、manuscript（手稿）",
  graph: "graph：写、画，如 paragraph（段落）、photograph（照片）",
  phon: "phon：声音，如 telephone（电话）、microphone（麦克风）",
  port: "port：携带，如 transport（运输）、import（进口）",
  dict: "dict：说，如 predict（预言）、dictionary（词典）",
  vis: "vis/vid：看，如 visible（可见的）、evidence（证据）"
};

const INTERVALS = {
  1: 0,
  2: 2 * 60 * 1000,
  3: 10 * 60 * 1000,
  4: 24 * 60 * 60 * 1000,
  5: 7 * 24 * 60 * 60 * 1000
};

async function loadWords() {
  const res = await fetch("words.json");
  words = await res.json();
}

function initDefaultState() {
  learned = {};
  wrongBook = [];
  seen = {};
  schedule = {};
  stats = { totalSeen: 0, totalCorrect: 0 };
  currentTheme = "light";
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      initDefaultState();
    } else {
      const state = JSON.parse(raw);
      learned = state.learned || {};
      wrongBook = Array.isArray(state.wrongBook) ? state.wrongBook : [];
      seen = state.seen || {};
      schedule = state.schedule || {};
      stats = state.stats || { totalSeen: 0, totalCorrect: 0 };
      currentTheme = state.theme || "light";
      applyTheme(currentTheme, false);
    }
  } catch (e) {
    console.error("加载本地数据失败", e);
    initDefaultState();
  } finally {
    Object.keys(words).forEach(w => {
      if (!learned[w]) learned[w] = 1;
    });
  }
}

function saveState() {
  try {
    const state = {
      learned,
      wrongBook,
      seen,
      schedule,
      stats,
      theme: currentTheme
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("保存本地数据失败", e);
  }
}

function applyTheme(theme, doSave = true) {
  currentTheme = theme;
  if (theme === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");
  if (doSave) saveState();
}

function toggleTheme() {
  const next = currentTheme === "light" ? "dark" : "light";
  applyTheme(next);
}

// 通用：智能选词（全体）
function pickWord() {
  const now = Date.now();
  const keys = Object.keys(words);
  const due = keys.filter(w => !schedule[w] || schedule[w] <= now);
  let pool = due;
  if (pool.length === 0) {
    const SOFT = 5 * 60 * 1000;
    pool = keys.filter(w => !schedule[w] || schedule[w] <= now + SOFT);
  }
  if (pool.length === 0) pool = keys;

  const weighted = [];
  for (const w of pool) {
    const lv = learned[w] || 1;
    const weight = 6 - lv;
    for (let i = 0; i < weight; i++) weighted.push(w);
  }
  const chosen =
    weighted.length > 0
      ? weighted[Math.floor(Math.random() * weighted.length)]
      : pool[Math.floor(Math.random() * pool.length)];

  if (!seen[chosen]) seen[chosen] = true;
  return chosen;
}

// 单练模式：只从未掌握（等级 < 4）的词中选
function pickUnmasteredWord() {
  const now = Date.now();
  const all = Object.keys(words).filter(w => (learned[w] || 1) < 4);
  if (all.length === 0) return null;

  const due = all.filter(w => !schedule[w] || schedule[w] <= now);
  let pool = due.length ? due : all;

  const weighted = [];
  for (const w of pool) {
    const lv = learned[w] || 1;
    const weight = 6 - lv;
    for (let i = 0; i < weight; i++) weighted.push(w);
  }
  const chosen =
    weighted.length > 0
      ? weighted[Math.floor(Math.random() * weighted.length)]
      : pool[Math.floor(Math.random() * pool.length)];

  if (!seen[chosen]) seen[chosen] = true;
  return chosen;
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function updateSummary() {
  const bar = document.getElementById("summary-bar");
  if (!bar) return;
  const total = Object.keys(words).length;
  const seenCount = Object.keys(seen).length;
  let mastered = 0;
  let learning = 0;
  for (const w in learned) {
    const lv = learned[w] || 1;
    if (lv >= 4) mastered++;
    else learning++;
  }
  const unseen = total - seenCount;
  const acc =
    stats.totalSeen === 0
      ? 0
      : Math.round((stats.totalCorrect * 100) / stats.totalSeen);

  bar.innerHTML = `
    <span>总词数：${total}</span>
    <span>已接触：${seenCount}</span>
    <span>已掌握(≥4级)：${mastered}</span>
    <span>学习中(1-3级)：${learning}</span>
    <span>未见：${unseen}</span>
    <span>正确率：${acc}%</span>
  `;
}

function showMenu() {
  document.getElementById("app").innerHTML = `
    <button onclick="quizEnglish()">英 -> 中 选择题</button>
    <button onclick="quizChinese()">中 -> 英 选择题</button>
    <button onclick="flashcard()">闪卡</button>
    <button onclick="matching()">英中连连看</button>
    <button onclick="showStats()">熟练度统计</button>
    <button onclick="showWrongBook()">错题本</button>
    <button onclick="quizUnmastered()">单练模式（只练未掌握）</button>
  `;
  showRootInfo("");
  updateSummary();
}

function scheduleNext(word, isCorrect) {
  const now = Date.now();
  const current = learned[word] || 1;
  let nextLevel = current;
  if (isCorrect) nextLevel = Math.min(5, current + 1);
  else nextLevel = Math.max(1, current - 1);
  learned[word] = nextLevel;
  if (!isCorrect) {
    schedule[word] = now + 30 * 1000;
  } else {
    const base = INTERVALS[nextLevel] || 0;
    schedule[word] = now + base;
  }
}

function quizEnglish() {
  const word = pickWord();
  const correct = words[word];
  let options = [correct];
  while (options.length < 4 && Object.keys(words).length > options.length) {
    const rnd = words[pickWord()];
    if (!options.includes(rnd)) options.push(rnd);
  }
  shuffle(options);
  document.getElementById("app").innerHTML =
    `<h2>${word}</h2>` +
    options
      .map(
        o =>
          `<div class="option" onclick="checkAnswer('${word}', '${o.replace(/'/g,"&#39;")}', '${correct.replace(/'/g,"&#39;")}', 'en2zh')">${o}</div>`
      )
      .join("") +
    `<button onclick="showMenu()">返回</button>`;
  showRootInfo(word);
}

function quizChinese() {
  const word = pickWord();
  const correct = word;
  let options = [correct];
  while (options.length < 4 && Object.keys(words).length > options.length) {
    const rnd =
      Object.keys(words)[
        Math.floor(Math.random() * Object.keys(words).length)
      ];
    if (!options.includes(rnd)) options.push(rnd);
  }
  shuffle(options);
  document.getElementById("app").innerHTML =
    `<h2>${words[word]}</h2>` +
    options
      .map(
        o =>
          `<div class="option" onclick="checkAnswer('${word}', '${o.replace(/'/g,"&#39;")}', '${correct.replace(/'/g,"&#39;")}', 'zh2en')">${o}</div>`
      )
      .join("") +
    `<button onclick="showMenu()">返回</button>`;
  showRootInfo(word);
}

// 单练模式：只练未掌握（英->中）
function quizUnmastered() {
  const word = pickUnmasteredWord();
  const app = document.getElementById("app");
  if (!word) {
    app.innerHTML = `
      <h2>单练模式</h2>
      <p>太厉害啦！当前没有等级小于 4 的未掌握单词可以单练了。</p>
      <button onclick="showMenu()">返回</button>
    `;
    showRootInfo("");
    updateSummary();
    return;
  }
  const correct = words[word];
  let options = [correct];
  while (options.length < 4 && Object.keys(words).length > options.length) {
    const rnd = words[pickUnmasteredWord() || pickWord()];
    if (!options.includes(rnd)) options.push(rnd);
  }
  shuffle(options);
  app.innerHTML =
    `<h2>${word}（单练模式）</h2>` +
    options
      .map(
        o =>
          `<div class="option" onclick="checkAnswer('${word}', '${o.replace(/'/g,"&#39;")}', '${correct.replace(/'/g,"&#39;")}', 'unmastered')">${o}</div>`
      )
      .join("") +
    `<button onclick="showMenu()">返回</button>`;
  showRootInfo(word);
}

function checkAnswer(word, chosen, correct, mode) {
  chosen = chosen.replace(/&#39;/g, "'");
  correct = correct.replace(/&#39;/g, "'");
  stats.totalSeen += 1;
  if (chosen === correct) {
    alert("答对啦！");
    stats.totalCorrect += 1;
    scheduleNext(word, true);
  } else {
    alert("答错了！");
    scheduleNext(word, false);
    if (!wrongBook.includes(word)) wrongBook.push(word);
  }
  saveState();
  updateSummary();
  if (mode === "en2zh") quizEnglish();
  else if (mode === "zh2en") quizChinese();
  else if (mode === "unmastered") quizUnmastered();
}

function flashcard(specifiedWord) {
  const word = specifiedWord || pickWord();
  if (!seen[word]) seen[word] = true;
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="flashcard-container">
      <div class="flashcard-3d" id="flashcard" onclick="flipFlashcard()">
        <div class="flash-inner">
          <div class="flash-face flash-front">${word}</div>
          <div class="flash-face flash-back">${words[word]}</div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;">
      <button onclick="flashcard()">下一个</button>
      <button onclick="showMenu()">返回</button>
    </div>
  `;
  showRootInfo(word);
  updateSummary();
}

function flipFlashcard() {
  const card = document.getElementById("flashcard");
  if (card) card.classList.toggle("flipped");
}

let matchState = {
  selectedL: null,
  selectedLWord: null,
  selectedR: null,
  selectedRText: null
};

function matching() {
  const keys = shuffle(Object.keys(words)).slice(0, 6);
  const left = keys;
  const right = shuffle(keys.map(w => words[w]));
  const app = document.getElementById("app");
  matchState = {
    selectedL: null,
    selectedLWord: null,
    selectedR: null,
    selectedRText: null
  };
  let html = `<h2>英中连连看</h2><div class="match-grid">`;
  html += left
    .map(
      w =>
        `<div class="match-item" onclick="selectLeft(this, '${w}')">${w}</div>`
    )
    .join("");
  html += right
    .map(
      c =>
        `<div class="match-item" onclick="selectRight(this, '${c.replace(/'/g,"&#39;")}')">${c}</div>`
    )
    .join("");
  html += `</div><button onclick="showMenu()">返回</button>`;
  app.innerHTML = html;
  showRootInfo("");
  updateSummary();
}

function selectLeft(el, word) {
  if (el.classList.contains("correct")) return;
  if (matchState.selectedL) matchState.selectedL.classList.remove("selected");
  matchState.selectedL = el;
  matchState.selectedLWord = word;
  el.classList.add("selected");
  tryMatch();
}

function selectRight(el, text) {
  if (el.classList.contains("correct")) return;
  if (matchState.selectedR) matchState.selectedR.classList.remove("selected");
  matchState.selectedR = el;
  matchState.selectedRText = text.replace(/&#39;/g,"'");
  el.classList.add("selected");
  tryMatch();
}

function tryMatch() {
  if (
    !matchState.selectedL ||
    !matchState.selectedR ||
    !matchState.selectedLWord ||
    !matchState.selectedRText
  ) return;
  const correctMeaning = words[matchState.selectedLWord];
  if (correctMeaning === matchState.selectedRText) {
    matchState.selectedL.classList.remove("selected");
    matchState.selectedR.classList.remove("selected");
    matchState.selectedL.classList.add("correct");
    matchState.selectedR.classList.add("correct");
    scheduleNext(matchState.selectedLWord, true);
  } else {
    matchState.selectedL.classList.add("wrong");
    matchState.selectedR.classList.add("wrong");
    scheduleNext(matchState.selectedLWord, false);
    if (!wrongBook.includes(matchState.selectedLWord)) {
      wrongBook.push(matchState.selectedLWord);
    }
    setTimeout(() => {
      matchState.selectedL.classList.remove("wrong", "selected");
      matchState.selectedR.classList.remove("wrong", "selected");
    }, 600);
  }
  saveState();
  updateSummary();
  matchState.selectedL = null;
  matchState.selectedR = null;
  matchState.selectedLWord = null;
  matchState.selectedRText = null;
}

function showWrongBook() {
  const app = document.getElementById("app");
  if (wrongBook.length === 0) {
    app.innerHTML = `<h2>错题本</h2><p>目前还没有错题，太棒啦！</p><button onclick="showMenu()">返回</button>`;
    return;
  }
  app.innerHTML =
    "<h2>错题本</h2><ul>" +
    wrongBook
      .map(w => `<li>${w} - ${words[w] || ""}</li>`)
      .join("") +
    "</ul><button onclick='showMenu()'>返回</button>";
}

function showStats() {
  const app = document.getElementById("app");
  const total = Object.keys(words).length;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let w in learned) {
    const lv = learned[w] || 1;
    if (dist[lv] !== undefined) dist[lv]++;
  }
  let html = `<h2>熟练度统计</h2><p>总词数：${total}</p><ul>`;
  for (let lv = 1; lv <= 5; lv++) {
    const count = dist[lv];
    const percent = total ? Math.round((count * 100) / total) : 0;
    html += `<li>等级 ${lv}：${count} 个（${percent}%）
      <div class="stats-bar">
        <div class="stats-bar-inner" style="width:${percent}%;"></div>
      </div>
    </li>`;
  }
  html += "</ul><button onclick='showMenu()'>返回</button>";
  app.innerHTML = html;
  showRootInfo("");
  updateSummary();
}

function searchWords() {
  const input = document.getElementById("search-input");
  if (!input) return;
  const kwRaw = input.value.trim();
  if (!kwRaw) {
    showMenu();
    return;
  }
  const kw = kwRaw.toLowerCase();
  const results = [];
  for (let w in words) {
    const meaning = words[w];
    if (
      w.toLowerCase().includes(kw) ||
      (meaning && meaning.toLowerCase().includes(kwRaw.toLowerCase()))
    ) {
      results.push({ w, meaning });
    }
  }
  const app = document.getElementById("app");
  if (results.length === 0) {
    app.innerHTML = `<h2>搜索结果：${kwRaw}</h2><p>没有找到相关单词。</p><button onclick="showMenu()">返回</button>`;
    showRootInfo("");
    return;
  }
  let html = `<h2>搜索结果：${kwRaw}</h2>`;
  html += results
    .map(
      r => `
    <div class="search-result">
      <div class="search-result-main">
        <span class="search-word">${r.w}</span>
        <span class="search-meaning">${r.meaning}</span>
      </div>
      <button onclick="flashcard('${r.w}')">闪卡练习</button>
    </div>`
    )
    .join("");
  html += `<button onclick="showMenu()">返回</button>`;
  app.innerHTML = html;
  if (results.length === 1) showRootInfo(results[0].w);
  else showRootInfo("");
  updateSummary();
}

function showRootInfo(word) {
  const box = document.getElementById("root-info");
  if (!box) return;
  if (!word) {
    box.innerHTML = "";
    return;
  }
  const lower = word.toLowerCase();
  const hits = [];
  for (let key in ROOT_MAP) {
    if (lower.startsWith(key) || lower.endsWith(key) || lower.includes(key)) {
      hits.push(ROOT_MAP[key]);
    }
  }
  if (hits.length === 0) {
    box.innerHTML =
      "<h3>词根小提示</h3><p>这个单词没有明显的常见词根，但你可以通过联想、例句和多次练习来记住它。</p>";
  } else {
    box.innerHTML =
      "<h3>词根小提示</h3><p>" + hits.join("<br>") + "</p>";
  }
}

window.onload = async () => {
  await loadWords();
  loadState();
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.onclick = toggleTheme;
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  if (searchBtn) searchBtn.onclick = searchWords;
  if (searchInput) {
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") searchWords();
    });
  }
  showMenu();
};
