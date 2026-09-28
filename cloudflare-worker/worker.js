const CORS={
  'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Accept','Cache-Control':'public, max-age=600'
};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const clean=s=>(s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const tag=(b,t)=>{const m=b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`,'i'));return m?clean(m[1]):''};
const decode=s=>{try{return decodeURIComponent(s)}catch{return s}};
function scoreItem(title,terms){const h=title.toLowerCase();let s=45;for(const w of terms)if(h.includes(w.toLowerCase()))s+=9;for(const w of ['cần','tìm','đặt','gia công','khuôn','nhà cung cấp','sản xuất','nhà máy','doanh nghiệp','đầu tư','cơ khí','nhựa'])if(h.includes(w))s+=3;return Math.min(96,s)}
function rssItems(xml,terms,sourceName){return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>m[1]).map(b=>{const title=tag(b,'title'),url=tag(b,'link')||tag(b,'guid'),pubDate=tag(b,'pubDate')||tag(b,'date'),source=tag(b,'source')||sourceName;return {title,url,domain:source,seendate:pubDate,score:scoreItem(title+' '+source,terms)}}).filter(x=>x.title&&/^https?:/i.test(x.url));}
function ddgItems(html,terms){const out=[];const re=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;let m;while((m=re.exec(html))&&out.length<20){let url=m[1];const u=url.match(/[?&]uddg=([^&]+)/);if(u)url=decode(u[1]);const title=clean(m[2]);if(title&&/^https?:/i.test(url))out.push({title,url,domain:'DuckDuckGo',seendate:'',score:scoreItem(title,terms)});}return out;}
async function fetchText(url,accept){const r=await fetch(url,{headers:{'Accept':accept||'text/html,*/*','User-Agent':'Mozilla/5.0 (compatible; MoldLeadFinder/0.6; +https://workers.dev)'}});const text=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status}`);return text;}
export default {async fetch(request){
 if(request.method==='OPTIONS')return new Response(null,{headers:CORS});
 const u=new URL(request.url);
 if(u.pathname==='/'||u.pathname==='/health')return json({ok:true,service:'Mold FREE Scanner Vietnam V0.6',market:'Việt Nam',ai:false,sources:['Bing News RSS','DuckDuckGo','Google News RSS fallback']});
 if(u.pathname!=='/scan')return json({ok:false,error:'Not found'},404);
 const raw=(u.searchParams.get('keywords')||'khuôn ép nhựa').slice(0,180);
 const words=raw.split(/[,，、;]+/).map(x=>x.trim()).filter(Boolean).slice(0,5);
 const terms=[...new Set([...words,'khuôn ép nhựa','gia công khuôn','chế tạo khuôn'])].slice(0,6);
 const q='('+terms.map(x=>'"'+x.replace(/"/g,'')+'"').join(' OR ')+') (cần OR tìm OR đặt OR gia công OR sản xuất OR nhà máy OR doanh nghiệp) Vietnam';
 const attempts=[];let articles=[];let source='';
 // 1) Bing News RSS: no API key, usually friendly to server-side fetch.
 try{const url='https://www.bing.com/news/search?q='+encodeURIComponent(q)+'&format=rss&setlang=vi-vn';const t=await fetchText(url,'application/rss+xml,application/xml,text/xml');articles=rssItems(t,terms,'Bing News');attempts.push({source:'Bing News RSS',ok:true,count:articles.length});if(articles.length)source='Bing News RSS';}catch(e){attempts.push({source:'Bing News RSS',ok:false,error:String(e.message||e)});}
 // 2) DuckDuckGo HTML fallback.
 if(!articles.length)try{const url='https://html.duckduckgo.com/html/?q='+encodeURIComponent(q);const t=await fetchText(url,'text/html');articles=ddgItems(t,terms);attempts.push({source:'DuckDuckGo',ok:true,count:articles.length});if(articles.length)source='DuckDuckGo';}catch(e){attempts.push({source:'DuckDuckGo',ok:false,error:String(e.message||e)});}
 // 3) Google News RSS only as final fallback (it may return 503 from some Worker POPs).
 if(!articles.length)try{const url='https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=vi&gl=VN&ceid=VN:vi';const t=await fetchText(url,'application/rss+xml,application/xml,text/xml');articles=rssItems(t,terms,'Google News');attempts.push({source:'Google News RSS',ok:true,count:articles.length});if(articles.length)source='Google News RSS';}catch(e){attempts.push({source:'Google News RSS',ok:false,error:String(e.message||e)});}
 const seen=new Set();articles=articles.filter(a=>{const k=a.url.replace(/[#?].*$/,'');if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>b.score-a.score).slice(0,20);
 if(!articles.length)return json({ok:false,error:'Các nguồn miễn phí hiện chưa trả được kết quả. Hãy thử lại sau hoặc đổi từ khóa.',attempts,query:q},502);
 return json({ok:true,market:'Việt Nam',source,query:q,count:articles.length,articles,attempts});
}};
