let data;

fetch('data.json').then(r=>r.json()).then(d=>{
  data = d;

  for(let i=9;i<=18;i++){
    players.innerHTML += `<option>${i}</option>`;
  }

  data.races.forEach((r,i)=>{
    raceSelect.innerHTML += `<option value="${i}">${r.name}</option>`;
  });
});

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

function run(){
  let log=[];

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
  log.push(`天候：${w.name}`);

  // フェーズ
  for(const phase of data.phases){
    let ev = weightedRandom(phase.events);
    if(ev.subEvents) ev = weightedRandom(ev.subEvents);

    applyEffects(stats,ev.effects);
    log.push(`${phase.name}：${ev.name}`);
  }

  // 比較
  let points=[25,25,25,25];

  applyComparison(stats,race.reference,data.thresholds,points,1.0);
  applyComparison(stats,race.rival,data.thresholds,points,1.0);

  const mob = generateMob(race.reference,race.mobMin,race.mobMax);
  applyComparison(stats,mob,data.thresholds,points,0.5);

  points = points.map(p=>Math.max(0,p));

  const total = points.reduce((a,b)=>a+b,0);
  const probs = points.map(p=>p/total);

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

  result.innerText=`結果：${rank}位`;
  logDiv.innerHTML=log.join("<br>");
}
function updateBars(stats){
  for(let k in stats){
    const el = document.getElementById("bar_"+k);
    if(el){
      el.style.width = (stats[k] / 2) + "px";
    }
  }
}
function addLog(text){
  log.innerHTML += `<div class="log-line">${text}</div>`;
  log.scrollTop = log.scrollHeight;
}
log.innerHTML = "";

addLog(`レース開始！`);

addLog(`天候：${w.name}`);
for(let i=0;i<4;i++){
  document.getElementById("p"+i).style.width = (probs[i]*100)+"%";
}
updateBars(stats);
const commentary = {
  天候: {
    晴れ: "晴天！絶好のコンディション！",
    曇り: "少し重たいバ場状態だ…",
    雨: "雨で足元が悪い！パワーが試される！"
  },
  序盤: {
    コンセントレーション: "完璧なスタートを決めた！",
    出遅れ: "出遅れた！これは痛い！",
    通常: "各ウマ娘一斉にスタートしました！"
  },
  終盤: {
    "全力スパート！": "【全力スパート】ここで一気に加速！勝負を決めることができるか！",
    "追い比べ": "【追い比べ】激しい競り合い！勝者は誰のものに！",
    "脚色まかせ": "【脚色まかせ】最後は脚に任せての追い上げ！果たして結果は…！"
  }
};
function addRaceLog(type, key){
  if(commentary[type] && commentary[type][key]){
    addLog(commentary[type][key]);
  } else {
    addLog(`${type}：${key}`);
  }
}
