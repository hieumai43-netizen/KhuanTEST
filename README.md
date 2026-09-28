# KhuanTEST FREE VN V0.8.1 — Buyer Finder

- Không dùng OpenAI.
- Cloudflare Worker + Serper Free.
- Sửa lỗi `Query pattern not allowed for free accounts`: không dùng OR/ngoặc/negative operators trong query.
- Mỗi lần quét dùng tối đa 3 truy vấn tự nhiên, sau đó Worker tự chấm điểm buyer intent và loại seller/đối thủ.
- Giữ nguyên `SERPER_API_KEY` Secret hiện có trên Cloudflare.
