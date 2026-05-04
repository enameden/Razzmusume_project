document.addEventListener("DOMContentLoaded", () => {
  
let systemData, raceData;
  let phaseIndex = 0;
let currentStats = {};
let currentRace = null;

// =====================
// 初期ロード
// =====================
Promise.all([
  fetch('data/system.json').then(r=>r.json()),
  fetch('data/races.json').then(r=>r.json())
]).then(([s, r])=>{
  systemData = s;
  raceData = r;

  console.log("読み込み成功", raceData);

  init();
}).catch(err=>{
  console.error("読み込み失敗", err);
});

// =====================
// 初期化
// =====================
function init(){

  const raceEl = document.getElementById("raceSelect");

  raceEl.innerHTML = "";

  raceData.races.forEach((r,i)=>{
    raceEl.innerHTML += `<option value="${i}">${r.name}</option>`;
  });

  raceEl.addEventListener("change", updateRaceInfo);

  updateRaceInfo();

  // ステータスバー初期化
  ["スピード","スタミナ","パワー","根性","賢さ"].forEach(syncBar);
}

// =====================
// レース情報表示
// =====================
function updateRaceInfo(){
  const race = raceData.races[raceSelect.value];

  document.getElementById("playersDisplay").innerHTML = `
    🏁 ${race.name}<br>
    👥 出走：${race.players}人
  `;
}

// =====================
// 共通関数
// =====================
function sleep(ms){
  return new Promise(res=>setTimeout(res,ms));
}

function weightedRandom(list){
  const total = list.reduce((a,b)=>a+b.weight,0);
  let r = Math.random()*total;
  for(const item of list){
    if(r < item.weight) return item;
    r -= item.weight;
  }
}

function applyEffects(stats, effects){
  for(const k in effects){
    stats[k] *= (1 + effects[k]);
    stats[k] = Math.floor(stats[k]);
  }
}

function generateMob(reference,min,max){
  let mob={};
  for(let k in reference){
    let rand = min + Math.random()*(max-min);
    mob[k] = Math.floor(reference[k]*rand);
  }
  return mob;
}

function applyComparison(player,target,thresholds,points,weight){
  for(let key in player){
    const diff = player[key] - target[key];

    for(let t of thresholds){
      if(diff >= t.diff){
        t.effects.forEach((e,i)=>points[i]+=e*weight);
        break;
      }
    }
  }
}

// =====================
// ログ
// =====================
function addLog(text){
  const log = document.getElementById("log");
  log.innerHTML += `<div>${text}</div>`;
  log.scrollTop = log.scrollHeight;
}

// =====================
// ステータスUI
// =====================
function syncBar(name){
  const input = document.getElementById(name);
  const bar = document.getElementById("bar_"+name);
  const label = document.getElementById("val_"+name);

  let val = parseInt(input.value);
  if(isNaN(val) || val < 0) val = 0;

  const max = 200;
  const percent = Math.min(val, max) / max * 100;

  bar.style.width = percent + "%";
  label.innerText = val;

  if(val >= 160){
    bar.style.background = "linear-gradient(90deg,#ff9800,#ffc107)";
  }else if(val >= 120){
    bar.style.background = "linear-gradient(90deg,#4caf50,#8bc34a)";
  }else if(val >= 80){
    bar.style.background = "linear-gradient(90deg,#2196f3,#03a9f4)";
  }else{
    bar.style.background = "linear-gradient(90deg,#9e9e9e,#bdbdbd)";
  }
}

// =====================
// メイン処理
// =====================
async function nextPhase(){

  const btn = document.getElementById("raceBtn");

  // 初回（初期化）
  if(phaseIndex === 0){

    currentRace = raceData.races[raceSelect.value];

    currentStats = {
      スピード:+スピード.value,
      スタミナ:+スタミナ.value,
      パワー:+パワー.value,
      根性:+根性.value,
      賢さ:+賢さ.value
    };

    // やる気
    const mult = systemData.motivation[motivation.value];
    for(let k in currentStats) currentStats[k]*=mult;

    addLog("レース準備完了！");
  }

  // 天候
  if(phaseIndex === 0){
    const w = weightedRandom(systemData.weather);
    applyEffects(currentStats, w.effects);
    addLog("天候：" + w.name);
  }

  // 各フェーズ
  if(phaseIndex >= 1 && phaseIndex <= 4){

    const phase = systemData.phases[phaseIndex-1];

    let ev = weightedRandom(phase.events);
    if(ev.subEvents) ev = weightedRandom(ev.subEvents);

    applyEffects(currentStats, ev.effects);

    addLog(`${phase.name}：${ev.name}`);
  }

  // 最終結果
  if(phaseIndex === 5){

    let points=[25,25,25,25];

    applyComparison(currentStats,currentRace.reference,systemData.thresholds,points,1);
    applyComparison(currentStats,currentRace.rival,systemData.thresholds,points,1);

    const mob = generateMob(currentRace.reference,currentRace.mobMin,currentRace.mobMax);
    applyComparison(currentStats,mob,systemData.thresholds,points,0.5);

    points = points.map(p=>Math.max(0,p));

    const total = points.reduce((a,b)=>a+b,0);
    const probs = points.map(p=>p/total);

    let r=Math.random();
    let stage=3;

    for(let i=0;i<4;i++){
      if(r<probs[i]){stage=i;break;}
      r-=probs[i];
    }

    const n = currentRace.players;

    let min,max;
    if(stage===0){min=1;max=1;}
    else if(stage===1){min=2;max=Math.floor(n*0.3);}
    else if(stage===2){min=Math.floor(n*0.3)+1;max=Math.floor(n*0.6);}
    else{min=Math.floor(n*0.6)+1;max=n;}

    const rank=Math.floor(Math.random()*(max-min+1))+min;

    showResult(rank);
  }

  phaseIndex++;

  // ボタン更新
  btn.innerText = phaseLabels[phaseIndex] || "終了";

  // 終了後リセット
  if(phaseIndex > 5){
    phaseIndex = 0;
    const phaseLabels = [
  "入力完了",
  "天候決定",
  "序盤",
  "中盤",
  "終盤",
  "結果",
  "リセット"
];
  }
}
  function showResult(rank){

  const result = document.getElementById("result");

  result.style.opacity = 0;
  result.innerText = `結果：${rank}位`;

  setTimeout(()=>{
    result.style.transition = "0.5s";
    result.style.opacity = 1;
  },100);

  if(rank === 1){
    result.style.color = "gold";
    result.style.textShadow = "0 0 20px gold";
  }else if(rank <= 3){
    result.style.color = "silver";
  }else{
    result.style.color = "#ccc";
  }
}

