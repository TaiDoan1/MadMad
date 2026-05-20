async function check() {
  try {
    const res = await fetch('https://madmad-backend.vercel.app/api/products');
    const data = await res.json();
    console.log("=== API PRODUCTS COUNT ===", data.length);
    console.log("=== PRODUCTS ===");
    data.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.name?.vi || p.name} | Category: ${p.category} | Price: ${p.price}`);
    });
  } catch (e) {
    console.error("Error fetching API:", e);
  }
}
check();
