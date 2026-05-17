import { Award, Heart, Leaf, Users } from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative h-[500px] bg-gradient-to-b from-muted to-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-6xl tracking-wider lg:text-7xl">VỀ CHÚNG TÔI</h1>
            <p className="mx-auto max-w-2xl px-4 text-xl text-muted-foreground">
              Câu chuyện về đam mê, nghệ thuật và thời trang bền vững
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
                <p>Được thành lập vào năm 2020, MADMAD Studio ra đời từ niềm đam mê với thời trang và mong muốn tạo ra những sản phẩm không chỉ đẹp mà còn bền vững.</p>
                <p>Chúng tôi tin rằng thời trang là nghệ thuật, là cách con người thể hiện bản sắc và cá tính riêng. Mỗi thiết kế của MADMAD đều mang trong mình một câu chuyện, một thông điệp về vẻ đẹp vượt thời gian.</p>
                <p>Với phong cách tối giản nhưng tinh tế, chúng tôi kết hợp giữa nét đẹp cổ điển và xu hướng đương đại, tạo nên những bộ sưu tập độc đáo dành cho người phụ nữ hiện đại, tự tin và yêu bản thân.</p>
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
            <h2 className="mb-4 text-4xl">GIÁ TRỊ CỐT LÕI</h2>
            <p className="text-lg text-muted-foreground">Những giá trị mà chúng tôi theo đuổi và cam kết</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[{
              icon: Heart, title: "Đam Mê", description: "Yêu nghề, yêu sản phẩm và yêu khách hàng là động lực của chúng tôi",
            }, {
              icon: Award, title: "Chất Lượng", description: "Từng đường may, từng chi tiết đều được chăm chút tỉ mỉ",
            }, {
              icon: Leaf, title: "Bền Vững", description: "Thời trang thân thiện môi trường cho tương lai xanh",
            }, {
              icon: Users, title: "Cộng Đồng", description: "Xây dựng cộng đồng yêu thời trang và phong cách sống tích cực",
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
