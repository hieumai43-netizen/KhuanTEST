# Mold Lead Finder – FREE Scanner V0.4

Bản test quét lead không dùng OpenAI API. V0.4 thêm Cloudflare Worker FREE làm proxy để tránh lỗi JSON/CORS khi GitHub Pages gọi nguồn web trực tiếp.

## Cài lần đầu
1. Đưa app lên GitHub Pages như bản cũ.
2. Vào thư mục `cloudflare-worker`, mở `worker.js`.
3. Cloudflare Dashboard → Workers & Pages → Create Worker → dán toàn bộ `worker.js` → Deploy.
4. Mở URL `https://...workers.dev`; nếu hiện `{"ok":true,...}` là thành công.
5. Trong app → Tổng quan → `⚙️ Cài Worker FREE` → dán URL Worker.
6. Bấm `🔍 Quét ngay`.

Không cần `OPENAI_API_KEY` và không tốn token OpenAI. Kết quả là tín hiệu web công khai, nên luôn mở `Nguồn` để xác minh trước khi liên hệ.
