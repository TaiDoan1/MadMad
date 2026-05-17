import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu (Seed Data)...");

  // 1. Nạp cấu hình Storefront mặc định (Setting)
  const defaultSetting = await prisma.storefrontSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      brandName: "MADMAD STUDIO",
      logoUrl: "https://images.unsplash.com/photo-1582230303655-40b7a5bc0db0?w=200", // placeholder logo
      manifestoSlogan: "NOIR NO DESIGN STANDARD . TỐI GIẢN . ĐỘC BẢN . CAO CẤP",
      facebookUrl: "https://facebook.com/madmad.studio",
      instagramUrl: "https://instagram.com/madmad.studio",
      tiktokUrl: "https://tiktok.com/@madmad.studio",
      shopeeUrl: "https://shopee.vn/madmad.studio",
      instagramImages: JSON.stringify([
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600",
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600",
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600"
      ]),
      printInvoiceTitle: "HÓA ĐƠN VẬN CHUYỂN & GÓI HÀNG",
      printInvoiceAddress: "Showroom: 254 Nguyễn Trãi, Q.5, TP.HCM",
      printInvoicePhone: "Hotline: 099.999.9999",
      printInvoiceFooterSlogan: "CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!",
      printInvoicePolicy: "* Quý khách vui lòng kiểm tra kỹ sản phẩm khi nhận hàng. Đối với các yêu cầu đổi trả sản phẩm nguyên tag mác, xin hãy nhắn tin trực tiếp fanpage Facebook/Instagram của MADMAD Studio trong vòng 3 ngày kể từ ngày nhận hàng."
    }
  });
  console.log("✅ Đã nạp cấu hình Storefront Settings.");

  // 2. Nạp dữ liệu sản phẩm (Products)
  const productsData = [
    {
      name: "Oversized Cyber-Noir Trenchcoat",
      sku: "MAD-TR-01",
      price: 1850000,
      image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600",
      category: "outerwear",
      description: "Áo khoác dáng dài thiết kế Cyber-Noir cao cấp, chất liệu chống thấm nước nhẹ, form oversized tôn dáng thượng đẳng.",
      sizes: "S,M,L,XL",
      colors: "Black,Grey",
      colorImages: JSON.stringify({
        "Black": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600",
        "Grey": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600"
      }),
      isFeatured: true
    },
    {
      name: "Deconstructed Asymmetric Blazer",
      sku: "MAD-BL-02",
      price: 1450000,
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
      category: "outerwear",
      description: "Blazer cấu trúc bất đối xứng phong cách Avant-Garde, đường cắt may thủ công cao cấp tạo sự cá tính khác biệt.",
      sizes: "S,M,L",
      colors: "Charcoal,Black",
      colorImages: JSON.stringify({
        "Charcoal": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
        "Black": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600"
      }),
      isFeatured: true
    },
    {
      name: "Noir Minimalist Drop-shoulder Tee",
      sku: "MAD-TE-03",
      price: 420000,
      image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
      category: "tops",
      description: "Tee vai trễ tối giản, chất liệu 100% Premium Eco-Cotton siêu dày mịn, thoáng mát, bền bỉ.",
      sizes: "S,M,L,XL",
      colors: "Off-white,Black,Grey",
      colorImages: JSON.stringify({
        "Off-white": "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
        "Black": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600",
        "Grey": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600"
      }),
      isFeatured: false
    },
    {
      name: "Modular Cargo Utility Pants",
      sku: "MAD-PA-04",
      price: 890000,
      image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600",
      category: "bottoms",
      description: "Quần túi hộp Modular phong cách Techwear, thiết kế túi đa năng, dây rút gấu quần tùy biến dáng tắp.",
      sizes: "S,M,L",
      colors: "Dark-olive,Black",
      colorImages: JSON.stringify({
        "Dark-olive": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600",
        "Black": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600"
      }),
      isFeatured: true
    },
    {
      name: "Eco-cotton Drape Silhouette Dress",
      sku: "MAD-DR-05",
      price: 1200000,
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600",
      category: "dresses",
      description: "Đầm suông Drape tinh tế, chất liệu organic cotton mát lịm tôn dáng thanh lịch.",
      sizes: "S,M,L",
      colors: "Midnight-black",
      colorImages: JSON.stringify({
        "Midnight-black": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600"
      }),
      isFeatured: false
    }
  ];

  for (const product of productsData) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product
    });
  }
  console.log(`✅ Đã nạp thành công ${productsData.length} sản phẩm mẫu.`);

  // 3. Nạp danh sách VIP Members
  const membersData = [
    { fullName: "Nguyễn Văn A", phone: "0909123456", email: "anguyen@gmail.com", points: 150, tier: "SILVER" },
    { fullName: "Trần Thị B", phone: "0918765432", email: "btran@gmail.com", points: 420, tier: "GOLD" },
    { fullName: "Lê Hoàng C", phone: "0988888888", email: "cle@gmail.com", points: 850, tier: "PLATINUM" },
    { fullName: "Phạm Minh D", phone: "0977777777", email: "dpham@gmail.com", points: 30, tier: "BRONZE" }
  ];

  for (const member of membersData) {
    await prisma.vIPMember.upsert({
      where: { phone: member.phone },
      update: member,
      create: member
    });
  }
  console.log(`✅ Đã nạp thành công ${membersData.length} thành viên VIP.`);

  // 4. Tạo một vài đơn hàng mẫu
  const countOrders = await prisma.order.count();
  if (countOrders === 0) {
    const sampleOrder1 = await prisma.order.create({
      data: {
        orderNumber: "DH20260517001",
        customerName: "Nguyễn Văn A",
        customerEmail: "anguyen@gmail.com",
        customerPhone: "0909123456",
        street: "123 Lê Lợi, Phường Bến Nghé",
        ward: "Phường Bến Nghé",
        district: "Quận 1",
        province: "Hồ Chí Minh",
        subtotal: 1850000,
        discount: 92500, // VIP Silver 5%
        shipping: 0,
        total: 1757500,
        paymentMethod: "bank",
        shippingMethod: "standard",
        status: "pending",
        isPaid: false,
        notes: "Giao giờ hành chính giúp em",
        couponCode: "VIP SILVER",
        items: {
          create: [
            {
              productId: "sample-trenchcoat-id",
              productName: "Oversized Cyber-Noir Trenchcoat",
              productImage: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600",
              quantity: 1,
              size: "L",
              color: "Black",
              price: 1850000
            }
          ]
        }
      }
    });

    const sampleOrder2 = await prisma.order.create({
      data: {
        orderNumber: "DH20260517002",
        customerName: "Khách lẻ vãng lai",
        customerEmail: "khachle@gmail.com",
        customerPhone: "0934567890",
        street: "456 Trần Hưng Đạo",
        ward: "Phường 2",
        district: "Quận 5",
        province: "Hồ Chí Minh",
        subtotal: 420000,
        discount: 0,
        shipping: 30000,
        total: 450000,
        paymentMethod: "cod",
        shippingMethod: "standard",
        status: "shipping",
        isPaid: false,
        notes: "Gọi trước khi giao 30p",
        items: {
          create: [
            {
              productId: "sample-tee-id",
              productName: "Noir Minimalist Drop-shoulder Tee",
              productImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
              quantity: 1,
              size: "M",
              color: "Off-white",
              price: 420000
            }
          ]
        }
      }
    });

    console.log("✅ Đã nạp thành công 2 đơn hàng mẫu.");
  }

  console.log("🎉 Nạp dữ liệu mẫu hoàn thành xuất sắc!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi trong quá trình seed data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
