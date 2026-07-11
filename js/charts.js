/* =====================================================================
   CARGAYA — charts.js
   Gráficos con Chart.js para reportes de empresa, transportista y admin.
===================================================================== */

let CY_CHART_INSTANCES = {};
const CY_MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function cyChartTheme(){
  const dark = document.documentElement.dataset.theme==='dark';
  return {
    text: dark? '#9AA1B2':'#5B6273',
    grid: dark? 'rgba(255,255,255,.06)':'rgba(20,23,31,.06)'
  };
}

function cyDestroyChart(id){
  if(CY_CHART_INSTANCES[id]){ CY_CHART_INSTANCES[id].destroy(); delete CY_CHART_INSTANCES[id]; }
}

function cyMakeChart(canvasId, config){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  cyDestroyChart(canvasId);
  const theme = cyChartTheme();
  config.options = config.options || {};
  config.options.plugins = config.options.plugins || {};
  config.options.plugins.legend = config.options.plugins.legend || {labels:{color:theme.text}};
  config.options.scales = config.options.scales || {};
  if(config.type!=='doughnut' && config.type!=='pie'){
    config.options.scales.x = Object.assign({ticks:{color:theme.text}, grid:{color:theme.grid}}, config.options.scales.x||{});
    config.options.scales.y = Object.assign({ticks:{color:theme.text}, grid:{color:theme.grid}}, config.options.scales.y||{});
  }
  config.options.responsive = true;
  config.options.maintainAspectRatio = true;
  CY_CHART_INSTANCES[canvasId] = new Chart(canvas, config);
}

function cyRandSeries(n, min, max){ return Array.from({length:n}, ()=>cyRandInt(min,max)); }

function cyRenderIngresosCharts(){
  cyMakeChart('chart-ingresos', {
    type:'bar',
    data:{ labels: CY_MESES, datasets:[{label:'Ingresos (S/)', data: cyRandSeries(12,1200,6800), backgroundColor:'#FFB020', borderRadius:6}]}
  });
  cyMakeChart('chart-km', {
    type:'line',
    data:{ labels: CY_MESES, datasets:[{label:'Km recorridos', data: cyRandSeries(12,400,3200), borderColor:'#0BA6A6', backgroundColor:'rgba(11,166,166,.18)', fill:true, tension:.4}]}
  });
}

function cyRenderAdminCharts(){
  cyMakeChart('chart-admin-estados', {
    type:'doughnut',
    data:{ labels:['Pendiente','En búsqueda','Aceptada','En camino','Entregada','Cancelada'],
      datasets:[{data:[cyRandInt(8,20),cyRandInt(5,14),cyRandInt(10,22),cyRandInt(6,16),cyRandInt(20,44),cyRandInt(2,8)],
        backgroundColor:['#9AA1B2','#0BA6A6','#FFB020','#E0932A','#22C55E','#FF4D4F']}]}
  });
  cyMakeChart('chart-admin-usuarios', {
    type:'line',
    data:{ labels: CY_MESES, datasets:[
      {label:'Empresas', data: cyRandSeries(12,20,140), borderColor:'#FFB020', backgroundColor:'rgba(255,176,32,.15)', fill:true, tension:.4},
      {label:'Transportistas', data: cyRandSeries(12,30,180), borderColor:'#0BA6A6', backgroundColor:'rgba(11,166,166,.15)', fill:true, tension:.4}
    ]}
  });
  cyMakeChart('chart-admin-ingresos', {
    type:'bar',
    data:{ labels: CY_MESES, datasets:[{label:'Ingresos plataforma (S/)', data: cyRandSeries(12,8000,42000), backgroundColor:'#FFB020', borderRadius:6}]}
  });
  cyMakeChart('chart-admin-cargas', {
    type:'bar',
    data:{ labels: CY_MESES, datasets:[{label:'Cargas realizadas', data: cyRandSeries(12,40,220), backgroundColor:'#0BA6A6', borderRadius:6}]}
  });
  cyMakeChart('chart-admin-empresas', {
    type:'line',
    data:{ labels: CY_MESES, datasets:[{label:'Empresas atendidas', data: cyRandSeries(12,10,90), borderColor:'#22C55E', backgroundColor:'rgba(34,197,94,.15)', fill:true, tension:.4}]}
  });
  cyMakeChart('chart-admin-km', {
    type:'line',
    data:{ labels: CY_MESES, datasets:[{label:'Km totales', data: cyRandSeries(12,4000,24000), borderColor:'#FFB020', backgroundColor:'rgba(255,176,32,.15)', fill:true, tension:.4}]}
  });
}
