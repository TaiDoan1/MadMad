import { useState, type FormEvent } from "react";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { useLanguage } from "@/features/settings/context/language-context";

export function ContactPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    window.alert(t("Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.", "Thank you for contacting us! We will respond as soon as possible."));
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sleek Hero Header */}
      <section className="bg-white border-b border-black/10 py-20">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[0.2em] text-black uppercase">
            {t("LIÊN HỆ", "CONTACT US")}
          </h1>
          <p className="mt-4 text-xs uppercase tracking-widest text-black/40 max-w-xl mx-auto">
            {t("Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn", "We are always ready to listen and support you")}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            
            {/* Left side: Info */}
            <div className="space-y-10">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-red-700 mb-4">
                  {t("THÔNG TIN LIÊN HỆ", "CONTACT INFO")}
                </h2>
                <p className="text-sm font-medium leading-relaxed text-black/60 max-w-lg">
                  {t("Hãy liên hệ với chúng tôi qua các kênh dưới đây. Team MADMAD luôn sẵn sàng tư vấn và hỗ trợ bạn về sản phẩm, đơn hàng và mọi thắc mắc khác.", "Get in touch with us through the channels below. Team MADMAD is always ready to advise and assist you with products, orders, and any other inquiries.")}
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: MapPin, title: t("Địa Chỉ Cửa Hàng", "Store Address"), body: t("123 Đường Nguyễn Huệ, Quận 1\nThành phố Hồ Chí Minh, Việt Nam", "123 Nguyen Hue Street, District 1\nHo Chi Minh City, Vietnam") },
                  { icon: Phone, title: t("Số Điện Thoại", "Phone Number"), body: t("Hotline: +84 123 456 789\nZalo: +84 987 654 321", "Hotline: +84 123 456 789\nZalo: +84 987 654 321") },
                  { icon: Mail, title: t("Email", "Email"), body: t("Hỗ trợ: support@madmad.studio\nHợp tác: contact@madmad.studio", "Support: support@madmad.studio\nPartnership: contact@madmad.studio") },
                  { icon: Clock, title: t("Giờ Mở Cửa", "Opening Hours"), body: t("Thứ 2 - Thứ 7: 9:00 - 21:00\nChủ nhật: 10:00 - 20:00", "Monday - Saturday: 9:00 AM - 9:00 PM\nSunday: 10:00 AM - 8:00 PM") },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-5 border border-black/10 p-6 bg-stone-50/50 hover:bg-stone-50 hover:border-black/25 transition-all duration-300">
                    <div className="flex-shrink-0 bg-black text-white p-2.5">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-black mb-2">{item.title}</h4>
                      <p className="whitespace-pre-line text-xs font-semibold text-black/50 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Form */}
            <div className="border border-black p-8 sm:p-10 bg-white">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black mb-8 border-b border-black/10 pb-4">
                {t("GỬI TIN NHẮN", "SEND MESSAGE")}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <input 
                  className="w-full rounded-none border border-black/20 bg-stone-50/30 px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-black placeholder:text-black/30 focus:border-red-700 focus:bg-white focus:outline-none focus:ring-0 transition-all duration-300" 
                  placeholder={t("Họ và Tên *", "Full Name *")} 
                  value={formData.name} 
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })} 
                  required 
                />
                <input 
                  className="w-full rounded-none border border-black/20 bg-stone-50/30 px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-black placeholder:text-black/30 focus:border-red-700 focus:bg-white focus:outline-none focus:ring-0 transition-all duration-300" 
                  placeholder={t("Email *", "Email *")} 
                  value={formData.email} 
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })} 
                  required 
                  type="email" 
                />
                <input 
                  className="w-full rounded-none border border-black/20 bg-stone-50/30 px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-black placeholder:text-black/30 focus:border-red-700 focus:bg-white focus:outline-none focus:ring-0 transition-all duration-300" 
                  placeholder={t("Số Điện Thoại", "Phone Number")} 
                  value={formData.phone} 
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })} 
                />
                <select 
                  className="w-full rounded-none border border-black/20 bg-stone-50/30 px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-black focus:border-red-700 focus:bg-white focus:outline-none focus:ring-0 transition-all duration-300 cursor-pointer" 
                  value={formData.subject} 
                  onChange={(event) => setFormData({ ...formData, subject: event.target.value })} 
                  required
                >
                  <option value="" className="text-black/50">{t("Chọn chủ đề", "Select subject")}</option>
                  <option value="product">{t("Tư vấn sản phẩm", "Product inquiry")}</option>
                  <option value="order">{t("Đơn hàng", "Order support")}</option>
                  <option value="return">{t("Đổi trả", "Returns & Exchanges")}</option>
                  <option value="partnership">{t("Hợp tác kinh doanh", "Business partnership")}</option>
                  <option value="other">{t("Khác", "Other")}</option>
                </select>
                <textarea 
                  className="w-full resize-none rounded-none border border-black/20 bg-stone-50/30 px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-black placeholder:text-black/30 focus:border-red-700 focus:bg-white focus:outline-none focus:ring-0 transition-all duration-300" 
                  placeholder={t("Nhập nội dung tin nhắn của bạn...", "Enter your message here...")} 
                  value={formData.message} 
                  onChange={(event) => setFormData({ ...formData, message: event.target.value })} 
                  rows={5} 
                  required 
                />
                <button 
                  type="submit" 
                  className="flex w-full items-center justify-center gap-2 rounded-none bg-black py-4 text-xs font-black uppercase tracking-widest text-white transition-all duration-500 hover:bg-red-700 hover:tracking-[0.2em]"
                >
                  <Send className="h-3.5 w-3.5" />
                  {t("Gửi Tin Nhắn", "Send Message")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
