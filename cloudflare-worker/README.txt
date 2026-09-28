MOLD FREE SCANNER VIETNAM V0.7

Mục tiêu: test quét web Việt Nam không dùng OpenAI.
Nguồn tìm kiếm: Serper Google Search API. Serper hiện cho tài khoản mới 2.500 truy vấn miễn phí, không cần thẻ.

CÀI ĐẶT:
1. Tạo tài khoản tại https://serper.dev và copy API key.
2. Cloudflare > Workers & Pages > khuan-free-scanner > Edit code.
3. Thay toàn bộ code bằng worker.js này và Deploy.
4. Worker > Settings > Variables and Secrets > Add > Secret.
   Name: SERPER_API_KEY
   Value: API key lấy từ Serper
5. Save/Deploy.
6. Mở URL Worker. keyConfigured phải là true.
7. Cập nhật app GitHub Pages bằng file V0.7 rồi bấm Quét ngay.

Lưu ý: API key chỉ nằm trong Cloudflare Secret, không đưa vào app/GitHub.
Mỗi lần Quét = 1 request Serper (tối đa 10 kết quả), không gọi OpenAI.
