# Chusen Manager – Firestore approval fixed (v10)

Bản này sửa lỗi tài khoản đã xuất hiện trong Firebase Authentication nhưng không có yêu cầu chờ duyệt trong Firestore.

## Điểm đã sửa

- Khi đăng ký, app tạo hồ sơ `users/{uid}` với `status: pending`.
- Các tài khoản đã tạo ở bản cũ nhưng bị thiếu hồ sơ Firestore sẽ được **tự động khôi phục** khi đăng nhập lại.
- Nếu Firestore Rules chưa được Publish, app hiện đúng hướng dẫn thay vì báo lỗi mơ hồ.
- Quản trị viên thấy huy hiệu số tài khoản chờ duyệt và có thể Duyệt / Chờ / Khóa.
- Tăng cache lên v10 để GitHub Pages và iPhone tải code mới.

## Bước bắt buộc duy nhất trong Firebase

Firebase Console → Firestore Database → **Rules**.

1. Mở file `firestore.rules` trong gói này.
2. Copy toàn bộ nội dung.
3. Dán đè vào cửa sổ Rules.
4. Bấm **Publish**.

Nếu chưa Publish Rules thì không có code phía trình duyệt nào có thể ghi dữ liệu vào Firestore.

## Cách cập nhật GitHub

Giải nén ZIP rồi tải **toàn bộ file và thư mục bên trong** lên repository GitHub Pages, ghi đè bản cũ. Sau đó mở app và tải lại trang.

## Cách khôi phục 2 email đã đăng ký trước đó

Sau khi Publish Rules và cập nhật bản v10:

1. Đăng nhập bằng từng email đã đăng ký trước đó.
2. App tự tạo hồ sơ `pending` còn thiếu.
3. Đăng nhập tài khoản quản trị `hieumai43@gmail.com`.
4. Bấm **👑 Duyệt tài khoản** và phê duyệt.
