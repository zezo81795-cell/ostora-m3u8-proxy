// ============================================
// سكريبت تحويل روابط Ostora إلى M3U8 قياسي
// نسخة كاملة جاهزة للصق مباشرة
// ============================================

const MASTER_URL = 'https://ostora.pages.dev/api/116901.png';

// دالة جلب القائمة الرئيسية وتحليلها
async function getAvailableQualities() {
  const response = await fetch(MASTER_URL);
  const content = await response.text();
  const lines = content.split('\n');
  const qualities = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('#EXT-X-STREAM-INF')) {
      const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      const resolution = resolutionMatch ? resolutionMatch[1] : 'unknown';
      
      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
      const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0;
      
      const jsonFile = lines[i + 1].trim();
      
      let fullJsonUrl;
      if (jsonFile.startsWith('http')) {
        fullJsonUrl = jsonFile;
      } else {
        fullJsonUrl = 'https://ostora.pages.dev/api/' + jsonFile;
      }
      
      qualities.push({
        resolution: resolution,
        bandwidth: bandwidth,
        url: fullJsonUrl
      });
    }
  }
  
  return qualities;
}

// دالة تحليل JSON واستخراج مقاطع الفيديو
async function extractSegmentsFromJson(jsonUrl) {
  try {
    const response = await fetch(jsonUrl);
    const data = await response.json();
    
    // حالة 1: مصفوفة مباشرة
    if (Array.isArray(data)) {
      return data.filter(item => typeof item === 'string' && (item.includes('.ts') || item.includes('.m3u8')));
    }
    
    // حالة 2: يوجد حقل segments
    if (data.segments && Array.isArray(data.segments)) {
      return data.segments.map(s => s.url || s).filter(u => u && (u.includes('.ts') || u.includes('.m3u8')));
    }
    
    // حالة 3: يوجد حقل playlist أو m3u8
    if (data.playlist || data.m3u8 || data.url) {
      const playlistUrl = data.playlist || data.m3u8 || data.url;
      const playlistResponse = await fetch(playlistUrl);
      const playlistContent = await playlistResponse.text();
      return parseM3u8Content(playlistContent, playlistUrl);
    }
    
    // حالة 4: البحث عن أي رابط .ts في البيانات
    const tsUrls = [];
    function findTsUrls(obj) {
      if (typeof obj === 'string' && (obj.includes('.ts') || obj.includes('.m3u8'))) {
        tsUrls.push(obj);
      } else if (typeof obj === 'object' && obj !== null) {
        for (let key in obj) {
          findTsUrls(obj[key]);
        }
      }
    }
    findTsUrls(data);
    
    if (tsUrls.length > 0) {
      return tsUrls;
    }
    
    throw new Error('لم يتم العثور على مقاطع فيديو في ملف JSON');
    
  } catch (error) {
    throw new Error(`خطأ في تحليل JSON: ${error.message}`);
  }
}

// دالة تحليل محتوى M3U8
function parseM3u8Content(content, baseUrl) {
  const lines = content.split('\n');
  const segments = [];
  
  for (let line of lines) {
    line = line.trim();
    
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    
    let fullUrl;
    if (line.startsWith('http://') || line.startsWith('https://')) {
      fullUrl = line;
    } else {
      const lastSlash = baseUrl.lastIndexOf('/');
      const basePath = lastSlash !== -1 ? baseUrl.substring(0, lastSlash + 1) : baseUrl;
      fullUrl = basePath + line;
    }
    
    segments.push(fullUrl);
  }
  
  return segments;
}

// دالة إنشاء ملف M3U8
function generateM3u8(segments, targetDuration = 10) {
  let output = '#EXTM3U\n';
  output += '#EXT-X-VERSION:3\n';
  output += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
  output += '#EXT-X-MEDIA-SEQUENCE:0\n';
  
  for (let i = 0; i < segments.length; i++) {
    output += `#EXTINF:${targetDuration}.0,\n`;
    output += `${segments[i]}\n`;
  }
  
  output += '#EXT-X-ENDLIST\n';
  return output;
}

// الدالة الرئيسية
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const requestedQuality = url.searchParams.get('quality') || '720';
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/vnd.apple.mpegurl'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      const qualities = await getAvailableQualities();
      
      if (qualities.length === 0) {
        throw new Error('لم يتم العثور على أي جودة في القائمة الرئيسية');
      }
      
      let selectedQuality = qualities.find(q => q.resolution.includes(requestedQuality));
      
      if (!selectedQuality) {
        selectedQuality = qualities.reduce((prev, current) => 
          (prev.bandwidth > current.bandwidth) ? prev : current
        );
      }
      
      let segments = await extractSegmentsFromJson(selectedQuality.url);
      
      if (segments.length === 0) {
        throw new Error('لم يتم العثور على مقاطع فيديو');
      }
      
      const m3u8Content = generateM3u8(segments);
      
      return new Response(m3u8Content, {
        headers: corsHeaders,
        status: 200
      });
      
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: true,
          message: error.message,
          hint: 'تأكد من صحة الرابط الأساسي وجرب مرة أخرى'
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }
  }
};
