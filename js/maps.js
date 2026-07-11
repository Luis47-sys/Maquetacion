/* =====================================================================
   CARGAYA — maps.js
   Mapas simulados con Leaflet (sin API de Google). Muestra origen,
   destino, ruta aproximada y marcadores.
===================================================================== */

let CY_MAP_INSTANCES = {};

function cyDestroyMap(containerId){
  if(CY_MAP_INSTANCES[containerId]){
    CY_MAP_INSTANCES[containerId].remove();
    delete CY_MAP_INSTANCES[containerId];
  }
}

function cyTileLayerFor(map){
  const theme = document.documentElement.dataset.theme;
  const url = theme==='dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  L.tileLayer(url, {attribution:'&copy; OpenStreetMap &copy; CARTO', maxZoom:18}).addTo(map);
}

function cyRenderRouteMap(containerId, origen, destino){
  const el = document.getElementById(containerId);
  if(!el) return;
  cyDestroyMap(containerId);

  const map = L.map(containerId, {zoomControl:true, attributionControl:false, scrollWheelZoom:false});
  CY_MAP_INSTANCES[containerId] = map;
  cyTileLayerFor(map);

  const origenLatLng = [origen.lat, origen.lng];
  const destinoLatLng = [destino.lat, destino.lng];

  const amberIcon = L.divIcon({className:'', html:'<div style="background:#FFB020;width:16px;height:16px;border-radius:50%;border:3px solid #181307;box-shadow:0 0 0 4px rgba(255,176,32,.3)"></div>'});
  const tealIcon = L.divIcon({className:'', html:'<div style="background:#0BA6A6;width:16px;height:16px;border-radius:50%;border:3px solid #06302f;box-shadow:0 0 0 4px rgba(11,166,166,.3)"></div>'});

  L.marker(origenLatLng, {icon:amberIcon}).addTo(map).bindPopup(`<b>Origen:</b> ${origen.n}`);
  L.marker(destinoLatLng, {icon:tealIcon}).addTo(map).bindPopup(`<b>Destino:</b> ${destino.n}`);

  // ruta "simulada": curva suave entre origen y destino con puntos intermedios aleatorios
  const midLat = (origen.lat+destino.lat)/2 + (Math.random()-0.5)*1.2;
  const midLng = (origen.lng+destino.lng)/2 + (Math.random()-0.5)*1.2;
  const routeLine = L.polyline([origenLatLng, [midLat, midLng], destinoLatLng], {
    color:'#FFB020', weight:4, opacity:.85, dashArray:'8 10'
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), {padding:[30,30]});
  return map;
}

function cyRenderMultiMarkerMap(containerId, points){
  const el = document.getElementById(containerId);
  if(!el) return;
  cyDestroyMap(containerId);
  const map = L.map(containerId, {zoomControl:false, attributionControl:false, scrollWheelZoom:false}).setView([-9.19,-75.02], 5);
  CY_MAP_INSTANCES[containerId] = map;
  cyTileLayerFor(map);

  const group = [];
  points.forEach(p=>{
    const icon = L.divIcon({className:'', html:`<div style="background:${p.color||'#FFB020'};width:14px;height:14px;border-radius:50%;border:2px solid #181307"></div>`});
    const m = L.marker([p.lat,p.lng], {icon}).addTo(map).bindPopup(p.label||'');
    group.push(m);
  });
  if(group.length){
    const fg = L.featureGroup(group);
    map.fitBounds(fg.getBounds().pad(0.3));
  }
  return map;
}
