const urls = [
  { id: 'cozy-lofi-room', url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1920&auto=format&fit=crop' },
  { id: 'rainy-window', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1920&auto=format&fit=crop' },
  { id: 'misty-forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920&auto=format&fit=crop' },
  { id: 'mountain-sunset', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1920&auto=format&fit=crop' },
  { id: 'ocean-waves', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop' },
  { id: 'tokyo-night', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop' },
  { id: 'minimal-aesthetic', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1920&auto=format&fit=crop' },
  { id: 'cozy-coffee', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1920&auto=format&fit=crop' },
  { id: 'deep-space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop' },
  { id: 'anime-scenery', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=1920&auto=format&fit=crop' }
];

async function check() {
  for (const item of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(item.url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timer);
      console.log(item.id, res.status, res.headers.get('content-type'));
    } catch (err) {
      console.log(item.id, 'ERROR', err.message);
    }
  }
}
check();
