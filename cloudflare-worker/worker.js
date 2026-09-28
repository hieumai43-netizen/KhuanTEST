const CORS={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept',
  'Cache-Control':'no-store'
};
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});

export default {
 async fetch(request){
  if(request.method==='OPTIONS') return new Response(null,{headers:CORS});
  const u=new URL(request.url);
  if(u.pathname==='/'||u.pathname==='/health') return json({ok:true,service:'Mold FREE Scanner V0.4',ai:false});
  if(u.pathname!=='/scan') return json({ok:false,error:'Not found'},404);
  const raw=(u.searchParams.get('keywords')||'金型').slice(0,180);
  const market=u.searchParams.get('market')||'Nhật Bản';
  const words=raw.split(/[,，、;]+/).map(x=>x.trim()).filter(Boolean).slice(0,5);
  const defaults=market==='Việt Nam'?['khuôn','gia công','ép nhựa']:['金型','試作','小ロット'];
  const qwords=[...new Set([...words,...defaults])].slice(0,7);
  // GDELT requires OR expressions to be grouped.
  const terms=qwords.map(x=>x.includes(' ')?`"${x.replace(/"/g,'')}"`:x.replace(/[()]/g,'')).filter(Boolean);
  const query='('+terms.join(' OR ')+')';
  const gdelt=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  gdelt.searchParams.set('query',query);
  gdelt.searchParams.set('mode','ArtList');
  gdelt.searchParams.set('maxrecords','50');
  gdelt.searchParams.set('format','json');
  gdelt.searchParams.set('sort','HybridRel');
  try{
   const r=await fetch(gdelt.toString(),{headers:{'Accept':'application/json','User-Agent':'MoldLeadFinder-Free/0.4'}});
   const text=await r.text();
   if(!r.ok) return json({ok:false,error:`GDELT HTTP ${r.status}: ${text.slice(0,180)}`},502);
   let data; try{data=JSON.parse(text)}catch{return json({ok:false,error:'GDELT trả về text thay vì JSON: '+text.slice(0,180),query},502)}
   const intent=market==='Việt Nam'?['cần','tìm','gia công','đặt hàng','nhà cung cấp','khuôn']:['募集','探して','求む','依頼','発注','外注','協力会社','金型','試作','小ロット'];
   const articles=(Array.isArray(data.articles)?data.articles:[]).map(a=>{
    const hay=((a.title||'')+' '+(a.domain||'')).toLowerCase(); let score=42;
    for(const w of words) if(hay.includes(w.toLowerCase())) score+=9;
    for(const w of intent) if(hay.includes(w.toLowerCase())) score+=4;
    if(a.domain)score+=3;
    return {title:a.title||'',url:a.url||'',domain:a.domain||'',seendate:a.seendate||'',score:Math.min(96,score)};
   }).filter(a=>a.url).sort((a,b)=>b.score-a.score).slice(0,20);
   return json({ok:true,query,count:articles.length,articles});
  }catch(e){return json({ok:false,error:String(e&&e.message||e)},502)}
 }
};
