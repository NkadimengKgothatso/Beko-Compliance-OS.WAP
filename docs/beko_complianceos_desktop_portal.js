
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  const map={dashboard:0,onboard:1,templates:2,notifications:3,consultation:4,profile:5};
  document.querySelectorAll('.nav-item')[map[id]].classList.add('active');
}
function selectChip(el){
  const g=el.closest('.chip-row');
  g.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
}
function selectTab(el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}
