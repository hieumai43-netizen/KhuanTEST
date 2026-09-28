const CORS={
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept','Cache-Control':'public, max-age=300'
};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
const sellerWords=['nhận gia công khuôn','chuyên gia công khuôn','chuyên thiết kế khuôn','chế tạo khuôn mẫu','công ty khuôn mẫu','xưởng khuôn','dịch vụ làm khuôn','nhà sản xuất khuôn','sản xuất khuôn mẫu','gia công khuôn mẫu theo yêu cầu','thiết kế và chế tạo khuôn'];
const intentWords=['cần tìm','tìm nhà cung cấp','tìm đối tác','cần đối tác','cần báo giá','yêu cầu báo giá','rfq','mời chào giá','mời báo giá','mời thầu','đặt hàng','thuê gia công','cần gia công','tìm đơn vị','tìm xưởng','phát triển sản phẩm','sản phẩm mới','mở rộng sản xuất','nhà máy mới'];
const buyerIndustries=['điện tử','ô tô','xe máy','đồ gia dụng','thiết bị y tế','bao bì','linh kiện nhựa','sản phẩm nhựa','nhà máy','sản xuất'];
function classify(title,snippet){
 const h=(title+' '+snippet).toLowerCase();
 const seller=sellerWords.filter(w=>h.includes(w)).length;
 const intent=intentWords.filter(w=>h.includes(w)).length;
 const industry=buyerIndustries.filter(w=>h.includes(w)).length;
 let score=38+intent*14+industry*4-seller*28;
 if(/tuyển dụng|việc làm|khóa học|đào tạo|máy ép nhựa|bán máy|rao bán/.test(h)) score-=18;
 score=Math.max(5,Math.min(98,score));
 return {score,seller,intent,industry,label:seller?'Đối thủ / nhà cung cấp':intent>=2?'Nhu cầu rõ':intent===1?'Có tín hiệu mua':industry>=2?'Khách tiềm năng gián tiếp':'Tham khảo'};
}
function buildQuery(raw,industry){
 const product=(raw||'khuôn ép nhựa').replace(/["']/g,' ').trim();
 const ind=(industry||'Tất cả ngành').replace(/["']/g,' ').trim();
 const indPart=ind&&ind!=='Tất cả ngành'?` ("${ind}" OR "nhà máy ${ind}" OR "sản xuất ${ind}")`:'';
 // Search BUYER signals, not mold suppliers. Negative terms remove common mold-service advertisers.
 return `("cần tìm" OR "tìm nhà cung cấp" OR "tìm đối tác" OR "cần báo giá" OR "yêu cầu báo giá" OR RFQ OR "mời chào giá" OR "mời thầu" OR "cần gia công" OR "phát triển sản phẩm") ("${product}" OR "linh kiện nhựa" OR "vỏ nhựa" OR "chi tiết nhựa" OR "ép nhựa")${indPart} -"nhận gia công khuôn" -"chuyên gia công khuôn" -"công ty khuôn mẫu" -"xưởng khuôn"`;
}
export default {async fetch(request,env){
 if(request.method==='OPTIONS') return new Response(null,{headers:CORS});
 const u=new URL(request.url);
 if(u.pathname==='/'||u.pathname==='/health') return json({ok:true,service:'Mold FREE Scanner Vietnam V0.8 BUYER FINDER',market:'Việt Nam',ai:false,search:'Serper Google Search API',keyConfigured:!!env.SERPER_API_KEY});
 if(u.pathname!=='/scan') return json({ok:false,error:'Not found'},404);
 if(!env.SERPER_API_KEY) return json({ok:false,error:'Worker chưa có SERPER_API_KEY.'},500);
 const raw=(u.searchParams.get('keywords')||'khuôn ép nhựa').slice(0,120);
 const industry=(u.searchParams.get('industry')||'Tất cả ngành').slice(0,80);
 const q=buildQuery(raw,industry);
 let r; try{r=await fetch('https://google.serper.dev/search',{method:'POST',headers:{'X-API-KEY':env.SERPER_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({q,gl:'vn',hl:'vi',num:20})});}
 catch(e){return json({ok:false,error:'Không kết nối được Serper: '+String(e.message||e)},502)}
 const text=await r.text(); let data={}; try{data=JSON.parse(text)}catch{}
 if(!r.ok) return json({ok:false,error:'Serper HTTP '+r.status+': '+(data.message||data.error||text.slice(0,180))},502);
 const organic=Array.isArray(data.organic)?data.organic:[];
 let rejected=0;
 const articles=organic.map(x=>{const c=classify(x.title||'',x.snippet||'');return {title:norm(x.title),url:x.link,domain:x.source||(()=>{try{return new URL(x.link).hostname}catch{return 'Web Việt Nam'}})(),seendate:x.date||'',snippet:norm(x.snippet),score:c.score,leadType:c.label,isSeller:c.seller>0,intentSignals:c.intent};})
  .filter(x=>x.title&&/^https?:/i.test(x.url))
  .filter(x=>{if(x.isSeller||x.score<46){rejected++;return false}return true});
 const seen=new Set(); const out=articles.filter(a=>{const k=a.url.replace(/[#?].*$/,'');if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>b.score-a.score).slice(0,12);
 return json({ok:true,market:'Việt Nam',source:'Serper · Buyer Finder V0.8',query:q,industry,count:out.length,rejected,articles:out,freeMode:true,ai:false});
}};
