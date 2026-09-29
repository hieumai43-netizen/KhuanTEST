const CORS={
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept','Cache-Control':'public, max-age=300'
};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
const lower=s=>norm(s).toLowerCase();

// V1.1 SOCIAL MULTI-MOLD: săn người MUA/đặt sản xuất, không săn xưởng đang quảng cáo.
const sellerWords=[
 'nhận gia công','chuyên gia công','chuyên thiết kế','thiết kế chế tạo khuôn','chế tạo khuôn mẫu','công ty khuôn mẫu','xưởng khuôn',
 'dịch vụ làm khuôn','nhà sản xuất khuôn','sản xuất khuôn mẫu','gia công khuôn mẫu theo yêu cầu','nhận làm khuôn','cung cấp khuôn',
 'dịch vụ ép nhựa','nhận ép nhựa','xưởng ép nhựa','công ty ép nhựa','chuyên ép nhựa','dịch vụ cnc','xưởng cnc','nhận gia công cnc',
 'chuyên khuôn mẫu','mold maker','mold manufacturer','mould manufacturer','nhận làm khuôn dập','chuyên khuôn dập'
];
const buyerIntent=[
 'cần tìm','đang tìm','ai biết chỗ','anh em biết chỗ','xin địa chỉ','tìm giúp','có xưởng nào','bên nào làm','bên nào nhận','ai nhận làm',
 'tìm nhà cung cấp','tìm supplier','tìm vendor','tìm đối tác','cần đối tác','cần báo giá','xin báo giá','yêu cầu báo giá','mời báo giá','mời chào giá',
 'rfq','cần gia công','thuê gia công','tìm đơn vị','cần sản xuất','đặt sản xuất','đặt hàng','cần làm mẫu','sản xuất thử','cần mẫu thử','tìm nguồn cung'
];
const plasticNeed=['khuôn ép nhựa','ép nhựa','chi tiết nhựa','linh kiện nhựa','vỏ nhựa','sản phẩm nhựa','plastic part','injection molding','abs','pp','pc','pa66','pom','tpe','tpu'];
const stampingNeed=['khuôn dập','dập kim loại','dập tấm','dập nguội','dập nóng','dập liên hoàn','progressive die','stamping','sheet metal','terminal','bracket','lá đồng','lá thép','chi tiết dập'];
const cncNeed=['gia công cnc','chi tiết máy','phay cnc','tiện cnc','cắt dây','edm','wire cut','jig','fixture','đồ gá'];
const designNeed=['theo bản vẽ','theo mẫu','file 3d','bản vẽ 3d','bản vẽ kỹ thuật','prototype','oem','odm','sản phẩm mới','làm mẫu'];
const growthSignals=['phát triển sản phẩm','sản phẩm mới','dự án mới','r&d','nghiên cứu phát triển','mở rộng sản xuất','nội địa hóa','localization','purchasing','procurement','mua hàng','sourcing'];
const noiseWords=['khóa học','đào tạo','rao bán máy','bán máy ép','máy ép nhựa cũ','máy cnc cũ','pinterest','youtube','wiki','từ điển','tuyển dụng','việc làm'];
function hits(h,words){return words.filter(w=>h.includes(w)).length}
function classify(title,snippet,url){
 const h=lower(title+' '+snippet), host=lower(url);
 const seller=hits(h,sellerWords), buyer=hits(h,buyerIntent), plastic=hits(h,plasticNeed), stamping=hits(h,stampingNeed), cnc=hits(h,cncNeed), design=hits(h,designNeed), growth=hits(h,growthSignals), noise=hits(h,noiseWords);
 const socialHost=/facebook\.com|groups\.google|forum|diendan|tinhte\.vn|reddit\.com|linkedin\.com/i.test(host);
 const need=plastic+stamping+cnc+design;
 let score=5+(socialHost?18:0)+buyer*28+Math.min(need,4)*9+Math.min(growth,2)*8-seller*50-noise*20;
 if(buyer>=1&&need>=1) score+=15;
 if(/cần báo giá|xin báo giá|cần gia công|cần sản xuất|bên nào làm|ai nhận làm|có xưởng nào/.test(h)) score+=8;
 score=Math.max(1,Math.min(99,score));
 let category=stamping?'Khuôn dập / dập kim loại':plastic?'Khuôn ép nhựa':cnc?'CNC / cơ khí':'Cơ khí / khuôn mẫu';
 let label=seller?'Đối thủ / bên bán dịch vụ':buyer&&need?'🔥 Người mua có nhu cầu rõ':buyer?'🟠 Đang tìm nhà cung cấp':growth&&need?'🟡 Lead phát triển sản phẩm':'Không đủ tín hiệu';
 return {score,seller,buyer,need,growth,noise,socialHost,category,label};
}
function simpleQueries(raw,industry){
 const ind=norm((industry||'Tất cả ngành').replace(/["'()]/g,' '));
 const suffix=ind&&ind!=='Tất cả ngành'?' '+ind:'';
 const r=lower(raw);
 const plastic=[
  `site:facebook.com/groups "cần" "khuôn ép nhựa"${suffix}`,
  `site:facebook.com "bên nào" "ép nhựa" "theo mẫu"${suffix}`,
  `site:facebook.com "cần gia công" "chi tiết nhựa"${suffix}`,
  `site:facebook.com "xin báo giá" "vỏ nhựa"${suffix}`,
  `"cần làm khuôn ép nhựa"${suffix} diễn đàn cơ khí`
 ];
 const stamping=[
  `site:facebook.com/groups "cần" "khuôn dập"${suffix}`,
  `site:facebook.com "bên nào" "dập kim loại" "theo bản vẽ"${suffix}`,
  `site:facebook.com "cần gia công" "chi tiết dập"${suffix}`,
  `site:facebook.com "xin báo giá" "dập tấm"${suffix}`,
  `site:facebook.com "tìm xưởng" "dập liên hoàn"${suffix}`,
  `"cần gia công chi tiết dập"${suffix} diễn đàn cơ khí`
 ];
 const cnc=[
  `site:facebook.com/groups "cần gia công CNC" "theo bản vẽ"${suffix}`,
  `site:facebook.com "bên nào nhận" "chi tiết máy"${suffix}`,
  `site:facebook.com "xin báo giá" "phay CNC"${suffix}`,
  `"cần gia công CNC"${suffix} diễn đàn cơ khí`
 ];
 if(r.includes('tất cả')||r.includes('tat ca')||r.includes('đa loại')) return [...plastic.slice(0,3),...stamping.slice(0,4),...cnc.slice(0,2)];
 if(r.includes('dập')||r.includes('dap')||r.includes('stamping')) return stamping;
 if(r.includes('cnc')||r.includes('cơ khí')||r.includes('co khi')) return cnc;
 return plastic;
}
async function serperSearch(key,q){
 const r=await fetch('https://google.serper.dev/search',{
   method:'POST',headers:{'X-API-KEY':key,'Content-Type':'application/json'},
   body:JSON.stringify({q,gl:'vn',hl:'vi',num:10})
 });
 const text=await r.text(); let data={}; try{data=JSON.parse(text)}catch{}
 if(!r.ok) throw new Error(`Serper HTTP ${r.status}: ${data.message||data.error||text.slice(0,160)}`);
 return Array.isArray(data.organic)?data.organic:[];
}

export default {async fetch(request,env){
 if(request.method==='OPTIONS') return new Response(null,{headers:CORS});
 const u=new URL(request.url);
 if(u.pathname==='/'||u.pathname==='/health') return json({ok:true,service:'Mold FREE Scanner Vietnam V1.0 SOCIAL-FIRST',market:'Việt Nam',ai:false,search:'Serper Free · downstream buyer intent',keyConfigured:!!env.SERPER_API_KEY});
 if(u.pathname!=='/scan') return json({ok:false,error:'Not found'},404);
 if(!env.SERPER_API_KEY) return json({ok:false,error:'Worker chưa có SERPER_API_KEY.'},500);
 const raw=(u.searchParams.get('keywords')||'khuôn ép nhựa').slice(0,100);
 const industry=(u.searchParams.get('industry')||'Tất cả ngành').slice(0,60);
 const queries=simpleQueries(raw,industry);
 let organic=[]; const errors=[];
 for(const q of queries){
   try{organic.push(...(await serperSearch(env.SERPER_API_KEY,q)).map(x=>({...x,_query:q})))}
   catch(e){errors.push(String(e.message||e))}
 }
 if(!organic.length) return json({ok:false,error:errors[0]||'Serper chưa trả được kết quả.',queries},502);

 let rejected=0, rejectedSeller=0, rejectedWeak=0;
 const mapped=organic.map(x=>{
   const c=classify(x.title||'',x.snippet||'',x.link||'');
   let domain=x.source||'Web Việt Nam'; try{domain=new URL(x.link).hostname}catch{}
   return {title:norm(x.title),url:x.link,domain,seendate:x.date||'',snippet:norm(x.snippet),score:c.score,leadType:c.label,isSeller:c.seller>0,buyerIntent:c.buyer,productNeed:c.part,growthSignal:c.growth,socialSignal:c.socialHost,matchedQuery:x._query};
 }).filter(x=>x.title&&/^https?:/i.test(x.url))
   .filter(x=>{
     // Không có buyer intent thì chỉ giữ khi đồng thời có nhu cầu sản phẩm + tín hiệu phát triển.
     const keep=!x.isSeller && x.score>=50 && (x.buyerIntent>=1 || (x.productNeed>=1 && x.growthSignal>=1));
     if(!keep){rejected++; if(x.isSeller)rejectedSeller++; else rejectedWeak++}
     return keep;
   });
 const seen=new Set();
 const out=mapped.filter(a=>{const k=(a.url||'').replace(/[#?].*$/,'');if(seen.has(k))return false;seen.add(k);return true})
   .sort((a,b)=>b.score-a.score).slice(0,12);
 return json({ok:true,market:'Việt Nam',source:'Serper Free · Social-First V1.0',queries,industry,count:out.length,rejected,rejectedSeller,rejectedWeak,articles:out,freeMode:true,ai:false,requestsUsed:queries.length,errors});
}};
