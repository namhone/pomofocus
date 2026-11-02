import https from 'https';

const candidatePhotoIds = {
  'lofi-study': [
    'photo-1518495973542-4542c06a5843', // Priscilla Du Preez - Desk sunlight
    'photo-1498050108023-c5249f4df085', // Christopher Gower - MacBook coding desk
    'photo-1499750310107-5fef28a66643', // Cathryn Lavery - Notebook tea study
    'photo-1515378791036-0648a3ef77b2', // Glenn Carstens-Peters - Night lamp desk
    'photo-1486312338219-ce68d2c6f44d', // Glenn Carstens-Peters - Typing laptop
    'photo-1501504905252-473c47e087f8', // Jonas Jacobsson - Bookshelf & plants
    'photo-1483058712412-4245e9b90334', // Green Chameleon - Wooden desk minimal
    'photo-1456513080510-7bf3a84b82f8', // Thought Catalog - Window reading
    'photo-1476820865390-c52aeebb9891', // Travis Yewell - Vinyl turntable
    'photo-1517842645767-c639042777db', // Slava Bowman - Plant desk glow
    'photo-1434030216411-0b793f4b4173', // Green Chameleon - Hourglass study
    'photo-1521587760476-6c12a4b040da', // Patrick Tomasso - Books on wooden table
    'photo-1481627834876-b7833e8f5570', // Aaron Burden - Book sunlight
    'photo-1524995997946-a1c2e315a42f', // Freddie Marriage - Books library
    'photo-1512820790803-83ca734da794', // Alisa Anton - Armchair reading
    'photo-1501339847302-ac426a4a7cbb', // Petr Sevcovic - Warm cafe desk
    'photo-1453614512568-c4024d13c247', // Declan Sun - Window cafe view
    'photo-1527766833261-b09c3163a792', // Gabrielle Henderson - Rainy cafe
    'photo-1509042239860-f550ce710b93', // Nathan Dumlao - Morning desk
    'photo-1516321318423-f06f85e504b3', // John Schnobrich - Laptop workspace
    'photo-1519389950473-47ba0277781c', // Annie Spratt - Creative workspace
    'photo-1516962215378-7fa2e137ae93', // Bench Accounting - Clean desk
    'photo-1497633762265-9d179a990aa6', // Giammarco Boscaro - University library desk
    'photo-1513542789411-b6a5d4f31634'  // Jeremy Bishop - Evening window study
  ],
  'anime-ghibli': [
    'photo-1534447677768-be436bb09401', // Guille Pozzi - Ethereal clouds
    'photo-1579783900882-c0d3dad7b119', // Steve Johnson - Watercolor sunset sky
    'photo-1563089145-599997674d42', // Jr Korpa - Violet aurora ghibli
    'photo-1607604276583-eef5d076aa5f', // Evgeny Tchebotarev - Red lanterns Japan street
    'photo-1503899036084-c55cdd92da26', // Masashi Wakui - Tokyo rainy alley yellow lights
    'photo-1493976040374-85c8e12f0c0e', // Soragrit Wongsa - Japanese pagoda autumn leaves
    'photo-1542051841857-5f90071e7989', // Aleksandar Pasaric - Shibuya crossing twilight
    'photo-1578632767115-351597cf2477', // Clay Banks - Tokyo skyline pastel
    'photo-1518709268805-4e9042af9f23', // NASA Hubble - Cosmic fantasy nebula
    'photo-1492571350019-22de08371fd3', // Masaaki Komori - Kyoto street evening
    'photo-1536098561742-ca998e48cbcc', // Tianshu Liu - Japanese garden
    'photo-1508739773434-c26b3d09e071', // Aleksandar Pasaric - Tokyo night neon rain
    'photo-1526481280693-3bfa7568e0f3', // Clay Banks - Mt Fuji sakura
    'photo-1538370965046-79c0d6907d47', // NASA - Deep starry night
    'photo-1509198397868-475647b2a1e5', // Sasha Freemind - Pastel sunset sky
    'photo-1518020382113-a7e8fc38eac9', // Leonardo Yip - Ethereal lavender twilight
    'photo-1470071459604-3b5ec3a7fe05', // Lukas Rodriguez - Misty valley meadow
    'photo-1472214103451-9374bd1c798e'  // Bessie Turner - Endless green hill Ghibli
  ],
  'cyberpunk-tokyo': [
    'photo-1508739773434-c26b3d09e071', // Aleksandar Pasaric - Neon rain Tokyo street
    'photo-1519501025264-65ba15a82390', // Ben Cheung - Futuristic skyscrapers
    'photo-1514565131-fce0801e5785', // Joshua Sortino - LED light grid night
    'photo-1542751371-adc38448a05e', // Florian Olivo - Cyberpunk RGB gaming desk
    'photo-1563245372-f21724e3856d', // Sean Foley - Hong Kong neon purple alley
    'photo-1526374965328-7f61d4dc18c5', // Markus Spiske - Matrix digital code
    'photo-1550745165-9bc0b252726f', // Carl Raw - 80s arcade neon
    'photo-1569701813229-33284b643e3c', // Fakurian Design - 3D hologram geometric
    'photo-1515260268569-9271009adfdb', // Stefan K - Neon boulevard purple
    'photo-1541701494587-cb58502866ab', // Denys Nevozhai - Highway light trails
    'photo-1509198397868-475647b2a1e5', // Sasha Freemind - Synthwave gradient
    'photo-1518709268805-4e9042af9f23', // NASA Hubble - Deep neon nebula
    'photo-1503899036084-c55cdd92da26', // Masashi Wakui - Tokyo dark alley
    'photo-1542051841857-5f90071e7989', // Aleksandar Pasaric - Tokyo urban evening
    'photo-1534447677768-be436bb09401', // Guille Pozzi - Ethereal neon clouds
    'photo-1519681393784-d120267933ba'  // Benjamin Davies - Cyber neon mountain
  ],
  'minimalist-desk': [
    'photo-1498050108023-c5249f4df085', // Christopher Gower - Clean Mac coding setup
    'photo-1499951360447-b19be8fe80f5', // Dmitry Zvolskiy - Minimal dark home workspace
    'photo-1486312338219-ce68d2c6f44d', // Glenn Carstens-Peters - Modern dark laptop
    'photo-1515378791036-0648a3ef77b2', // Glenn Carstens-Peters - Dark lamp desk setup
    'photo-1483058712412-4245e9b90334', // Green Chameleon - Ultra-clean dark workspace
    'photo-1526738549149-8e07eca6c147', // Clean ultrawide monitor dark desk
    'photo-1587829741301-dc798b83add3', // Minimal mechanical keyboard dark setup
    'photo-1542751371-adc38448a05e', // Dark tech battlestation
    'photo-1494438639946-1ebd1d20bf85', // Simone Hutsch - Minimal architecture
    'photo-1487147264018-f937fba0c817', // Federico Respini - Clean shadow lines
    'photo-1491553895911-0055eca6402d', // Joel Filipe - Minimal monochrome glass
    'photo-1486406146926-c627a92ad1ab', // Sean Pollock - Clean dark glass building
    'photo-1518531933037-91b2f5f229cc', // Desiree Fawn - Minimal plant shadow
    'photo-1507679799987-c73779587ccf', // Clean tech desk
    'photo-1517842645767-c639042777db'  // Slava Bowman - Clean workspace
  ],
  'nature-zen': [
    'photo-1506744038136-46273834b3fb', // Bailey Zindel - Yosemite valley
    'photo-1448375240586-882707db888b', // Sebastian Unrau - Pine forest mist
    'photo-1470071459604-3b5ec3a7fe05', // Lukas Rodriguez - Misty valley
    'photo-1426604966848-d7adac402bff', // Luca Bravo - River stream rocks
    'photo-1472214103451-9374bd1c798e', // Bessie Turner - Green meadow
    'photo-1464822759023-fed622ff2c3b', // Kalab Teshale - Snowy mountain peaks
    'photo-1507525428034-b723cf961d3e', // Sean Oulashin - Calm sunset beach
    'photo-1433086966358-54859d0ed716', // James Wheeler - Wooden bridge waterfall
    'photo-1501785888041-af3ef285b470', // Pietro De Grandi - Dolomite lake reflection
    'photo-1469474968028-56623f02e42e', // David Marcu - Sunset mountain trail
    'photo-1515694346937-94d85e41e6f0', // Maxime Bouffard - Raindrops on window
    'photo-1534274988757-a28bf1a57c17', // Valentin Antonucci - Wet city street lights
    'photo-1519692933481-e162a57d6721', // Raychel Sanner - Storm clouds
    'photo-1501999635878-71cb5379c2d8', // Dawid Zawila - Misty morning lake
    'photo-1428592953211-077101b2021b'  // Roman Kraft - Autumn lake rain ripples
  ]
};

function verify(id) {
  return new Promise((resolve) => {
    const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=360&q=60`;
    const req = https.request(url, { method: 'HEAD', timeout: 6000 }, (res) => {
      const isOk = res.statusCode === 200 && (res.headers['content-type'] || '').startsWith('image/');
      resolve({ id, statusCode: res.statusCode, isOk, contentType: res.headers['content-type'] });
    });
    req.on('error', () => resolve({ id, statusCode: 0, isOk: false }));
    req.on('timeout', () => { req.destroy(); resolve({ id, statusCode: 408, isOk: false }); });
    req.end();
  });
}

async function run() {
  console.log('Verifying all candidate photo IDs...');
  const allIds = Array.from(new Set(Object.values(candidatePhotoIds).flat()));
  console.log(`Total candidate IDs: ${allIds.length}`);

  const results = {};
  for (let i = 0; i < allIds.length; i += 10) {
    const batch = allIds.slice(i, i + 10);
    const batchRes = await Promise.all(batch.map(verify));
    for (const r of batchRes) {
      results[r.id] = r;
      if (!r.isOk) {
        console.log(`[INVALID] ${r.id}: Status ${r.statusCode}, Type: ${r.contentType}`);
      }
    }
  }

  const validByCategory = {};
  for (const [cat, ids] of Object.entries(candidatePhotoIds)) {
    validByCategory[cat] = ids.filter((id) => results[id]?.isOk);
    console.log(`Category "${cat}": ${validByCategory[cat].length} / ${ids.length} valid photos`);
  }

  console.log('\n--- JSON OF VALID PHOTOS BY CATEGORY ---');
  console.log(JSON.stringify(validByCategory, null, 2));
}

run().catch(console.error);
