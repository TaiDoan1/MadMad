import { useState, type FormEvent } from "react";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    window.alert("Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative h-[400px] bg-gradient-to-b from-muted to-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-6xl tracking-wider lg:text-7xl">LIÊN HỆ</h1>
            <p className="mx-auto max-w-2xl px-4 text-xl text-muted-foreground">Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn</p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h2 className="mb-6 text-4xl">THÔNG TIN LIÊN HỆ</h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Hãy liên hệ với chúng tôi qua các kênh dưới đây. Team MADMAD luôn sẵn sàng tư vấn và hỗ trợ bạn về sản phẩm, đơn hàng và mọi thắc mắc khác.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { icon: MapPin, title: "Địa Chỉ Cửa Hàng", body: "123 Đường Nguyễn Huệ, Quận 1\nThành phố Hồ Chí Minh, Việt Nam" },
                  { icon: Phone, title: "Số Điện Thoại", body: "Hotline: +84 123 456 789\nZalo: +84 987 654 321" },
                  { icon: Mail, title: "Email", body: "Hỗ trợ: support@madmad.studio\nHợp tác: contact@madmad.studio" },
                  { icon: Clock, title: "Giờ Mở Cửa", body: "Thứ 2 - Thứ 7: 9:00 - 21:00\nChủ nhật: 10:00 - 20:00" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 rounded-lg bg-card p-6">
                    <div className="flex-shrink-0 rounded-full bg-primary/10 p-3">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="mb-2">{item.title}</h4>
                      <p className="whitespace-pre-line text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-card p-8">
              <h3 className="mb-6 text-3xl">GỬI TIN NHẮN</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <input className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Họ và Tên *" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required />
                <input className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Email *" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required type="email" />
                <input className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Số Điện Thoại" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                <select className="w-full rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" value={formData.subject} onChange={(event) => setFormData({ ...formData, subject: event.target.value })} required>
                  <option value="">Chọn chủ đề</option>
                  <option value="product">Tư vấn sản phẩm</option>
                  <option value="order">Đơn hàng</option>
                  <option value="return">Đổi trả</option>
                  <option value="partnership">Hợp tác kinh doanh</option>
                  <option value="other">Khác</option>
                </select>
                <textarea className="w-full resize-none rounded border border-border bg-input-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Nhập nội dung tin nhắn của bạn..." value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} rows={6} required />
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded bg-primary py-4 text-lg font-semibold text-white transition-colors hover:bg-primary/90">
                  <Send className="h-5 w-5" />
                  Gửi Tin Nhắn
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
