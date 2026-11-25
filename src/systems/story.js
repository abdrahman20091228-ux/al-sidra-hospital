import * as THREE from 'three';
import { FLOOR2_Y, PLAYER, STATE } from '../core/config.js';
import { distFromRoad, randPick } from '../utils/math.js';
import { findRoomAt } from '../world/layout.js';

/**
 * Completely overhauled story: "مستشفى السدرة الريفي — ملف العزل ١٩٩٤"
 * Protagonist: طارق (Tariq), documenting the abandoned rural hospital where his sister ندى (Nada) worked as a night nurse in 1994.
 * Pure atmospheric exploration & investigative documentary (NO monster!).
 */

export const CLUE_ARCHIVE = {
  clue_road: {
    title: 'بطاقة دخول ممرضة — ١٩٩٤',
    date: '١١ أكتوبر ١٩٩٤ · الطريق الطيني',
    body: 'الاسم: ندى الحربي — ممرضة مناوبة ليلية (القسم ب)\nرقم التصريح: 0419-SRH\n\nملاحظة مكتوبة بخط اليد على ظهر البطاقة:\n«أغلقوا الطريق الطيني بحجة الانهيار الصخري... لكنهم لم يخرجوا المرضى من الجناح الشرقي. إذا وصلت هنا يا طارق، ابدأ بسجل الاستقبال.»',
  },
  clue_reception: {
    title: 'سجل المناوبة الليلية — ١٢ أكتوبر ١٩٩٤',
    date: 'الساعة ٢٣:١٥ · بهو الاستقبال',
    body: 'آخر قيد في دفتر الاستقبال:\n- ٢١:٤٠: وصول سيارة إسعاف من القرية الشمالية (حالة اشتباه تسمم مائي).\n- ٢٢:٣٠: أمر مدير المستشفى بإخلاء الطوارئ والصيدلية فورًا.\n- ٢٣:١٥: تم نقل عينات الأشعة إلى المختبر — الغرفة ٣١٢ أُغلقت بأمر إداري.',
  },
  clue_radiology: {
    title: 'تقرير الأشعة السينية — الحالة رقم ١٧',
    date: '١٢ أكتوبر ١٩٩٤ · قسم الأشعة',
    body: 'المريض رقم ١٧ أظهر ظلالًا غير طبيعية في الرئتين بعد تعرضه لتسرب غازي من خزان المبنى القديم.\nكتب الطبيب المناوب باللون الأحمر:\n«ليس وباءً كما زعمت الإدارة... إنه تسرب كيميائي من أنابيب القبو! يجب نشر التقرير قبل أن يختموا الملفات.»',
  },
  clue_isolation: {
    title: 'شريط كاسيت #١ — تسجيل ندى الصوتي',
    date: '١٣ أكتوبر ١٩٩٤ · غرفة العزل ٢٠٤',
    body: '[صوت همس وخشخشة شريط قديم]\n«إذا كان أحد يسمع هذا الشريط... أنا ندى. أخلَوا المستشفى في ساعتين فقط حتى لا يكتشف المفتشون تسرب المعمل القديم. جمعت النسخ الأصلية من الفحوصات وأخفيتها في الطابق الثاني داخل الغرفة ٣١٢...»',
  },
  clue_morgue: {
    title: 'بلاغ جرد المشرحة المختوم',
    date: '١٤ أكتوبر ١٩٩٤ · المشرحة',
    body: 'تقرير لجنة التصفية المؤقتة:\n«تم نقل جميع الجثامين والسجلات إلى مستشفى المدينة المركزي فجر ١٤ أكتوبر. الثلاجة رقم ٢ تُركت مفتوحة لتصريف الرطوبة بعد فصل التيار الكهربائي الرئيسي.»',
  },
  clue_room312: {
    title: 'الشريط الأخير — حقيقة مستشفى السدرة',
    date: 'الغرفة ٣١٢ · الطابق الثاني',
    body: 'وجدت الحقيبة المعدنية التي خبأتها ندى خلف المكتب!\nبداخلها: رسائلها للجنة التحقيق، شريط النسخة الاحتياطية، وصورة لطاقم التمريض قبل الإغلاق.\n\n«الحقيقة لم تكن أشباحًا ولا لعنة... كانت محاولة طمس إهمال هندسي تسبب في إغلاق المستشفى إلى الأبد. والآن البث المباشر وثّق كل دليل بالصوت والصورة.»',
  },
};

export const MISSIONS = [
  {
    id: 'reach_road',
    title: 'اخرج من الغابة نحو الطريق الطيني',
    type: 'reach',
    target: { x: -2.2, y: 0.5, z: 58.0, floor: 0 },
    check: () => PLAYER.z < 60.5 && distFromRoad(PLAYER.x, PLAYER.z) < 2.2,
    onDoneSub: 'وصلت إلى الطريق الطيني القديم... المستشفى أمامي خلف الأشجار.',
  },
  {
    id: 'reach_gate',
    title: 'اتبع الطريق الطيني حتى بوابة المستشفى',
    type: 'reach',
    target: { x: 0, y: 1.5, z: 8.6, floor: 0 },
    check: () => PLAYER.z < 11.5 && Math.abs(PLAYER.x) < 10,
    onDoneSub: 'بوابة مستشفى السدرة... لم تتغير منذ عام ١٩٩٤.',
  },
  {
    id: 'film_facade',
    title: 'صوّر واجهة المستشفى المهجورة واللافتة المائلة',
    type: 'film',
    target: { x: 0.2, y: 5.2, z: -5.5, floor: 0 },
    duration: 4.0,
    minDist: 4,
    maxDist: 22,
    onDoneSub: 'المبنى مهجور ومغلق بالألواح الخشبية منذ ١٩٩٤... سأدخل من البوابة الرئيسية.',
  },
  {
    id: 'film_lobby',
    title: 'ادخل بهو الاستقبال وصوّر مكتب المناوبة المهجور',
    type: 'film',
    target: { x: 2.4, y: 1.35, z: -12.2, floor: 1 },
    duration: 4.5,
    minDist: 1.8,
    maxDist: 11,
    onDoneSub: 'الكهرباء مقطوعة بالكامل... لا شيء هنا سوى صوت الريح وخطواتي. سأتجه لقسم الأشعة غربًا.',
  },
  {
    id: 'film_radiology',
    title: 'صوّر أفلام الأشعة القديمة في الجناح الغربي',
    type: 'film',
    target: { x: -16.4, y: 1.75, z: -29.2, floor: 1 },
    duration: 4.5,
    minDist: 1.6,
    maxDist: 10.5,
    onDoneSub: 'الأفلام ما زالت معلقة على اللوحة المطفاة منذ ليلة الإخلاء... سأتفقد غرفة العمليات.',
  },
  {
    id: 'film_surgery',
    title: 'وثّق غرفة العمليات الجراحية (شمال غرب)',
    type: 'film',
    target: { x: -17.2, y: 1.3, z: -35.8, floor: 1 },
    duration: 4.5,
    minDist: 1.8,
    maxDist: 11,
    onDoneSub: 'مصباح العمليات مائل والصدأ يغطي الأدوات... بقي المشرحة شرق الممر الشمالي.',
  },
  {
    id: 'film_morgue',
    title: 'وثّق المشرحة وثلاجة الموتى (شمال شرق)',
    type: 'film',
    target: { x: 8.4, y: 1.1, z: -39.5, floor: 1 },
    duration: 4.5,
    minDist: 1.8,
    maxDist: 11.5,
    onDoneSub: 'أدراج الثلاجة مفتوحة والصدأ في كل مكان... الدليل الأخير في الغرفة ٣١٢ بالطابق الثاني!',
  },
  {
    id: 'film_room312',
    title: 'اصعد الدرج ووثّق مكتب الغرفة ٣١٢ (الطابق ٢)',
    type: 'film',
    target: { x: 7.4, y: FLOOR2_Y + 1.15, z: -22.2, floor: 2 },
    duration: 5.0,
    minDist: 1.6,
    maxDist: 10.5,
    onDoneSub: 'وجدت ملفات ندى كاملة... البث وثّق الحقيقة أخيرًا!',
  },
];

const CHAT_USERS = [
  'فهد_الرياض', 'سارة_99', 'عمر_استكشاف', 'ليان', 'خالد_TV', 'نور_Q8',
  'مشاري', 'طارق_فان', 'رنا_K', 'أحمد_Vlogs', 'night_lens', 'urbex_ksa',
];

const CHAT_COLORS = ['#98b4a8', '#c8aa74', '#8ea4bc', '#b698be', '#92b694', '#c88c7e'];

const ZONE_CHATS = {
  forest: [
    'الظلام في الغابة يخوّف جدًا 🌲',
    'أسمع صوت تنفسك من التوتر... خذ نفس',
    'اطلع على الطريق الطيني قدامك',
    'ضوء القمر خافت جدًا، لا تطفي الكشاف!',
  ],
  road: [
    'الطين غارق وآثار الإطارات محفورة بالأرض!',
    'الأعمدة كلها طافية والأسلاك مقطوعة...',
    'شف الحاجز الخشبي المرمي عند مدخل الطريق',
    'المستشفى طالع بالضباب كأنه مشهد من سايلنت هيل 😨',
  ],
  courtyard: [
    'الشبابيك كلها مقفلة بألواح خشب واللبلاب يغطي الجدران!',
    'اللافتة مائلة وبتطيح من الصدأ...',
    'في كرسي متحرك مقلوب ونقالة مهجورة برا',
    'البوابة الحديدية صدئة ومكسورة، ادخل بحذر',
  ],
  lobby: [
    'يا ساتر الظلام جوا دامس — الكشاف بس اللي ينور!',
    'الملفات مرمية بكل مكان كأنهم هربوا فجأة',
    'المصابيح معلقة مكسورة من السقف 😨',
    'افتح الورقة الممزقة (الخريطة) عشان تشوف الأقسام',
  ],
  radiology: [
    'أفلام الأشعة القديمة لسه معلقة على اللوحة المطفأة!',
    'الغرفة كلها غبار وصدأ... اقرا التقرير عند الشباك',
    'الظلال من الكشاف تخلي المكان مرعب بشكل غير طبيعي',
  ],
  surgery: [
    'غرفة العمليات متروكة بنص شغلها!!',
    'مصباح العمليات مائل ومطفي... والأدوات طايحة بالأرض',
    'بركة المويه والصواني الصدئة على البلاط 😨',
  ],
  morgue: [
    'المشرحة باردة ومظلمة جدًا... درجين مفتوحين!!',
    'الصدأ والرطوبة أكلوا ثلاجة الموتى',
    'اطلع من هنا بسرعة واصعد للطابق الثاني',
  ],
  floor2: [
    'الطابق الثاني أهدأ وأظلم من تحت...',
    'وصلنا لنهاية التحقيق يا طارق — افتح الغرفة ٣١٢!',
    'الكل حابس أنفاسه بالبث الحين',
  ],
};

export class StorySystem {
  constructor(audio, hud, physics, clueObjects) {
    this.audio = audio;
    this.hud = hud;
    this.physics = physics;
    this.clueObjects = clueObjects;
    this.missionProg = 0;
    this.missionLocked = false;
    this.nearClue = null;
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
  }

  reset() {
    STATE.missionIdx = 0;
    STATE.discoveredRooms.clear();
    STATE.collectedClues.clear();
    STATE.viewers = 418;
    STATE.maxViewers = 418;
    STATE.nextChat = 3.5;
    this.missionProg = 0;
    this.missionLocked = false;
    this.nearClue = null;
    this.clueObjects.forEach((c) => {
      c.collected = false;
      c.mesh.visible = true;
    });
    this.setSubtitle('غابة وادي الضباب... شقيقتي ندى عملت هنا عام ١٩٩٤. سأخرج للطريق الطيني وأوثّق الحقيقة.', 6.5);
    this.hud.pushChat('البث_المباشر', 'بدأ التوثيق الميداني · مستشفى السدرة الريفي 🎥', '#e8b85c');
  }

  setSubtitle(text, dur = 4.2) {
    STATE.subText = text;
    STATE.subTimer = dur;
    this.hud.setSubtitle(text);
  }

  getActiveMission() {
    return MISSIONS[STATE.missionIdx] || null;
  }

  interactNearestClue() {
    if (!this.nearClue) return false;
    const clue = this.nearClue;
    const data = CLUE_ARCHIVE[clue.id];
    if (!data) return false;
    if (!clue.collected) {
      clue.collected = true;
      STATE.collectedClues.add(clue.id);
      STATE.viewers += 340;
      STATE.maxViewers = Math.max(STATE.maxViewers, STATE.viewers);
      this.audio.clueFound();
      this.hud.pushChat(randPick(CHAT_USERS), `لقى دليل جديد: ${data.title} 📄`, '#e6c878');
    }
    this.hud.openNoteModal(data);
    return true;
  }

  update(dt, camera) {
    // 1. Subtitle timer
    if (STATE.subTimer > 0) {
      STATE.subTimer -= dt;
      if (STATE.subTimer <= 0) {
        STATE.subText = '';
        this.hud.setSubtitle('');
      }
    }

    // 2. Detect Current Zone & Room
    const room = findRoomAt(PLAYER.x, PLAYER.y, PLAYER.z);
    if (room) {
      STATE.currentRoomId = room.id;
      STATE.currentRoomName = room.name;
      STATE.currentZone = room.id === 'courtyard' ? 'courtyard' : room.floor === 2 ? 'hospital_f2' : 'hospital_f1';
      if (!STATE.discoveredRooms.has(room.id) && !room.isCorridor) {
        STATE.discoveredRooms.add(room.id);
        STATE.viewers += 160;
        STATE.maxViewers = Math.max(STATE.maxViewers, STATE.viewers);
      }
    } else if (distFromRoad(PLAYER.x, PLAYER.z) < 2.6) {
      STATE.currentRoomId = 'road';
      STATE.currentRoomName = 'الطريق الطيني المؤدي للمستشفى';
      STATE.currentZone = 'road';
    } else {
      STATE.currentRoomId = 'forest';
      STATE.currentRoomName = 'غابة وادي الضباب';
      STATE.currentZone = 'forest';
    }

    // 3. Check nearest interactive golden clue (bob gently + prompt button)
    let closest = null;
    let bestD = 2.6;
    for (let i = 0; i < this.clueObjects.length; i++) {
      const c = this.clueObjects[i];
      c.mesh.rotation.y += dt * 0.65;
      const d = Math.hypot(c.x - PLAYER.x, c.y - (PLAYER.y + 1.0), c.z - PLAYER.z);
      if (d < bestD) {
        bestD = d;
        closest = c;
      }
    }
    this.nearClue = closest;
    this.hud.setInteractPrompt(closest ? `فحص: ${closest.title} [E]` : null);

    // 4. Update active investigative mission
    const m = this.getActiveMission();
    if (m && STATE.phase === 'play') {
      if (m.type === 'reach') {
        this.missionLocked = false;
        this.hud.hideAFBox();
        if (m.check()) {
          this._completeMission(m);
        }
      } else if (m.type === 'film') {
        const t = m.target;
        const eyeY = PLAYER.y + PLAYER.eyeY;
        this._v1.set(t.x - PLAYER.x, t.y - eyeY, t.z - PLAYER.z);
        const dist = this._v1.length();
        this._v1.normalize();
        camera.getWorldDirection(this._v2);
        const dot = this._v2.dot(this._v1);
        const floorMatch = t.floor === 0 || (t.floor === 2 ? PLAYER.y > 2.2 : PLAYER.y < 2.0);

        const inRange = floorMatch && dist >= m.minDist && dist <= m.maxDist;
        const visible = inRange && dot > 0.72 && this.physics.hasLineOfSight(PLAYER.x, eyeY, PLAYER.z, t.x, t.y, t.z);
        const aiming = visible && dot > 0.91;

        if (aiming) {
          if (!this.missionLocked) {
            this.missionLocked = true;
            this.audio.uiClick();
          }
          this.missionProg = Math.min(1, this.missionProg + dt / m.duration);
          STATE.viewers += dt * 28;
          if (this.missionProg >= 1) {
            this._completeMission(m);
          }
        } else {
          this.missionLocked = false;
          this.missionProg = Math.max(0, this.missionProg - dt * 0.08);
        }

        if (visible) {
          this._v3.set(t.x, t.y, t.z).project(camera);
          if (this._v3.z < 1 && Math.abs(this._v3.x) < 1.05 && Math.abs(this._v3.y) < 1.05) {
            this.hud.updateAFBox(this._v3.x, this._v3.y, dist, m.title, this.missionLocked, this.missionProg);
          } else {
            this.hud.hideAFBox();
          }
        } else {
          this.hud.hideAFBox();
        }
      }
    } else {
      this.hud.hideAFBox();
    }

    // 5. Contextual ambient viewer chat & subtle audio ambiance
    STATE.nextChat -= dt;
    if (STATE.nextChat <= 0) {
      STATE.nextChat = 5.5 + Math.random() * 5.0;
      let pool = ZONE_CHATS.forest;
      if (STATE.currentRoomId && ZONE_CHATS[STATE.currentRoomId]) {
        pool = ZONE_CHATS[STATE.currentRoomId];
      } else if (STATE.currentZone === 'hospital_f2') {
        pool = ZONE_CHATS.floor2;
      } else if (STATE.currentZone === 'hospital_f1') {
        pool = ZONE_CHATS.lobby;
      } else if (STATE.currentZone === 'courtyard') {
        pool = ZONE_CHATS.courtyard;
      } else if (STATE.currentZone === 'road') {
        pool = ZONE_CHATS.road;
      }
      this.hud.pushChat(randPick(CHAT_USERS), randPick(pool), randPick(CHAT_COLORS));
      this.audio.chatPing();
    }

    STATE.nextAmbientSfx -= dt;
    if (STATE.nextAmbientSfx <= 0) {
      STATE.nextAmbientSfx = 12 + Math.random() * 14;
      this.audio.playAmbientEvent(PLAYER.z < -6);
    }

    STATE.viewers += dt * (1.2 + STATE.missionIdx * 0.9);
    STATE.maxViewers = Math.max(STATE.maxViewers, STATE.viewers);
  }

  _completeMission(m) {
    this.audio.missionDone();
    this.missionProg = 0;
    this.missionLocked = false;
    this.hud.hideAFBox();
    STATE.viewers += 450;
    STATE.maxViewers = Math.max(STATE.maxViewers, STATE.viewers);
    this.setSubtitle(m.onDoneSub, 5.0);
    this.hud.flashMissionDone(m.title);
    this.hud.pushChat(randPick(CHAT_USERS), 'توثيق ممتاز 🔥 كمّل الاستكشاف!', '#78e096');

    STATE.missionIdx++;
    if (STATE.missionIdx >= MISSIONS.length) {
      STATE.phase = 'ended';
      this.hud.showEndingScreen();
    }
  }
}
