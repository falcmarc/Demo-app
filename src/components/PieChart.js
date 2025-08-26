// src/components/PieChart.js
// Semplice pie chart su <canvas> (senza librerie)

export default function PieChart(data, { size=220 } = {}){
  const wrap = document.createElement('div');
  wrap.style.width  = size+'px';
  wrap.style.height = size+'px';
  wrap.style.display = 'inline-block';

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  wrap.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const total = data.reduce((s,d)=> s + (d.value||0), 0) || 1;

  const colors = [
    '#22c55e', // proteine
    '#f59e0b', // zuccheri
    '#3b82f6', // carbs (starch)
    '#ef4444', // fat
  ];

  let start = -Math.PI/2;
  data.forEach((d,i)=>{
    const val = (d.value||0) / total;
    const end = start + 2*Math.PI*val;
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.arc(size/2, size/2, size/2-6, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    start = end;
  });

  // legenda
  const legend = document.createElement('div');
  legend.style.display = 'grid';
  legend.style.gridTemplateColumns = 'auto 1fr auto';
  legend.style.gap = '6px 8px';
  legend.style.marginTop = '8px';

  data.forEach((d,i)=>{
    const dot = document.createElement('span');
    dot.style.width='12px'; dot.style.height='12px'; dot.style.borderRadius='50%';
    dot.style.display='inline-block'; dot.style.background=colors[i % colors.length];
    const label = document.createElement('span'); label.textContent = d.key;
    const val   = document.createElement('span'); val.textContent = `${Math.round((d.value||0)/total*100)}%`;
    val.style.textAlign='right';
    legend.append(dot, label, val);
  });

  wrap.appendChild(legend);
  return wrap;
}
