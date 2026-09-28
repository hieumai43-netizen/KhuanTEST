const CORS={
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept','Cache-Control':'public, max-age=300'
};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
const lower=s=>norm(s).toLowerCase();

// Các cụm cho thấy đây là bên BÁN dịch vụ khuôn/ép nhựa, không phải buyer.
const sellerWords=[
 'nhận gia công','chuyên gia công','chuyên thiết kế khuôn','thiết kế chế tạo khuôn','chế tạo khuôn mẫu',
 'công ty khuôn mẫu','xưởng khuôn','dịch vụ làm khuôn','nhà sản xuất khuôn','sản xuất khuôn mẫu',
 'gia công khuôn mẫu theo yêu cầu','nhận làm khuôn','cung cấp khuôn','báo giá khuôn ép nhựa','dịch vụ ép nhựa',
 'nhận ép nhựa','xưởng ép nhựa','công ty ép nhựa'
];
const strongIntent=['cần tìm','tìm nhà cung cấp','tìm đối tác','cần đối tác','cần báo giá','yêu cầu báo giá','mời báo giá','mời chào giá','mời thầu','rfq','rfi','đặt hàng','cần gia công','thuê gia công','tìm đơn vị'];
const weakIntent=['phát triển sản phẩm','sản phẩm mới','dự án mới','mở rộng sản xuất','mở rộng nhà máy','nhà máy mới','nội địa hóa','tìm nguồn cung','chuỗi cung ứng','mua hàng','purchasing','procurement'];
const industrialWords=['điện tử','ô tô','xe máy','đồ gia dụng','thiết bị y tế','bao bì','linh kiện','nhựa','nhà máy','sản xuất','oem','fdi'];
const noiseWords=['tuyển dụng','việc làm','khóa học','đào tạo','rao bán','bán máy','máy ép nhựa cũ','facebook','pinterest','youtube'];

function classify(title,snippet,url){
 const h=lower(title+' '+snippet);
 const seller=sellerWords.filter(w=>h.includes(w)).length;
 const strong=strongIntent.filter(w=>h.includes(w)).length;
 const weak=weakIntent.filter(w=>h.includes(w)).length;
 const industrial=industrialWords.filter(w=>h.includes(w)).length;
 const noise=noiseWords.filter(w=>h.includes(w)).length;
 let score=24 + strong*24 + weak*9 + Math.min(industrial,3)*4 - seller*34 - noise*18;
 // Các cổng đấu thầu/mua sắm là tín hiệu buyer tốt hơn website quảng cáo thông thường.
 if(/dauthau|muasamcong|procurement|supplier|vendor/i.test(url||'')) score+=12;
 score=Math.max(1,Math.min(99,score));
 let label='Tham khảo';
 if(seller>0) label='Đối thủ / nhà cung cấp';
 else if(strong>=2) label='Nhu cầu rất rõ';
 else if(strong===1) label='Có tín hiệu mua';
 else if(weak>=1 && industrial>=1) label='Khách tiềm năng gián tiếp';
 return {score,seller,strong,weak,industrial,label};
}

// Serper Free không chấp nhận query pattern phức tạp. Chỉ dùng câu tìm kiếm tự nhiên, không OR/ngoặc/-term.
function simpleQueries(raw,industry){
 const product=norm((raw||'khuôn ép nhựa').replace(/["'()]/g,' ')).slice(0,70);
 const ind=norm((industry||'Tất cả ngành').replace(/["'()]/g,' '));
 const suffix=ind && ind!=='Tất cả ngành' ? ' '+ind : '';
 // Tối đa 3 search/scan: ưu tiên ý định mua rõ ràng, không search tên dịch vụ đơn thuần.
 return [
   `cần tìm nhà cung cấp ${product}${suffix} Việt Nam`,
   `mời báo giá gia công linh kiện nhựa${suffix} Việt Nam`,
   `tìm đối tác sản xuất chi tiết nhựa${suffix} Việt Nam`
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
 if(u.pathname==='/'||u.pathname==='/health') return json({ok:true,service:'Mold FREE Scanner Vietnam V0.8.1 BUYER FINDER',market:'Việt Nam',ai:false,search:'Serper Free · simple queries',keyConfigured:!!env.SERPER_API_KEY});
 if(u.pathname!=='/scan') return json({ok:false,error:'Not found'},404);
 if(!env.SERPER_API_KEY) return json({ok:false,error:'Worker chưa có SERPER_API_KEY.'},500);
 const raw=(u.searchParams.get('keywords')||'khuôn ép nhựa').slice(0,100);
 const industry=(u.searchParams.get('industry')||'Tất cả ngành').slice(0,60);
 const queries=simpleQueries(raw,industry);
 let organic=[]; const errors=[];
 for(const q of queries){
   try{ organic.push(...(await serperSearch(env.SERPER_API_KEY,q)).map(x=>({...x,_query:q}))); }
   catch(e){ errors.push(String(e.message||e)); }
 }
 if(!organic.length) return json({ok:false,error:errors[0]||'Serper chưa trả được kết quả.',queries},502);

 let rejected=0;
 const mapped=organic.map(x=>{
   const c=classify(x.title||'',x.snippet||'',x.link||'');
   let domain=x.source||'Web Việt Nam'; try{domain=new URL(x.link).hostname}catch{}
   return {title:norm(x.title),url:x.link,domain,seendate:x.date||'',snippet:norm(x.snippet),score:c.score,leadType:c.label,isSeller:c.seller>0,strongIntent:c.strong,weakIntent:c.weak,matchedQuery:x._query};
 }).filter(x=>x.title&&/^https?:/i.test(x.url))
   .filter(x=>{ // V0.8.1 siết chặt: phải có intent hoặc tín hiệu gián tiếp đủ mạnh; seller loại luôn.
      const keep=!x.isSeller && (x.strongIntent>=1 || (x.weakIntent>=1 && x.score>=45)) && x.score>=45;
      if(!keep) rejected++; return keep;
   });
 const seen=new Set();
 const out=mapped.filter(a=>{const k=(a.url||'').replace(/[#?].*$/,''); if(seen.has(k))return false; seen.add(k); return true;})
   .sort((a,b)=>b.score-a.score).slice(0,12);
 return json({ok:true,market:'Việt Nam',source:'Serper Free · Buyer Finder V0.8.1',queries,industry,count:out.length,rejected,articles:out,freeMode:true,ai:false,requestsUsed:queries.length,errors});
}};
