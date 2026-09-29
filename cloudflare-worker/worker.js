const CORS={
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept','Cache-Control':'public, max-age=300'
};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
const lower=s=>norm(s).toLowerCase();

// V0.9 BUYER-FIRST: tìm bên CẦN SẢN XUẤT, không tìm bên BÁN khuôn.
const sellerWords=[
 'nhận gia công','chuyên gia công','chuyên thiết kế','thiết kế chế tạo khuôn','chế tạo khuôn mẫu',
 'công ty khuôn mẫu','xưởng khuôn','dịch vụ làm khuôn','nhà sản xuất khuôn','sản xuất khuôn mẫu',
 'gia công khuôn mẫu theo yêu cầu','nhận làm khuôn','cung cấp khuôn','dịch vụ ép nhựa','nhận ép nhựa',
 'xưởng ép nhựa','công ty ép nhựa','chuyên ép nhựa','nhận sản xuất theo yêu cầu','dịch vụ cnc',
 'xưởng cnc','nhận gia công cnc','chuyên khuôn mẫu','mold maker','mold manufacturer','mould manufacturer'
];
const buyerIntent=[
 'cần tìm','đang tìm','tìm kiếm nhà cung cấp','tìm nhà cung cấp','tìm supplier','tìm vendor','tìm đối tác',
 'cần đối tác','cần báo giá','yêu cầu báo giá','mời báo giá','mời chào giá','mời thầu','chào giá cạnh tranh',
 'rfq','request for quotation','cần gia công','thuê gia công','tìm đơn vị','cần sản xuất','đặt sản xuất',
 'đặt hàng','cần làm mẫu','sản xuất thử','cần mẫu thử','tìm nguồn cung','tìm nguồn hàng'
];
const productNeed=[
 'chi tiết nhựa','linh kiện nhựa','vỏ nhựa','sản phẩm nhựa','phụ tùng nhựa','plastic part','plastic parts',
 'plastic component','injection molded','injection molding part','abs','pp','pc','pa66','pom','tpe','tpu',
 'prototype','mẫu 3d','bản vẽ 3d','bản vẽ kỹ thuật','theo bản vẽ','theo mẫu','oem','odm'
];
const growthSignals=[
 'phát triển sản phẩm','sản phẩm mới','dự án mới','ra mắt sản phẩm','r&d','nghiên cứu phát triển',
 'mở rộng sản xuất','mở rộng nhà máy','nhà máy mới','tăng công suất','nội địa hóa','localization',
 'chuỗi cung ứng','supply chain','purchasing','procurement','mua hàng','sourcing','supplier development'
];
const industrialWords=['điện tử','ô tô','xe máy','đồ gia dụng','thiết bị y tế','bao bì','linh kiện','nhà máy','sản xuất','oem','fdi','cơ khí','thiết bị','nhựa'];
const noiseWords=['khóa học','đào tạo','rao bán máy','bán máy ép','máy ép nhựa cũ','máy cnc cũ','pinterest','youtube','wiki','từ điển','định nghĩa'];

function hits(h,words){return words.filter(w=>h.includes(w)).length}
function classify(title,snippet,url){
 const h=lower(title+' '+snippet), host=lower(url);
 const seller=hits(h,sellerWords), buyer=hits(h,buyerIntent), part=hits(h,productNeed), growth=hits(h,growthSignals), industrial=hits(h,industrialWords), noise=hits(h,noiseWords);
 const procurementHost=/dauthau|muasamcong|procurement|supplier|vendor|bid|tender/i.test(host);
 const socialHost=/facebook\.com|groups\.google|forum|diendan/i.test(host);
 // Buyer intent là điều kiện mạnh nhất. Product need + growth là lead gián tiếp.
 let score=8 + (socialHost?10:0) + buyer*30 + Math.min(part,3)*10 + Math.min(growth,2)*10 + Math.min(industrial,3)*3 + (procurementHost?12:0) - seller*45 - noise*20;
 if(buyer>=1 && part>=1) score+=12;
 if(buyer>=1 && /báo giá|chào giá|rfq|mời thầu|cần sản xuất|cần gia công/.test(h)) score+=8;
 score=Math.max(1,Math.min(99,score));
 let label='Không đủ tín hiệu';
 if(seller>0) label='Đối thủ / bên bán dịch vụ';
 else if(buyer>=1 && part>=1) label='🔥 Nhu cầu sản xuất rõ';
 else if(buyer>=1) label='🟠 Có tín hiệu mua';
 else if(part>=1 && growth>=1) label='🟡 Lead phát triển sản phẩm';
 else if(growth>=1 && industrial>=1) label='🟡 Lead gián tiếp';
 return {score,seller,buyer,part,growth,industrial,noise,procurementHost,socialHost,label};
}

function simpleQueries(raw,industry){
 const ind=norm((industry||'Tất cả ngành').replace(/["'()]/g,' '));
 const suffix=ind && ind!=='Tất cả ngành' ? ' '+ind : '';
 const r=lower(raw);
 // V1.0 SOCIAL-FIRST: ưu tiên nơi người thật thường hỏi việc/cần vendor.
 // Serper chỉ nhìn thấy nội dung PUBLIC đã được search engine index; không vượt đăng nhập hay nhóm riêng tư.
 if(r.includes('dập')) return [
   `site:facebook.com cần gia công chi tiết dập theo bản vẽ${suffix}`,
   `site:facebook.com/groups cần xưởng dập kim loại${suffix}`,
   `site:facebook.com tìm xưởng cơ khí dập chi tiết${suffix}`,
   `cần gia công chi tiết dập theo bản vẽ${suffix} diễn đàn cơ khí`,
   `tìm xưởng dập kim loại số lượng${suffix} Việt Nam`
 ];
 if(r.includes('cnc')) return [
   `site:facebook.com cần gia công CNC theo bản vẽ${suffix}`,
   `site:facebook.com/groups tìm xưởng CNC${suffix}`,
   `site:facebook.com cần làm chi tiết máy số lượng${suffix}`,
   `cần gia công CNC theo bản vẽ${suffix} diễn đàn cơ khí`,
   `tìm xưởng gia công chi tiết máy${suffix} Việt Nam`
 ];
 return [
   `site:facebook.com cần làm khuôn ép nhựa${suffix}`,
   `site:facebook.com/groups cần làm khuôn ép nhựa${suffix}`,
   `site:facebook.com tìm xưởng làm khuôn nhựa theo mẫu${suffix}`,
   `site:facebook.com cần ép nhựa theo mẫu số lượng${suffix}`,
   `site:facebook.com cần gia công vỏ nhựa ABS theo bản vẽ${suffix}`,
   `cần làm khuôn ép nhựa${suffix} diễn đàn cơ khí`,
   `tìm xưởng làm khuôn nhựa theo mẫu${suffix} Việt Nam`
 ];
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
