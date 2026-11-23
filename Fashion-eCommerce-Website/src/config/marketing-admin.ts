// File này trước đây chứa hằng mật khẩu xóa phiếu marketing hardcode trong code.
// Đã gỡ trong đợt sửa bảo mật 23/11/2026: mật khẩu giờ chỉ nằm trong biến môi
// trường MARKETING_ADMIN_PASSWORD trên server, server kiểm tra khi xóa phiếu.
// File giữ lại rỗng để việc xóa giá trị cũ đi qua được luồng đẩy snapshot
// (luồng này không hỗ trợ xóa file). Không còn export nào ở đây.
export {};
