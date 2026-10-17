import { Award, Heart, Leaf, Users } from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useLanguage } from "@/features/settings/context/language-context";

export function AboutPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <section className="relative h-[500px] bg-gradient-to-b from-muted to-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-6xl tracking-wider lg:text-7xl">{t("VỀ CHÚNG TÔI", "ABOUT US")}</h1>
            <p className="mx-auto max-w-2xl px-4 text-xl text-muted-foreground">
              {t("Câu chuyện về đam mê, nghệ thuật và thời trang bền vững", "A story of passion, art and sustainable fashion")}
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl">MADMAD STUDIO</h2>
              <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
                <p>{t("Được thành lập vào năm 2020, MADMAD Studio ra đời từ niềm đam mê với thời trang và mong muốn tạo ra những sản phẩm không chỉ đẹp mà còn bền vững.", "Founded in 2020, MADMAD Studio was born from a passion for fashion and the desire to create products that are not only beautiful but also sustainable.")}</p>
                <p>{t("Chúng tôi tin rằng thời trang là nghệ thuật, là cách con người thể hiện bản sắc và cá tính riêng. Mỗi thiết kế của MADMAD đều mang trong mình một câu chuyện, một thông điệp về vẻ đẹp vượt thời gian.", "We believe fashion is art — a way for people to express their identity and individuality. Every MADMAD design carries a story, a message about timeless beauty.")}</p>
                <p>{t("Với phong cách tối giản nhưng tinh tế, chúng tôi kết hợp giữa nét đẹp cổ điển và xu hướng đương đại, tạo nên những bộ sưu tập độc đáo dành cho người phụ nữ hiện đại, tự tin và yêu bản thân.", "With a minimalist yet refined style, we blend classic beauty with contemporary trends to create unique collections for the modern, confident woman who loves herself.")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <ImageWithFallback src="https://images.unsplash.com/photo-1557161622-5f50ca344787?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800" alt="MADMAD Studio 1" className="aspect-[3/4] w-full rounded-lg object-cover" />
              </div>
              <div className="space-y-4 pt-8">
                <ImageWithFallback src="https://images.unsplash.com/photo-1761581444836-a01b1341cca3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800" alt="MADMAD Studio 2" className="aspect-[3/4] w-full rounded-lg object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl">{t("GIÁ TRỊ CỐT LÕI", "CORE VALUES")}</h2>
            <p className="text-lg text-muted-foreground">{t("Những giá trị mà chúng tôi theo đuổi và cam kết", "The values we pursue and stand by")}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[{
              icon: Heart, title: t("Đam Mê", "Passion"), description: t("Yêu nghề, yêu sản phẩm và yêu khách hàng là động lực của chúng tôi", "Love for the craft, the product and our customers drives us"),
            }, {
              icon: Award, title: t("Chất Lượng", "Quality"), description: t("Từng đường may, từng chi tiết đều được chăm chút tỉ mỉ", "Every stitch and detail is crafted with care"),
            }, {
              icon: Leaf, title: t("Bền Vững", "Sustainability"), description: t("Thời trang thân thiện môi trường cho tương lai xanh", "Eco-friendly fashion for a greener future"),
            }, {
              icon: Users, title: t("Cộng Đồng", "Community"), description: t("Xây dựng cộng đồng yêu thời trang và phong cách sống tích cực", "Building a community that loves fashion and positive living"),
            }].map((item) => (
              <div key={item.title} className="space-y-4 text-center">
                <div className="inline-flex rounded-full bg-primary/10 p-6">
                  <item.icon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
