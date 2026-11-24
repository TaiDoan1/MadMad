import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function previewCacheHeaders() {
  return {
    name: 'preview-cache-headers',
    // Cache theo đường dẫn cho `vite preview` (máy chạy thật trên Railway):
    // - /assets/* có hash trong tên file -> cache dài + immutable.
    // - index.html (route / và *.html) -> không cache, để bản deploy mới tới ngay.
    // KHÔNG đặt cache dài cho HTML. preview.headers bên dưới vẫn giữ các
    // tiêu đề bảo mật cho mọi response.
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url.startsWith('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (url === '/' || url.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    previewCacheHeaders(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Cho phép Railway/domain custom truy cập preview server (chặn 403 Host lạ)
  // Tiêu đề bảo mật cho bản chạy trên Railway: vite preview không đọc
  // vercel.json nên các tiêu đề này phải đặt ở đây mới tới được web thật.
  // CSP giữ 'unsafe-inline' cho script/style nên script nội tuyến tải lại
  // chunk vẫn chạy.
  preview: {
    host: true,
    allowedHosts: true,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; media-src 'self' https://res.cloudinary.com; connect-src 'self' https://madmad-production.up.railway.app http://localhost:5000 https://api.cloudinary.com https://accounts.google.com; frame-src 'self' https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self'",
    },
  },
})
