let systemData, raceData;

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
  const race = raceData.races[document.getElementById("raceSelect").value];
  document.getElementById("playersDisplay").innerText = race.players + "人";
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
async function run(){

  const log = document.getElementById("log");
  const result = document.getElementById("result");

  log.innerHTML="";
  result.innerText="・・・";

  addLog("レース開始！");
  await sleep(500);

  const race = raceData.races[document.getElementById("raceSelect").value];

  let stats={
    スピード:+スピード.value,
    スタミナ:+スタミナ.value,
    パワー:+パワー.value,
    根性:+根性.value,
    賢さ:+賢さ.value
  };

  // やる気
  const mult = systemData.motivation[motivation.value];
  for(let k in stats) stats[k]*=mult;

  // 天候
  const w = weightedRandom(systemData.weather);
  applyEffects(stats,w.effects);

  addLog("天候：" + w.name);
  await sleep(500);

  // フェーズ
  for(const phase of systemData.phases){

    let ev = weightedRandom(phase.events);
    if(ev.subEvents) ev = weightedRandom(ev.subEvents);

    applyEffects(stats,ev.effects);

    addLog(`${phase.name}：${ev.name}`);
    await sleep(500);
  }

  // 比較
  let points=[25,25,25,25];

  applyComparison(stats,race.reference,systemData.thresholds,points,1.0);
  applyComparison(stats,race.rival,systemData.thresholds,points,1.0);

  const mob = generateMob(race.reference,race.mobMin,race.mobMax);
  applyComparison(stats,mob,systemData.thresholds,points,0.5);

  points = points.map(p=>Math.max(0,p));

  const total = points.reduce((a,b)=>a+b,0);
  const probs = total===0 ? [0.25,0.25,0.25,0.25] : points.map(p=>p/total);

  let r=Math.random();
  let stage=3;

  for(let i=0;i<4;i++){
    if(r<probs[i]){stage=i;break;}
    r-=probs[i];
  }

  const n = race.players;

  const p30 = Math.floor(n*0.3);
  const p60 = Math.floor(n*0.6);

  let min,max;

  if(stage===0){min=1;max=1;}
  else if(stage===1){min=2;max=p30;}
  else if(stage===2){min=p30+1;max=p60;}
  else{min=p60+1;max=n;}

  const rank=Math.floor(Math.random()*(max-min+1))+min;

  result.innerText=`結果：${rank}位`;

  addLog(`最終順位：${rank}位`);
}
