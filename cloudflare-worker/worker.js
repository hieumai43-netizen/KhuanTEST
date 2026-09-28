const CORS={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept',
  'Cache-Control':'public, max-age=300'
};
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const clean=s=>(s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const getTag=(block,tag)=>{const m=block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?clean(m[1]):''};

export default {
 async fetch(request){
  if(request.method==='OPTIONS') return new Response(null,{headers:CORS});
  const u=new URL(request.url);
  if(u.pathname==='/'||u.pathname==='/health') return json({ok:true,service:'Mold FREE Scanner Vietnam V0.5',market:'Việt Nam',ai:false,source:'Google News RSS'});
  if(u.pathname!=='/scan') return json({ok:false,error:'Not found'},404);

  const raw=(u.searchParams.get('keywords')||'khuôn ép nhựa').slice(0,180);
  const words=raw.split(/[,，、;]+/).map(x=>x.trim()).filter(Boolean).slice(0,5);
  const base=['khuôn ép nhựa','gia công khuôn','chế tạo khuôn'];
  const terms=[...new Set([...words,...base])].slice(0,6);
  // One upstream request only. Vietnam-focused query; no X/Japan in V0.5.
  const query='('+terms.map(x=>`"${x.replace(/"/g,'')}"`).join(' OR ')+') (cần OR tìm OR đặt OR gia công OR nhà cung cấp OR sản xuất OR doanh nghiệp)';
  const rss='https://news.google.com/rss/search?q='+encodeURIComponent(query)+'&hl=vi&gl=VN&ceid=VN:vi';

  try{
   const r=await fetch(rss,{headers:{'Accept':'application/rss+xml,application/xml,text/xml','User-Agent':'Mozilla/5.0 MoldLeadFinder-Free/0.5'}});
   const text=await r.text();
   if(!r.ok) return json({ok:false,error:`Nguồn VN HTTP ${r.status}: ${text.slice(0,160)}`},502);
   const items=[...text.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);
   const intent=['cần','tìm','đặt','gia công','khuôn','nhà cung cấp','sản xuất','doanh nghiệp','nhà máy','đầu tư'];
   const articles=items.map(block=>{
     const title=getTag(block,'title');
     const url=getTag(block,'link');
     const pubDate=getTag(block,'pubDate');
     const source=getTag(block,'source')||'Google News';
     const hay=(title+' '+source).toLowerCase();
     let score=45;
     for(const w of terms) if(hay.includes(w.toLowerCase())) score+=8;
     for(const w of intent) if(hay.includes(w)) score+=3;
     return {title,url,domain:source,seendate:pubDate,score:Math.min(95,score)};
   }).filter(a=>a.title&&a.url).sort((a,b)=>b.score-a.score).slice(0,20);
   return json({ok:true,market:'Việt Nam',source:'Google News RSS',query,count:articles.length,articles});
  }catch(e){return json({ok:false,error:String(e&&e.message||e)},502)}
 }
};
