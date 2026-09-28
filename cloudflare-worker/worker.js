const CORS={
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept','Cache-Control':'public, max-age=300'
};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
function scoreItem(title,snippet,terms){
  const h=(title+' '+snippet).toLowerCase(); let s=40;
  for(const w of terms) if(h.includes(w.toLowerCase())) s+=8;
  for(const w of ['cần','tìm','đặt','gia công','khuôn','nhà cung cấp','sản xuất','nhà máy','doanh nghiệp','cơ khí','nhựa','injection','mold']) if(h.includes(w)) s+=3;
  return Math.min(96,s);
}
export default {async fetch(request,env){
  if(request.method==='OPTIONS') return new Response(null,{headers:CORS});
  const u=new URL(request.url);
  if(u.pathname==='/'||u.pathname==='/health') return json({ok:true,service:'Mold FREE Scanner Vietnam V0.7',market:'Việt Nam',ai:false,search:'Serper Google Search API',keyConfigured:!!env.SERPER_API_KEY});
  if(u.pathname!=='/scan') return json({ok:false,error:'Not found'},404);
  if(!env.SERPER_API_KEY) return json({ok:false,error:'Worker chưa có SERPER_API_KEY. Vào Cloudflare Worker > Settings > Variables and Secrets và thêm secret SERPER_API_KEY.'},500);
  const raw=(u.searchParams.get('keywords')||'khuôn ép nhựa').slice(0,180);
  const words=raw.split(/[,，、;]+/).map(x=>x.trim()).filter(Boolean).slice(0,5);
  const terms=[...new Set([...words,'khuôn ép nhựa','gia công khuôn','chế tạo khuôn'])].slice(0,6);
  // Focus on Vietnam and buying/outsourcing intent. One API call per scan.
  const q='('+terms.map(x=>'"'+x.replace(/"/g,'')+'"').join(' OR ')+') ("cần" OR "tìm" OR "đặt" OR "thuê" OR "gia công" OR "nhà cung cấp") Việt Nam';
  let r;
  try{
    r=await fetch('https://google.serper.dev/search',{method:'POST',headers:{'X-API-KEY':env.SERPER_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({q,gl:'vn',hl:'vi',num:10})});
  }catch(e){return json({ok:false,error:'Không kết nối được Serper: '+String(e.message||e)},502)}
  const text=await r.text(); let data={}; try{data=JSON.parse(text)}catch{}
  if(!r.ok) return json({ok:false,error:'Serper HTTP '+r.status+': '+(data.message||data.error||text.slice(0,180))},502);
  const organic=Array.isArray(data.organic)?data.organic:[];
  const articles=organic.map(x=>({title:norm(x.title),url:x.link,domain:x.source||(()=>{try{return new URL(x.link).hostname}catch{return 'Web Việt Nam'}})(),seendate:x.date||'',snippet:norm(x.snippet),score:scoreItem(x.title||'',x.snippet||'',terms)})).filter(x=>x.title&&/^https?:/i.test(x.url));
  const seen=new Set(); const out=articles.filter(a=>{const k=a.url.replace(/[#?].*$/,'');if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>b.score-a.score).slice(0,10);
  return json({ok:true,market:'Việt Nam',source:'Serper · Google Search',query:q,count:out.length,articles:out,freeMode:true,ai:false});
}};
