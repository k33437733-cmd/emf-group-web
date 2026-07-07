export type BotIntent =
  | 'greeting'
  | 'waiting'
  | 'question_generic'
  | 'question_hours'
  | 'question_pricing'
  | 'question_technical'
  | 'farewell'
  | 'unknown';

export interface BotResponse {
  intent: BotIntent;
  message: string;
  delayMs: number;
}

const GREETING_PATTERNS = [
  /^(السلام عليكم| salam| hello| hi| hey| مرحبا| هلا| مساء| صباح|اهلا|أهلا)/i,
  /^(good\s*(morning|afternoon|evening|day))/i,
  /^(مرحبا|marhaba)/i,
  /^(hi\s*there|hey\s*there|hello\s* there)/i,
  /^(howdy|yo|sup)/i,
];

const FAREWELL_PATTERNS = [
  /^(مع السلامة|bye|goodbye|peace|الله معك|في امان الله)/i,
  /^(شكرا\s*(و)?(الله)?\s*مع السلامة)/i,
  /^(تصبح|تصبحون)/i,
];

const HOURS_PATTERNS = [
  /(ساعات\s*(العمل|الدوام|الخدمة)?|اوقات\s*(العمل|الدوام)|مواعيد\s*(العمل)?|دوام|مواعيد\s*الخدمة)/i,
  /(وقت\s*(العمل|الدوام|الافتتاح|الاغلاق|الخدمة))/i,
  /(متاحين|متاح|افتتاح|إغلاق|شغالين)/i,
  /(working\s*hours|business\s*hours|office\s*hours|open|close)/i,
];

const PRICING_PATTERNS = [
  /(سعر|سعره|كم\s*سعر|التسعير|التكلفة|الدفع|الفاتورة|فاتورة|اشتراك|subscription|price|cost|pricing|fee|bill|payment)/i,
  /(كم\s*(تكلفة|سعر|رسوم)|بكم|قد\s*ايه)/i,
];

const TECHNICAL_PATTERNS = [
  /(خطأ|مشكلة|عطل|bug|error|issue|مشكلة|مشاكل|لا\s*يعمل|not\s*working|fail|crash)/i,
  /(help|مساعدة|عندي\s*مشكلة|فيه\s*مشكلة|ما\s*يشتغل|مو\s*شغال|توقف)/i,
];

const WAITING_PATTERNS = [
  /(هل\s*من\s*أحد|هل\s*هناك\s*(أحد|مشرف|مسؤول)|لحد\s*الان|لسه|متى\s*يرد|متى\s*يردون|anyone\s*there|still\s*waiting|how\s*long|كم\s*انتظر)/i,
  /(حد\s*يرد|يرد\s*عليا|الرد|الردود|ردوا|رد)/i,
];

function detectIntent(text: string): BotIntent {
  const trimmed = text.trim();
  if (!trimmed) return 'unknown';

  if (GREETING_PATTERNS.some(p => p.test(trimmed))) return 'greeting';
  if (FAREWELL_PATTERNS.some(p => p.test(trimmed))) return 'farewell';
  if (WAITING_PATTERNS.some(p => p.test(trimmed))) return 'waiting';
  if (HOURS_PATTERNS.some(p => p.test(trimmed))) return 'question_hours';
  if (PRICING_PATTERNS.some(p => p.test(trimmed))) return 'question_pricing';
  if (TECHNICAL_PATTERNS.some(p => p.test(trimmed))) return 'question_technical';
  return 'question_generic';
}

export { detectIntent };

const RESPONSE_POOLS: Record<BotIntent, string[]> = {
  greeting: [
    'أهلاً بك في فريق دعم EMF Group! 🎧 تم استلام رسالتك وسيتم الرد عليك من قبل أحد المختصين في أقرب وقت ممكن.',
    'السلام عليكم! 👋 شكراً لتواصلك مع فريق الدعم الفني. تم تسجيل طلبك وسيتم متابعته من قبل المسؤول المختص.',
    'مرحباً بك في EMF Group! 😊 تم استلام استفسارك بنجاح. أحد أعضاء فريقنا سيتواصل معك قريباً جداً.',
    'أهلاً وسهلاً بك! 🌟 نشكرك على تواصلك معنا. تم إشعار فريق الدعم وسيتم الرد عليك في أقرب وقت.',
  ],
  waiting: [
    'نشكرك على صبرك! ⏳ فريق الدعم لدينا يطلع على طلبك حالياً وسيتم الرد في أقرب وقت ممكن. نقدّر انتظارك.',
    'شكراً لانتظارك! 🙏 تأكد أن طلبك في قائمة الأولوية لدينا. أحد المسؤولين سيرد عليك حالما يتفرغ.',
    'نعتذر عن التأخير! ⏱️ فريقنا يعمل على معالجة جميع الطلبات بأسرع وقت. سنرد عليك حالاً.',
    'طلبك قيد المراجعة الآن! ✅ نقدر صبرك وتعاونك. سيتم الرد من قبل المختص في أقرب وقت.',
  ],
  question_generic: [
    'شكراً على استفسارك! 📝 تم تسجيل سؤالك وسيتم توفير الإجابة المناسبة من قبل الفريق المختص في أقرب وقت.',
    'نقدر تواصلك معنا! 🙌 سؤالكم مهم بالنسبة لنا. أحد المختصين سيزودك بالإجابة الكافية قريباً.',
    'تم استلام استفسارك بنجاح! ✅ سيتم تحويله للقسم المختص وسنعود إليك بالرد المناسب في أقرب وقت.',
    'شكراً لسؤالك! 💡 فريقنا يراجع طلبك حالياً وسنقدم لك كل المعلومات التي تحتاجها قريباً.',
  ],
  question_hours: [
    'ساعات العمل الرسمية لفريق الدعم الفني هي من الأحد إلى الخميس، من الساعة 9 صباحاً حتى 6 مساءً. ⏰ سنكون سعداء بخدمتك خلال هذه الأوقات!',
    'فريق الدعم متاح من الأحد إلى الخميس 9:00 - 18:00. 🕘 سيتم الرد على طلبك فور استلامه ضمن أوقات العمل الرسمية.',
    'أوقات العمل: الأحد - الخميس | 9 صباحاً - 6 مساءً. 📅 خارج هذه الأوقات، سيتم الرد في أول يوم عمل تالي.',
  ],
  question_pricing: [
    'للاستفسار عن التسعير والعروض 📊، تم تحويل طلبك إلى قسم المبيعات والتسعير. سيتواصل معك المختص قريباً جداً.',
    'بخصوص التسعير والاشتراكات 💰، أفضل شخص للإجابة هو أحد مدراء الحسابات. تم إشعارهم وسيردون عليك قريباً.',
    'نشكرك على اهتمامك! 🎯 قسم التسعير لديه كل التفاصيل. تم تحويل طلبك وسيتم تزويدك بكل المعلومات اللازمة.',
  ],
  question_technical: [
    'نأسف لأي مشكلة تقنية تواجهها! 🔧 تم إشعار فريق الدعم الفني المختص بهذه المشكلة وسيتم العمل على حلها فوراً.',
    'نقدر إبلاغنا بالمشكلة التقنية 🛠️. تم تسجيل تقرير وسيتم التواصل معك من قبل فريق الدعم الفني لحل المشكلة.',
    'نشكرك على تواصلك بخصوص المشكلة الفنية ⚙️. فريقنا التقني يراجع التفاصيل حالياً وسيعود إليك بالحل المناسب.',
  ],
  farewell: [
    'شكراً لتواصلك مع EMF Group! 🌟 فريق الدعم دائماً في خدمتك. مع السلامة!',
    'نقدر وقتك وثقتك! 🙏 في أي وقت تحتاج مساعدة، نحن هنا لخدمتك. إلى اللقاء!',
    'شكراً لك على تواصلك معنا! 🤝 كان من دواعي سرورنا خدمتك. في خدمتك دائماً.',
  ],
  unknown: [
    'شكراً لتواصلك مع EMF Group! ✅ تم استلام رسالتك وسيتم الرد عليها من قبل أحد المختصين في أقرب وقت ممكن.',
    'تم استلام طلبك بنجاح! 📬 فريق الدعم الفني سيتولى متابعة طلبك والرد عليك قريباً جداً.',
    'نشكرك على تواصلك! 🙌 تم تسجيل طلبك وسيتم تحويله للقسم المختص. سيتم الرد عليك في أقرب وقت.',
  ],
};

const USED_RESPONSES = new Map<string, Set<number>>();

function pickResponse(intent: BotIntent, conversationId: string): string {
  const pool = RESPONSE_POOLS[intent];
  if (!pool || pool.length === 0) return RESPONSE_POOLS.unknown[0];

  const key = `${conversationId}_${intent}`;
  if (!USED_RESPONSES.has(key)) {
    USED_RESPONSES.set(key, new Set());
  }

  const used = USED_RESPONSES.get(key)!;
  const available = pool
    .map((msg, idx) => ({ msg, idx }))
    .filter(({ idx }) => !used.has(idx));

  if (available.length === 0) {
    used.clear();
    const fallbackIdx = Math.floor(Math.random() * pool.length);
    used.add(fallbackIdx);
    return pool[fallbackIdx];
  }

  const chosen = available[Math.floor(Math.random() * available.length)];
  used.add(chosen.idx);
  return chosen.msg;
}

export function clearConversationHistory(conversationId: string) {
  for (const key of USED_RESPONSES.keys()) {
    if (key.startsWith(`${conversationId}_`)) {
      USED_RESPONSES.delete(key);
    }
  }
}

export function generateBotResponse(
  userMessage: string,
  conversationId: string,
  isSubsequent: boolean,
): BotResponse {
  const intent = isSubsequent && /^(شكرا|thank|thanks|مشكور|تسلم)/i.test(userMessage.trim())
    ? 'farewell'
    : detectIntent(userMessage);

  const message = pickResponse(intent, conversationId);
  const delayMs = isSubsequent ? 500 : 1200 + Math.random() * 800;

  return { intent, message, delayMs };
}
