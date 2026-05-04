let systemData, raceData;

Promise.all([
  fetch('data/system.json').then(r=>r.json()),
  fetch('data/races.json').then(r=>r.json())
]).then(([s, r])=>{
  systemData = s;
  raceData = r;

  init(); // ←これ重要
});

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

function addLog(text){
  log.innerHTML += `<div class="log-line">${text}</div>`;
  log.scrollTop = log.scrollHeight;
}

function logEffects(effects){
  for(let k in effects){
    const val = effects[k];
    const sign = val>0?"+":"";
    addLog(`${k} ${sign}${Math.round(val*100)}%`);
  }
}

const commentary = {
  天候:{
    晴れ:"晴天！絶好のコンディション！",
    曇り:"少し重たいバ場状態だ…",
    雨:"雨で足元が悪い！"
  },
  序盤:{
    コンセントレーション:"完璧なスタート！",
    出遅れ:"出遅れた！",
    通常:"まずは無難なスタート。"
  },
  位置取り争い:{
    成功:"いい位置を確保！",
    拮抗:"位置取りは互角。",
    失敗:"包まれた！厳しい展開。"
  },
  中盤:{
    "前に出る！":"一気に前へ！",
    "パワー上昇":"パワーを活かして押し上げる！",
    "スピード低下":"少しペースダウン…",
    "掛かり":"掛かってしまった！"
  },
  終盤:{
    "全力スパート！":"ここで加速！！",
    "追い比べ":"激しい叩き合い！",
    "脚色まかせ":"最後は脚頼み！"
  }
};

function updateBars(stats){
  for(let k in stats){
    const el = document.getElementById("bar_"+k);
    if(el){
      el.style.width = (stats[k]/2)+"px";
    }
  }
}

async function run(){

  log.innerHTML="";
  result.innerText="・・・";

  addLog("レース開始！");
  await sleep(500);

  const race = data.races[raceSelect.value];

  let stats={
    スピード:+スピード.value,
    スタミナ:+スタミナ.value,
    パワー:+パワー.value,
    根性:+根性.value,
    賢さ:+賢さ.value
  };

  // やる気
  const mult = data.motivation[motivation.value];
  for(let k in stats) stats[k]*=mult;

  // 天候
  const w = weightedRandom(data.weather);
  applyEffects(stats,w.effects);

  addLog(commentary.天候[w.name] || w.name);
  logEffects(w.effects);
  await sleep(600);

  // フェーズ
  for(const phase of data.phases){

    let ev = weightedRandom(phase.events);
    if(ev.subEvents) ev = weightedRandom(ev.subEvents);

    applyEffects(stats,ev.effects);

    addLog(commentary[phase.name]?.[ev.name] || `${phase.name}：${ev.name}`);
    logEffects(ev.effects);

    updateBars(stats);

    await sleep(700);
  }

  addLog("最終直線――！");
  await sleep(800);

  // 比較
  let points=[25,25,25,25];

  applyComparison(stats,race.reference,data.thresholds,points,1.0);
  applyComparison(stats,race.rival,data.thresholds,points,1.0);

  const mob = generateMob(race.reference,race.mobMin,race.mobMax);
  applyComparison(stats,mob,data.thresholds,points,0.5);

  points = points.map(p=>Math.max(0,p));

  const total = points.reduce((a,b)=>a+b,0);
  const probs = points.map(p=>p/total);

  for(let i=0;i<4;i++){
    .style.width = (probs[i]*100)+"%";
  }

  await sleep(800);

  let r=Math.random();
  let stage=0;
  for(let i=0;i<4;i++){
    if(r<probs[i]){stage=i;break;}
    r-=probs[i];
  }

  const n = +players.value;

  function range(stage){
    if(stage===0)return[1,1];
    if(stage===1)return[2,Math.floor(n*0.3)];
    if(stage===2)return[Math.floor(n*0.31),Math.floor(n*0.6)];
    return[Math.floor(n*0.61),n];
  }

  const [min,max]=range(stage);
  const rank=Math.floor(Math.random()*(max-min+1))+min;

  await sleep(1000);

  result.innerText=`結果：${rank}位！！`;

  if(rank===1){
    result.style.color="gold";
  }else if(rank<=3){
    result.style.color="silver";
  }else{
    result.style.color="#ccc";
  }

  addLog(`最終順位：${rank}位`);
}
async function run(){
  addRaceLog("序盤", ev.name);
await sleep(500);
function syncBar(name){
  const input = document.getElementById(name);
  let val = parseInt(input.value);

  if(isNaN(val) || val < 0) val = 0;

  // 上限（任意調整）
  const max = 200;

  const width = Math.min(val, max) / max * 100;

  document.getElementById("bar_"+name).style.width = width + "%";
}
window.onload = () => {
  ["スピード","スタミナ","パワー","根性","賢さ"].forEach(syncBar);
};
  if(val > 150){
  bar.style.background = "#ff9800"; // 強い
}else if(val > 100){
  bar.style.background = "#4caf50"; // 普通
}else{
  bar.style.background = "#2196f3"; // 弱め
}
function syncBar(name){
  const input = document.getElementById(name);
  const bar = document.getElementById("bar_"+name);
  const label = document.getElementById("val_"+name);

  let val = parseInt(input.value);

  if(isNaN(val) || val < 0) val = 0;

  const max = 200;
  const percent = Math.min(val, max) / max * 100;

  // 幅更新
  bar.style.width = percent + "%";

  // 数値表示
  label.innerText = val;

  // 色分岐（ここがポイント）
  if(val >= 160){
    bar.style.background = "linear-gradient(90deg, #ff9800, #ffc107)"; // 超強
  }else if(val >= 120){
    bar.style.background = "linear-gradient(90deg, #4caf50, #8bc34a)"; // 強
  }else if(val >= 80){
    bar.style.background = "linear-gradient(90deg, #2196f3, #03a9f4)"; // 普通
  }else{
    bar.style.background = "linear-gradient(90deg, #9e9e9e, #bdbdbd)"; // 弱    
  }
}
function init(){

  // 人数プルダウン
  const playersEl = document.getElementById("players");
  playersEl.innerHTML = "";

  for(let i=9;i<=18;i++){
    playersEl.innerHTML += `<option value="${i}">${i}人</option>`;
  }

  // レースプルダウン
  const raceEl = document.getElementById("raceSelect");
  raceEl.innerHTML = "";

  raceData.races.forEach((r,i)=>{
    raceEl.innerHTML += `<option value="${i}">${r.name}</option>`;
  });

}
