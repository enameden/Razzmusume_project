document.addEventListener("DOMContentLoaded", () => {
  
let systemData, raceData;
   const phaseLabels = [
  "入力完了",
  "天候決定",
  "序盤",
  "中盤",
  "終盤",
  "結果",
  "リセット"
];
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

  document.getElementById("raceBtn").addEventListener("click", nextPhase);

}
  
// =====================
// レース情報表示
// =====================
function updateRaceInfo(){
  const raceSelect = document.getElementById("raceSelect");
const race = raceData.races[raceSelect.value];

    document.getElementById("playersDisplay").innerText =
    `出走：${race.players}人`;
}

// =====================
// 共通関数
// =====================
function sleep(ms){
  return new Promise(res=>setTimeout(res,ms));
}

async function typeLog(text){
  const log = document.getElementById("log");

  let line = document.createElement("div");
  log.appendChild(line);

  for(let i=0;i<text.length;i++){
    line.innerText += text[i];
    await sleep(30);
  }

  log.scrollTop = log.scrollHeight;
}
  
async function playRoulette(options, duration=1200){

  const display = document.getElementById("rouletteDisplay");
  const log = document.getElementById("log");

  let interval = 50;
  let time = 0;
  let current = "";

  while(time < duration){

    current = options[Math.floor(Math.random()*options.length)];
    display.innerText = current;

    await sleep(interval);

    time += interval;
    interval += 5;
  }

  // 最終結果（★ここ1回だけ）
  const result = options[Math.floor(Math.random()*options.length)];

  // 光る
  display.style.color = "#6cf";
  display.style.transform = "scale(1.2)";

  setTimeout(()=>{
    display.style.transform = "scale(1)";
  },200);

  // ログ
  log.innerHTML += `<div style="color:#6cf">★ ${result}</div>`;
  log.scrollTop = log.scrollHeight;

  return result;
}
  
function weightedRandom(list){
  const total = list.reduce((a,b)=>a+b.weight,0);
  let r = Math.random()*total;

  for(const item of list){
    if(r < item.weight) return item;
    r -= item.weight;
  }

  return list[list.length - 1];
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

function calculateProbabilities(stats, race){

  let points=[25,25,25,25];

  applyComparison(stats, race.reference, systemData.thresholds, points, 1);
  applyComparison(stats, race.rival, systemData.thresholds, points, 1);

  const mob = generateMob(race.reference, race.mobMin, race.mobMax);
  applyComparison(stats, mob, systemData.thresholds, points, 0.5);

  points = points.map(p=>Math.max(0,p));

  const total = points.reduce((a,b)=>a+b,0);
  if(total === 0) return [0.25,0.25,0.25,0.25];

  return points.map(p=>p/total);
}

  function updateProbUI(probs){

  probs.forEach((p,i)=>{
    const bar = document.getElementById("prob"+i);
    const text = document.getElementById("prob"+i+"_text");

    const percent = Math.round(p*100);

    bar.style.width = percent + "%";
    text.innerText = percent + "%";
  });
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
// メイン処理
// =====================
async function nextPhase(){

if(phaseIndex === 0){

  currentRace = raceData.races[document.getElementById("raceSelect").value];

  await typeLog("ライバルステータス：");

  for(let k in currentRace.rival){
    await typeLog(`${k}：${currentRace.rival[k]}`);
  }
}
  
  const btn = document.getElementById("raceBtn");

  // 初回（初期化）
  if(phaseIndex === 0){

const raceSelect = document.getElementById("raceSelect");
const motivation = document.getElementById("motivation");

currentStats = {
  スピード: +document.getElementById("スピード").value,
  スタミナ: +document.getElementById("スタミナ").value,
  パワー: +document.getElementById("パワー").value,
  根性: +document.getElementById("根性").value,
  賢さ: +document.getElementById("賢さ").value
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
    await typeLog("天候：" + w.name);
  }

  // 各フェーズ
if(phaseIndex >= 1 && phaseIndex <= 4){

  const phase = systemData.phases[phaseIndex-1];

  const names = phase.events.map(e=>e.name);

  const resultName = await playRoulette(names);

  let ev = phase.events.find(e=>e.name === resultName);

  if(ev.subEvents){
    const subNames = ev.subEvents.map(s=>s.name);
    const subResult = await playRoulette(subNames);
    ev = ev.subEvents.find(s=>s.name === subResult);
  }

  applyEffects(currentStats, ev.effects);

  addLog(`${phase.name}：${ev.name}`);

  const probs = calculateProbabilities(currentStats, currentRace);
updateProbUI(probs);
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
    const probs = total === 0
  ? [0.25,0.25,0.25,0.25]
  : points.map(p=>p/total);

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
       else{
      min=Math.floor(n*0.6)+1;
      max=n;
    }

    const rank = Math.floor(Math.random()*(max-min+1))+min;

    showResult(rank);
  }

  phaseIndex++;

  // ボタン更新
  btn.innerText = phaseLabels[phaseIndex] || "終了";

  // 終了後リセット
  if(phaseIndex > 5){
    phaseIndex = 0;
  }
}

// =====================
// 結果表示
// =====================
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

});
