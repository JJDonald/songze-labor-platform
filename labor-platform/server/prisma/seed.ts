import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_EVALUATION_DIMENSIONS } from '../src/services/evaluationDimensions.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据库...');

  // 1. 创建任务群
  console.log('创建任务群...');
  const taskGroups = [
    { id: 'tidy', name: '整理与收纳', icon: '🧳', type: '日常生活劳动', sortOrder: 1 },
    { id: 'clean', name: '清洁与卫生', icon: '🧹', type: '日常生活劳动', sortOrder: 2 },
    { id: 'cook', name: '烹饪与营养', icon: '🍳', type: '日常生活劳动', sortOrder: 3 },
    { id: 'appliance', name: '家用器具使用与维护', icon: '🔌', type: '日常生活劳动', sortOrder: 4 },
    { id: 'farm', name: '农业生产劳动', icon: '🌱', type: '生产劳动', sortOrder: 5 },
    { id: 'craft', name: '传统工艺制作', icon: '✂️', type: '生产劳动', sortOrder: 6 },
    { id: 'industry', name: '工业生产劳动', icon: '🔩', type: '生产劳动', sortOrder: 7 },
    { id: 'tech', name: '新技术体验与应用', icon: '💻', type: '生产劳动', sortOrder: 8 },
    { id: 'service', name: '现代服务业劳动', icon: '🛒', type: '服务性劳动', sortOrder: 9 },
    { id: 'volunteer', name: '公益劳动与志愿服务', icon: '🤝', type: '服务性劳动', sortOrder: 10 },
  ];

  for (const tg of taskGroups) {
    await prisma.taskGroup.upsert({
      where: { id: tg.id },
      update: tg,
      create: tg,
    });
  }

  // 2. 创建年级
  console.log('创建年级...');
  await prisma.grade.upsert({
    where: { id: 6 },
    update: { id: 6, name: '六年级' },
    create: { id: 6, name: '六年级' },
  });
  await prisma.grade.upsert({
    where: { id: 7 },
    update: { id: 7, name: '七年级' },
    create: { id: 7, name: '七年级' },
  });

  // 3. 创建徽章
  console.log('创建徽章...');
  const badges = [
    { name: '烹饪新星', emoji: '🍳', description: '完成3个烹饪项目', category: 'cook' },
    { name: '种植达人', emoji: '🌱', description: '完成2个农业项目', category: 'farm' },
    { name: '手工能手', emoji: '✂️', description: '完成3个工艺项目', category: 'craft' },
    { name: '维修小将', emoji: '🔧', description: '完成2个器具维护项目', category: 'appliance' },
    { name: '志愿之星', emoji: '🤝', description: '参与5次志愿活动', category: 'volunteer' },
    { name: '科技先锋', emoji: '💻', description: '完成新技术体验项目', category: 'tech' },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: { id: uuidv4(), ...badge },
    });
  }

  // 4. 创建管理员账户（仅在不存在时写入默认密码，避免重复 seed 覆盖已修改密码）
  console.log('创建管理员账户...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.student.upsert({
    where: { studentId: 'admin' },
    update: { nickname: '管理员', role: 'ADMIN' },
    create: {
      id: uuidv4(),
      studentId: 'admin',
      nickname: '管理员',
      password: adminPassword,
      avatarEmoji: '👨‍💼',
      role: 'ADMIN',
      gradeId: 6,
      classCode: '管理员',
    },
  });

  // 5. 创建测试学生
  console.log('创建测试学生...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  const testStudents = [
    { studentId: '2024060101', nickname: '小明', gradeId: 6, classCode: '1班' },
    { studentId: '2024060201', nickname: '小红', gradeId: 6, classCode: '2班' },
    { studentId: '2024060301', nickname: '小刚', gradeId: 6, classCode: '3班' },
  ];

  for (const s of testStudents) {
    await prisma.student.upsert({
      where: { studentId: s.studentId },
      update: { nickname: s.nickname, gradeId: s.gradeId, classCode: s.classCode },
      create: { id: uuidv4(), ...s, password: hashedPassword },
    });
  }

  // 5. 创建示例成果
  console.log('创建示例成果...');
  const student1 = await prisma.student.findUnique({ where: { studentId: '2024060101' } });
  
  if (student1) {
    const achievements = [
      {
        title: '第一次成功烤出软面包！',
        description: '揉面揉了快20分钟，烤出来的面包金黄松软，全家都夸好吃。',
        evalAttitude: 5, evalSkill: 4, evalResult: 4,
      },
      {
        title: '做了一个三脚花瓶架',
        description: '用铝丝弯出三脚架，放上小玻璃瓶插干花，摆在窗台很好看。',
        evalAttitude: 4, evalSkill: 4, evalResult: 4,
      },
    ];

    for (const a of achievements) {
      const existing = await prisma.achievement.findFirst({
        where: {
          studentId: student1.id,
          title: a.title,
        },
      });

      if (!existing) {
        await prisma.achievement.create({
          data: {
            id: uuidv4(),
            studentId: student1.id,
            images: '["🍞"]',
            ...a,
          },
        });
      }
    }

    const totalAchievements = await prisma.achievement.count({
      where: { studentId: student1.id },
    });

    await prisma.student.update({
      where: { id: student1.id },
      data: { totalAchievements },
    });
  }

  // 6. 创建评价维度配置
  console.log('创建评价维度配置...');
  for (const dimension of DEFAULT_EVALUATION_DIMENSIONS) {
    await prisma.evaluationDimension.upsert({
      where: { key: dimension.key },
      update: dimension,
      create: dimension,
    });
  }

  // 7. 创建课程
  await seedCourses();

  console.log('✅ 数据库初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function seedCourses() {
  console.log('创建课程...');
  
  const courses = [
    {
      gradeId: 6,
      semesterId: 1,
      taskGroupId: 'tidy',
      title: '行李箱整理',
      emoji: '🧳',
      color: '#EAF4FF',
      description: '学习科学规划行李箱空间，掌握不同物品的折叠与收纳技巧，做到出行整洁有序、不超重。',
      objectives: JSON.stringify([
        '了解行李箱收纳的基本原则（重底轻上、分区归类）',
        '掌握衣物卷叠法与平叠法的适用场景',
        '能独立完成一次旅行行李箱整理，并控制在规定重量内',
      ]),
      materials: JSON.stringify(['行李箱（或大背包）', '各类衣物若干件', '收纳袋/压缩袋', '鞋袋', '洗漱包', '衣物清单表']),
      steps: JSON.stringify([
        { title: '列出清单', desc: '出行前根据天数和目的地气候，列出所需衣物与用品清单，避免遗漏或多带。', icon: '📋' },
        { title: '分类备物', desc: '按「衣物」「洗漱」「证件」「电子设备」「备用药」五类将物品摆放于床上。', icon: '📦' },
        { title: '打底层', desc: '将较重物品（鞋子装入鞋袋）紧贴箱底轮子一侧横向排列，充当稳定重心的底层。', icon: '👟' },
        { title: '卷叠衣物', desc: 'T恤、裤子采用卷叠法卷成圆筒状，竖立摆放在中间层，既节省空间又减少褶皱。', icon: '👕' },
        { title: '填充缝隙', desc: '用袜子、内衣等小件物品填充各卷筒之间的空隙，最大化利用空间。', icon: '🧦' },
        { title: '顶层轻件', desc: '洗漱包、易碎物品放顶层，便于取用；证件夹放箱盖内袋，一键可取。', icon: '🧴' },
      ]),
      safetyTips: '整理时注意不要将重物堆叠过高以免倾倒；拉链锁扣前确认所有物品已在箱内，避免夹坏物品。',
    },
    {
      gradeId: 6,
      semesterId: 1,
      taskGroupId: 'craft',
      title: '布艺挂件的设计与制作',
      emoji: '🎀',
      color: '#FCE4EC',
      description: '运用布料裁剪、缝合等基础布艺技法，设计并制作一款富有个性的装饰挂件，感受手工创作的乐趣。',
      objectives: JSON.stringify([
        '了解常见布料的种类与特性，能合理选材',
        '掌握手针基础缝合针法（平针、回针）',
        '完成一件有个人设计风格的布艺挂件作品',
      ]),
      materials: JSON.stringify(['棉布或无纺布若干', '剪刀', '手缝针与线', '填充棉', '挂绳或丝带', '铅笔/粉笔', '图案纸样']),
      steps: JSON.stringify([
        { title: '构思设计', desc: '在纸上画出挂件的造型草图（如星形、动物、花朵），确定正反面图案与配色方案。', icon: '✏️' },
        { title: '制作纸样', desc: '将设计图转绘到硬纸板上，剪出纸样模板，留出0.5cm缝份。', icon: '📐' },
        { title: '裁剪布料', desc: '将纸样放在布料上，用粉笔描出轮廓，沿缝份线剪出正反两片布。', icon: '✂️' },
        { title: '正面相对缝合', desc: '正面相对叠放，沿边缘用平针或回针缝合，留5cm返口不缝。', icon: '🪡' },
        { title: '翻面填充', desc: '从返口翻出正面，用铅笔末端辅助撑开边角，填入适量棉花至饱满。', icon: '🧸' },
        { title: '封口装饰', desc: '用藏针缝封住返口，在顶部缝上挂绳，可加绣花或贴布装饰完成。', icon: '🎀' },
      ]),
      safetyTips: '使用剪刀时注意刀口朝外，不对向他人；穿针时将针头插入针包，避免针散落桌面伤手。',
    },
    {
      gradeId: 6,
      semesterId: 1,
      taskGroupId: 'craft',
      title: '布艺小包的设计与制作',
      emoji: '👜',
      color: '#F3E5F5',
      description: '在布艺挂件的基础上进阶，设计并缝制一款实用的布艺小包，综合运用量、画、剪、缝多种技能。',
      objectives: JSON.stringify([
        '能根据用途（零钱包/手机袋/收纳包）自主设计布艺小包',
        '掌握拉链或按扣的安装方法',
        '完成一件兼具美观与实用的布艺小包成品',
      ]),
      materials: JSON.stringify(['棉布或帆布（正反面各1片）', '拉链或按扣', '剪刀', '手缝针与线（或缝纫机）', '尺子', '粉笔', '装饰贴布/绣线（可选）']),
      steps: JSON.stringify([
        { title: '确定尺寸', desc: '根据用途确定小包尺寸，画出展开图：包底+前片+后片，加缝份1cm。', icon: '📏' },
        { title: '裁剪布片', desc: '将展开图转移至布料，准确裁出所需各片，可同时裁出内衬布。', icon: '✂️' },
        { title: '安装拉链', desc: '将拉链正面朝下放在包口布料上，对齐后用平针疏缝固定，再回针缝牢固。', icon: '🔖' },
        { title: '缝合侧缝', desc: '将前后片正面相对对齐，从底部开始沿侧边缝合，角落处打倒针加固。', icon: '🪡' },
        { title: '处理边角', desc: '剪去四角缝份处的多余布料（斜剪），翻面后边角更加平整饱满。', icon: '📐' },
        { title: '翻面整烫', desc: '从拉链口翻出正面，用熨斗（有大人协助）轻轻整烫，添加个性装饰。', icon: '👜' },
      ]),
      safetyTips: '使用熨斗需在大人陪同下操作，注意防烫；剪拉链时不要剪断拉链齿，避免拉链失效。',
    },
    {
      gradeId: 6,
      semesterId: 1,
      taskGroupId: 'farm',
      title: '水仙花雕刻及养护',
      emoji: '🌸',
      color: '#E8F5E9',
      description: '学习水仙花鳞茎的雕刻造型技艺，并掌握水养管理方法，欣赏水仙从雕刻到开花的完整生命历程。',
      objectives: JSON.stringify([
        '了解水仙花的品种特点与文化寓意',
        '掌握水仙鳞茎的基本雕刻手法（螃蟹式、玉玲珑式）',
        '能独立完成水仙的雕刻、水养与定期养护',
      ]),
      materials: JSON.stringify(['水仙鳞茎1-2个', '雕刻刀（专用）', '浅口水仙盆', '小石子/卵石', '清水', '牙签（固定用）', '棉花（保湿）']),
      steps: JSON.stringify([
        { title: '认识水仙', desc: '观察水仙鳞茎结构，分辨主球、侧球（脚芽）、芽尖的位置，了解雕刻朝向。', icon: '🌱' },
        { title: '剥除外皮', desc: '用刀小心去除鳞茎褐色外皮，露出白色鳞片，注意不要伤及芽尖。', icon: '🔪' },
        { title: '雕刻造型', desc: '根据选定造型（如螃蟹式），用雕刻刀在叶芽基部作浅弧形切口，使叶片舒展弯曲。', icon: '🪷' },
        { title: '浸水去液', desc: '雕刻完成后放入清水中浸泡1-2小时，冲去切口渗出的黏液，防止腐烂。', icon: '💧' },
        { title: '摆盆固定', desc: '在浅盆中铺卵石，将水仙雕刻面朝上置于石间固定，注水至鳞茎底部。', icon: '🪨' },
        { title: '日常养护', desc: '放置于散光处，每1-2天换水一次，水温与室温相近；夜间移至低温处可延长花期。', icon: '☀️' },
      ]),
      safetyTips: '雕刻刀锋利，使用时刀刃朝外、向下切，手指不放在刀口前方；初学者可请老师或家长在旁指导。',
    },
    {
      gradeId: 6,
      semesterId: 2,
      taskGroupId: 'craft',
      title: '中国结的编织',
      emoji: '🪢',
      color: '#FFF8E1',
      description: '学习中国传统结艺，掌握平结、双联结等基础结法，编织一款寓意吉祥的中国结挂饰。',
      objectives: JSON.stringify([
        '了解中国结的历史渊源与吉祥寓意',
        '掌握平结、双联结、纽扣结等3种以上基础结法',
        '独立完成一件完整的中国结挂饰作品',
      ]),
      materials: JSON.stringify(['红色编织绳（2mm，约3米）', '金色流苏', '剪刀', '打火机（收口用，需大人协助）', '珠子/玉石（装饰，可选）', '结艺板与大头针（辅助定型）']),
      steps: JSON.stringify([
        { title: '认识绳材', desc: '了解不同粗细编织绳的特性，本次选用2mm红绳，剪取所需长度并用火轻烫两端防散。', icon: '🪢' },
        { title: '编双联结', desc: '取绳对折，左绳在右绳上绕一圈打结，再右绳绕左绳打结，拉紧即成双联结，作为起始节点。', icon: '🔴' },
        { title: '编平结主体', desc: '以中心绳为轴，左右各取一绳交替编平结：左绳压中→绕右→从右绳下穿出，反向重复。', icon: '🪡' },
        { title: '穿入装饰珠', desc: '编至适当长度后，将中心绳穿入装饰珠，继续在珠下方编平结固定。', icon: '📿' },
        { title: '收尾结', desc: '末端编纽扣结或双联结收尾，用打火机（大人协助）轻烫绳头防散开。', icon: '🔥' },
        { title: '装配流苏', desc: '在结的下端穿入流苏，调整整体长度与形态，完成挂饰制作。', icon: '🎋' },
      ]),
      safetyTips: '使用打火机收口须有大人在场；剪绳时剪刀开口朝外，手指远离刀刃；编结时注意不要拉绳过猛伤到手指。',
    },
    {
      gradeId: 6,
      semesterId: 2,
      taskGroupId: 'industry',
      title: '金属丝花瓶架的设计与制作',
      emoji: '🔩',
      color: '#F5F5F5',
      description: '运用金属丝的弯折、缠绕、成形等技法，设计并制作一款能稳固支撑玻璃瓶的金属丝花瓶架。',
      objectives: JSON.stringify([
        '认识铝丝、铁丝等金属丝材料的特性与用途',
        '掌握金属丝的测量、弯折、缠绕等基本加工技法',
        '能根据瓶子尺寸自主设计并完成一件花瓶架',
      ]),
      materials: JSON.stringify(['铝丝或软铁丝（1.5-2mm，约2米）', '圆嘴钳', '平嘴钳', '斜嘴钳（剪丝）', '量尺', '玻璃瓶（用于比对尺寸）', '设计草图纸']),
      steps: JSON.stringify([
        { title: '设计草图', desc: '先量出玻璃瓶直径与高度，在纸上画出花瓶架的正视图与俯视图，标注各部分尺寸。', icon: '📐' },
        { title: '截取金属丝', desc: '根据草图计算所需金属丝长度（含弯折余量），用斜嘴钳截取，端头用平嘴钳压平防刺手。', icon: '✂️' },
        { title: '制作底部支撑圈', desc: '将金属丝绕瓶底弯成圆形托圈，交叉点用细丝缠绕3-4圈固定，确保水平放置不摇晃。', icon: '⭕' },
        { title: '弯折立柱', desc: '在托圈上等距标出3个点，分别向上弯折立柱，用圆嘴钳压出弧形，高度与瓶颈齐。', icon: '🔧' },
        { title: '制作颈部固定圈', desc: '按瓶颈直径弯出上部固定圈，将三根立柱末端向内弯折后与颈圈缠绕固定。', icon: '🔩' },
        { title: '调整与装饰', desc: '将瓶子放入架中，调整各处使其稳固垂直，可在立柱上缠绕彩色丝线或细铜丝装饰。', icon: '🌿' },
      ]),
      safetyTips: '金属丝截断后端头锋利，操作全程佩戴手套或用布保护手指；钳子使用时不要夹手，注意钳口方向。',
    },
    {
      gradeId: 6,
      semesterId: 2,
      taskGroupId: 'appliance',
      title: '电烤箱的使用与维护',
      emoji: '🔌',
      color: '#FFF3E0',
      description: '认识电烤箱的结构与功能，学习正确的使用方法和日常维护，为烘焙实践打好安全基础。',
      objectives: JSON.stringify([
        '认识电烤箱各部件名称与功能（上下管、旋钮、烤网、烤盘等）',
        '掌握预热、温度设定、定时操作等基本使用流程',
        '学会烤箱的日常清洁与安全使用规范',
      ]),
      materials: JSON.stringify(['电烤箱', '隔热手套', '烤盘与烤网', '烤箱温度计（可选）', '湿布（清洁用）', '中性清洁剂']),
      steps: JSON.stringify([
        { title: '认识结构', desc: '观察并说出烤箱各部件：加热管（上/下）、调温旋钮、定时器、烤盘、烤网、玻璃门。', icon: '👀' },
        { title: '放置与通电', desc: '确认烤箱放在隔热稳固台面，与墙壁保持10cm以上间距，插上电源检查指示灯。', icon: '🔌' },
        { title: '预热操作', desc: '根据食谱设定温度（如180℃），先空烤预热10分钟，等烤箱内部达到目标温度。', icon: '🌡️' },
        { title: '放入食物', desc: '戴好隔热手套打开烤箱门，将烤盘推入合适层（一般中层），轻轻关上门。', icon: '🧤' },
        { title: '监控完成', desc: '通过玻璃门观察食物状态，设定定时器，到时用隔热手套取出，放在隔热垫上。', icon: '⏱️' },
        { title: '清洁维护', desc: '完全冷却后，取出烤盘和烤网用温水加中性清洁剂清洗，用湿布擦拭内腔（断电后），晾干备用。', icon: '🧹' },
      ]),
      safetyTips: '操作烤箱全程须有大人在场；取放食物必须佩戴隔热手套；烤箱工作时玻璃门温度极高，切勿触碰；使用完毕及时断电。',
    },
    {
      gradeId: 6,
      semesterId: 2,
      taskGroupId: 'cook',
      title: '面包的烘焙',
      emoji: '🍞',
      color: '#FFF8E1',
      description: '综合运用电烤箱，学习面包面团的揉制、发酵与烘焙全过程，体验从原料到成品的完整烘焙乐趣。',
      objectives: JSON.stringify([
        '了解面粉、酵母、黄油等烘焙原料的作用',
        '掌握手工揉面、判断发酵状态的方法',
        '能独立完成一次简单面包的全程烘焙制作',
      ]),
      materials: JSON.stringify(['高筋面粉250g', '酵母3g', '糖20g', '盐3g', '温水160ml', '黄油20g', '鸡蛋液（表面刷色）', '烤箱', '隔热手套', '烤盘', '保鲜膜']),
      steps: JSON.stringify([
        { title: '混合材料', desc: '将面粉、糖、盐、酵母加入碗中混合，中间挖坑，倒入温水，用筷子搅拌至无干粉。', icon: '🥣' },
        { title: '揉面出膜', desc: '转至台面，加入软化黄油，反复折叠推揉约15分钟，直到面团光滑、可拉出薄膜。', icon: '👐' },
        { title: '一次发酵', desc: '面团滚圆放入碗中，盖保鲜膜，置于温暖处（28-30℃）发酵约60分钟，至体积翻倍。', icon: '⏳' },
        { title: '分割整形', desc: '取出面团轻拍排气，分成等份，各自滚圆后松弛10分钟，再整形成所需造型。', icon: '🔮' },
        { title: '二次发酵', desc: '整形好的面团放烤盘，盖湿布，再发酵30-40分钟至1.5倍大，表面刷蛋液。', icon: '🌡️' },
        { title: '烘烤完成', desc: '预热烤箱至180℃，放入中层烤18-22分钟，至表面金黄后取出，冷却后即可品尝。', icon: '🍞' },
      ]),
      safetyTips: '使用烤箱须有大人陪同；取放烤盘必须佩戴隔热手套；面包出炉后烤盘极烫，放在隔热垫上冷却，不要用手直接触碰。',
    },
  ];

  for (const course of courses) {
    const existing = await prisma.course.findFirst({
      where: {
        title: course.title,
        gradeId: course.gradeId,
        semesterId: course.semesterId,
      },
    });

    if (!existing) {
      await prisma.course.create({
        data: {
          id: uuidv4(),
          ...course,
        },
      });
    }
  }

  console.log('✅ 课程数据创建完成！');
}
