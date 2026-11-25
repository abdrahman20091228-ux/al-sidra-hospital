# مستشفى السدرة الريفي — Al-Sidra Rural Hospital (1994)

لعبة استكشاف وتوثيق ثلاثية الأبعاد (First-Person Found-Footage Exploration) مبنية بـ **Three.js + Vite** بهيكلة برمجية مقسّمة بالكامل، مُحسّنة خصيصًا للهواتف لمنع سخونة الجهاز واستنزاف البطارية، مع خامات PBR سلسة (Seamless) وخرائط Normal Maps وتصميم معماري يدوي كامل لمستشفى حقيقي من طابقين محاط بغابة صنوبر وطريق طيني.

## أبرز التحسينات الجذرية
- **إعادة بناء القصة بالكامل (بدون وحش حاليًا):** تحقيق وثائقي ميداني في حادثة إخلاء «مستشفى السدرة الريفي» ليلة ١٢ أكتوبر ١٩٩٤ بحثًا عن أشرطة وملفات الممرضة «ندى» عبر ٨ أهداف متسلسلة و٦ أدلة قابلة للقراءة.
- **رحلة متدرجة من ٣ مراحل بيئية:**
  1. **غابة وادي الضباب (Pine Forest Clearing):** تضاريس متموجة، أشجار صنوبر ثلاثية الأبعاد متعددة الطبقات (7-tier instanced conifers)، سرخسيات مقصوصة بالشفافية، صخور، وجذوع متساقطة.
  2. **الطريق الطيني (Winding Muddy Road):** طريق طيني متعرج بخامة طين رطبة لامعة، برك ماء عاكسة لضوء القمر، أسيجة خشبية، أعمدة إنارة، وعلامات تحذيرية.
  3. **ساحة ومبنى المستشفى (Real-World Handcrafted Hospital):** سور حجري وبوابة حديدية مفتوحة، مظلة إسعاف (Porte-Cochère)، سيارة إسعاف ثلاثية الأبعاد مهجورة، ومبنى مستشفى من طابقين مصمَّم معماريًا من البداية (بدون توليد عشوائي للمتاهات).
- **أقسام المستشفى المعمارية (١٧ قسمًا وممرًا):**
  - **الطابق الأول:** بهو الاستقبال والانتظار، قسم الطوارئ والفرز، الصيدلية المركزية، محطة التمريض، قسم الأشعة السينية (مع لوحة أشعة صدر مضيئة)، المختبر الطبي، جناح التنويم أ، غرفة العزل ٢٠٤، غرفة التعقيم والدرج، غرفة العمليات الجراحية، المشرحة وثلاجة الموتى، مكتب المدير والأرشيف.
  - **الطابق الثاني:** الممر العلوي، جناح الأطفال القديم، والغرفة ٣١٢.
- **حل جذري لسخونة الهاتف واستهلاك البطارية:**
  - محدد إطارات حراري قابل للاختيار (**30 / 45 / 60 FPS**) لمنع استهلاك 120Hz.
  - 3 مستويات جودة (`توفير طاقة` / `متوازن` / `عالي`) مع تقييد DPR وتخطي إطارات الظلال (`shadowSkip`).
  - دمج الهندسة الثابتة (`GeometryBatcher`) واستخدام `InstancedMesh` لخفض Draw Calls إلى ~42–60 داخل المستشفى.
  - إيقاف كامل للرسم (0% GPU) أثناء القوائم أو عند الخروج من التبويب، وتقليل تحديثات الـ HUD إلى 5Hz.
- **خريطة معمارية تفاعلية من ٣ تبويبات:** الغابة والطريق الطيني، الطابق الأول، والطابق الثاني مع مؤشر حي لاتجاه النظر والأهداف والأدلة.

## بنية المشروع (Project Structure)
```
al-sidra-hospital/
├── index.html
├── package.json
├── vite.config.js
├── public/textures/          # 27 seamless 512x512 PBR albedo + Sobel normal maps
└── src/
    ├── main.js               # Bootstrap & thermal-capped game loop
    ├── styles/main.css       # Sleek Arabic HUD, menus & map styles
    ├── core/
    │   ├── config.js         # Thermal presets, settings & game state
    │   ├── engine.js         # Mobile-optimized Three.js renderer & lighting rig
    │   ├── geometry.js       # World-UV GeometryBatcher & InstancedMesh helpers
    │   ├── materials.js      # PBR material library & procedural Arabic signage
    │   └── physics.js        # AABB/circle collision, terrain height & stairwell solver
    ├── world/
    │   ├── layout.js         # Handcrafted 2-story real hospital architectural blueprint
    │   ├── forest.js         # Pine forest clearing & winding muddy road
    │   ├── exterior.js       # Courtyard, wrought-iron gates, ambulance & 2-story facade
    │   ├── hospital.js       # Walls, door/window cutouts, trim, ceilings, stairs & wayfinding
    │   └── props.js          # Handcrafted 3D medical furniture & interactive story clues
    ├── systems/
    │   ├── audio.js          # Procedural WebAudio soundscape & surface-aware footsteps
    │   ├── player.js         # Dual touch joystick + desktop WASD/Mouse controller
    │   ├── story.js          # 1994 investigation arc, 8 objectives & live viewer chat
    │   ├── mapUI.js          # 3-tab architectural blueprint & forest trail map
    │   └── hud.js            # Throttled camcorder HUD, settings, dossier & clue reader
    └── utils/
        └── math.js           # Seeded RNG, road spline & terrain heightfield
```

## التشغيل المحلي
```bash
npm install
npm run dev
```
وللبناء الإنتاجي:
```bash
npm run build
```
