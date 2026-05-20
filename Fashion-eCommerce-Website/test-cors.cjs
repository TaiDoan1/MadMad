const url = "https://madmad-backend.vercel.app/api/products?_cb=" + Date.now();
console.log("Fetching URL:", url);

fetch(url, {
  headers: {
    "Origin": "https://www.madmadstudio.com"
  }
})
.then(r => {
  console.log("Status:", r.status);
  console.log("Headers:");
  r.headers.forEach((v, k) => {
    console.log(`  ${k}: ${v}`);
  });
})
.catch(console.error);
