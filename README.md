# 🚀 Ostora to M3U8 Proxy

تحويل روابط Ostora غير القياسية إلى M3U8 عادي.

## 📌 الرابط بعد النشرتحويل روابط Ostora إلى M3U8 قياسي 
https://ostora-converter.ahmedabdelaziz7070663.workers.dev/
## 🎯 معاملات الجودة
- `?quality=180` → دقة 320x180
- `?quality=360` → دقة 640x360  
- `?quality=480` → دقة 854x480
- `?quality=720` → دقة 1280x720
- `?quality=1080` → دقة 1920x1080

## 🛠️ النشر على Cloudflare
1. انسخ محتوى `worker.js`
2. اذهب إلى Cloudflare Workers
3. أنشئ Worker جديد والصق الكود
4. اضغط Save and Deploy

## 📝 مثال الاستخدام
```html
<video id="video" controls></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource('https://your-worker.workers.dev/play.m3u8?quality=720');
    hls.attachMedia(document.getElementById('video'));
  }
</script>
