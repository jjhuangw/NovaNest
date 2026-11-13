// 動作圖解目錄：取自 free-exercise-db（https://github.com/yuhonas/free-exercise-db，Unlicense），
// 只挑選健身房常見的動作，圖片轉成 WebP 放在 public/exercises/{id}-0.webp（起始）與 -1.webp（結束）。
// 來源說明見 public/images/CREDITS.md。新增動作時，同時放入兩張圖片並在這裡加一筆。

export interface CatalogEntry {
  id: string
  zh: string
  en: string
  // 其他常見叫法（中英文皆可），用來對應課表上的動作名稱
  aliases: string[]
}

export const EXERCISE_CATALOG: CatalogEntry[] = [
  { id: "Barbell_Bench_Press_-_Medium_Grip", zh: "槓鈴臥推", en: "Barbell bench press", aliases: ["臥推", "平板臥推", "槓鈴平板臥推", "Barbell Bench Press - Medium Grip"] },
  { id: "Barbell_Incline_Bench_Press_-_Medium_Grip", zh: "上斜槓鈴臥推", en: "Incline barbell bench press", aliases: ["上斜臥推", "上斜胸推", "Barbell Incline Bench Press - Medium Grip"] },
  { id: "Decline_Barbell_Bench_Press", zh: "下斜槓鈴臥推", en: "Decline barbell bench press", aliases: ["下斜臥推"] },
  { id: "Close-Grip_Barbell_Bench_Press", zh: "窄握槓鈴臥推", en: "Close-grip bench press", aliases: ["窄握臥推", "Close-Grip Barbell Bench Press"] },
  { id: "Dumbbell_Bench_Press", zh: "啞鈴臥推", en: "Dumbbell bench press", aliases: ["平板啞鈴臥推"] },
  { id: "Incline_Dumbbell_Press", zh: "上斜啞鈴臥推", en: "Incline dumbbell press", aliases: ["上斜啞鈴推舉"] },
  { id: "Decline_Dumbbell_Bench_Press", zh: "下斜啞鈴臥推", en: "Decline dumbbell bench press", aliases: [] },
  { id: "Dumbbell_Bench_Press_with_Neutral_Grip", zh: "中立握啞鈴臥推", en: "Neutral-grip dumbbell press", aliases: ["Dumbbell Bench Press with Neutral Grip"] },
  { id: "Hammer_Grip_Incline_DB_Bench_Press", zh: "中立握上斜啞鈴臥推", en: "Neutral-grip incline dumbbell press", aliases: ["Hammer Grip Incline DB Bench Press"] },
  { id: "Dumbbell_Floor_Press", zh: "啞鈴地板臥推", en: "Dumbbell floor press", aliases: ["地板臥推"] },
  { id: "Dumbbell_Flyes", zh: "啞鈴飛鳥", en: "Dumbbell fly", aliases: ["平板啞鈴飛鳥", "Dumbbell Flyes"] },
  { id: "Incline_Dumbbell_Flyes", zh: "上斜啞鈴飛鳥", en: "Incline dumbbell fly", aliases: ["Incline Dumbbell Flyes"] },
  { id: "Machine_Bench_Press", zh: "坐姿胸推機", en: "Machine chest press", aliases: ["胸推機", "胸推", "器械胸推", "Machine Bench Press"] },
  { id: "Leverage_Chest_Press", zh: "槓桿式胸推機", en: "Lever chest press", aliases: ["Leverage Chest Press"] },
  { id: "Leverage_Incline_Chest_Press", zh: "上斜胸推機", en: "Incline machine chest press", aliases: ["上斜器械胸推", "Leverage Incline Chest Press"] },
  { id: "Smith_Machine_Bench_Press", zh: "史密斯臥推", en: "Smith machine bench press", aliases: ["Smith 臥推"] },
  { id: "Smith_Machine_Incline_Bench_Press", zh: "史密斯上斜臥推", en: "Smith machine incline press", aliases: ["Smith 上斜臥推", "Smith Machine Incline Bench Press"] },
  { id: "Butterfly", zh: "蝴蝶機夾胸", en: "Pec deck fly", aliases: ["蝴蝶機", "夾胸機", "蝴蝶夾胸", "Butterfly"] },
  { id: "Cable_Crossover", zh: "滑輪夾胸", en: "Cable crossover", aliases: ["繩索夾胸", "高位滑輪夾胸"] },
  { id: "Low_Cable_Crossover", zh: "低位至高位滑輪夾胸", en: "Low-to-high cable fly", aliases: ["低位滑輪夾胸", "Low Cable Crossover"] },
  { id: "Flat_Bench_Cable_Flyes", zh: "平板滑輪飛鳥", en: "Flat bench cable fly", aliases: ["Flat Bench Cable Flyes"] },
  { id: "Incline_Cable_Flye", zh: "上斜滑輪飛鳥", en: "Incline cable fly", aliases: ["Incline Cable Flye"] },
  { id: "Cable_Chest_Press", zh: "站姿滑輪胸推", en: "Standing cable chest press", aliases: ["滑輪胸推", "Cable Chest Press"] },
  { id: "Pushups", zh: "伏地挺身", en: "Push-up", aliases: ["俯地挺身", "Pushups"] },
  { id: "Incline_Push-Up", zh: "上斜伏地挺身", en: "Incline push-up", aliases: ["跪姿伏地挺身"] },
  { id: "Push-Ups_With_Feet_Elevated", zh: "下斜伏地挺身", en: "Decline push-up", aliases: ["Push-Ups With Feet Elevated"] },
  { id: "Push-Ups_-_Close_Triceps_Position", zh: "窄距伏地挺身", en: "Close-grip push-up", aliases: ["鑽石伏地挺身", "Push-Ups - Close Triceps Position"] },
  { id: "Dips_-_Triceps_Version", zh: "雙槓撐體（三頭）", en: "Triceps dip", aliases: ["雙槓下推", "雙槓臂屈伸", "Dips - Triceps Version"] },
  { id: "Dip_Machine", zh: "輔助雙槓撐體機", en: "Dip machine", aliases: [] },
  { id: "Bench_Dips", zh: "板凳撐體", en: "Bench dip", aliases: ["椅子撐體", "Bench Dips"] },
  { id: "Wide-Grip_Lat_Pulldown", zh: "高位下拉", en: "Lat pulldown", aliases: ["滑輪下拉", "寬握下拉", "寬握高位下拉", "Wide-Grip Lat Pulldown"] },
  { id: "Close-Grip_Front_Lat_Pulldown", zh: "窄握高位下拉", en: "Close-grip lat pulldown", aliases: ["Close-Grip Front Lat Pulldown"] },
  { id: "V-Bar_Pulldown", zh: "V 把高位下拉", en: "V-bar pulldown", aliases: ["對握下拉"] },
  { id: "Underhand_Cable_Pulldowns", zh: "反握高位下拉", en: "Underhand pulldown", aliases: ["反握下拉", "Underhand Cable Pulldowns"] },
  { id: "One_Arm_Lat_Pulldown", zh: "單手高位下拉", en: "Single-arm lat pulldown", aliases: ["單手下拉", "One Arm Lat Pulldown"] },
  { id: "Pullups", zh: "引體向上", en: "Pull-up", aliases: ["正握引體向上", "Pullups"] },
  { id: "Chin-Up", zh: "反握引體向上", en: "Chin-up", aliases: [] },
  { id: "Straight-Arm_Pulldown", zh: "直臂下拉", en: "Straight-arm pulldown", aliases: [] },
  { id: "Rope_Straight-Arm_Pulldown", zh: "繩索直臂下拉", en: "Rope straight-arm pulldown", aliases: [] },
  { id: "Seated_Cable_Rows", zh: "坐姿划船", en: "Seated cable row", aliases: ["坐姿滑輪划船", "坐姿划船機", "Seated Cable Rows"] },
  { id: "Seated_One-arm_Cable_Pulley_Rows", zh: "單手坐姿滑輪划船", en: "Single-arm seated cable row", aliases: ["Seated One-arm Cable Pulley Rows"] },
  { id: "Leverage_Iso_Row", zh: "器械划船", en: "Machine row", aliases: ["划船機", "坐姿器械划船", "Leverage Iso Row"] },
  { id: "Leverage_High_Row", zh: "高位划船機", en: "High row machine", aliases: ["Leverage High Row"] },
  { id: "Dumbbell_Incline_Row", zh: "胸靠啞鈴划船", en: "Chest-supported dumbbell row", aliases: ["胸靠划船", "上斜胸靠划船", "Dumbbell Incline Row"] },
  { id: "One-Arm_Dumbbell_Row", zh: "單手啞鈴划船", en: "One-arm dumbbell row", aliases: ["單臂啞鈴划船"] },
  { id: "Bent_Over_Barbell_Row", zh: "槓鈴俯身划船", en: "Barbell bent-over row", aliases: ["俯身划船", "槓鈴划船", "Bent Over Barbell Row"] },
  { id: "Reverse_Grip_Bent-Over_Rows", zh: "反握槓鈴划船", en: "Reverse-grip barbell row", aliases: ["Reverse Grip Bent-Over Rows"] },
  { id: "Bent_Over_Two-Dumbbell_Row", zh: "啞鈴俯身划船", en: "Dumbbell bent-over row", aliases: ["Bent Over Two-Dumbbell Row"] },
  { id: "T-Bar_Row_with_Handle", zh: "T 槓划船", en: "T-bar row", aliases: ["T-Bar Row with Handle"] },
  { id: "Lying_T-Bar_Row", zh: "胸靠 T 槓划船", en: "Chest-supported T-bar row", aliases: ["Lying T-Bar Row"] },
  { id: "Smith_Machine_Bent_Over_Row", zh: "史密斯划船", en: "Smith machine row", aliases: ["Smith Machine Bent Over Row"] },
  { id: "Inverted_Row", zh: "反式划船", en: "Inverted row", aliases: ["澳式引體"] },
  { id: "Face_Pull", zh: "繩索面拉", en: "Face pull", aliases: ["面拉"] },
  { id: "Cable_Rope_Rear-Delt_Rows", zh: "繩索後三角划船", en: "Rope rear-delt row", aliases: ["Cable Rope Rear-Delt Rows"] },
  { id: "Reverse_Machine_Flyes", zh: "反向蝴蝶機", en: "Reverse pec deck", aliases: ["胸靠反向飛鳥", "反向飛鳥機", "後三角飛鳥機", "Reverse Machine Flyes"] },
  { id: "Reverse_Flyes", zh: "反向飛鳥", en: "Reverse fly", aliases: ["俯身反向飛鳥", "Reverse Flyes"] },
  { id: "Seated_Bent-Over_Rear_Delt_Raise", zh: "坐姿俯身啞鈴後三角飛鳥", en: "Seated bent-over rear delt raise", aliases: ["俯身側平舉"] },
  { id: "Cable_Rear_Delt_Fly", zh: "滑輪後三角飛鳥", en: "Cable rear delt fly", aliases: [] },
  { id: "Band_Pull_Apart", zh: "彈力帶拉開", en: "Band pull-apart", aliases: ["Band Pull Apart"] },
  { id: "Barbell_Deadlift", zh: "槓鈴硬舉", en: "Barbell deadlift", aliases: ["硬舉", "傳統硬舉"] },
  { id: "Sumo_Deadlift", zh: "相撲硬舉", en: "Sumo deadlift", aliases: [] },
  { id: "Romanian_Deadlift", zh: "羅馬尼亞硬舉", en: "Romanian deadlift", aliases: ["RDL", "槓鈴羅馬尼亞硬舉"] },
  { id: "Stiff-Legged_Dumbbell_Deadlift", zh: "啞鈴羅馬尼亞硬舉", en: "Dumbbell Romanian deadlift", aliases: ["啞鈴直腿硬舉", "Stiff-Legged Dumbbell Deadlift"] },
  { id: "Stiff-Legged_Barbell_Deadlift", zh: "直腿硬舉", en: "Stiff-legged deadlift", aliases: ["Stiff-Legged Barbell Deadlift"] },
  { id: "Rack_Pulls", zh: "架上硬舉", en: "Rack pull", aliases: ["Rack Pulls"] },
  { id: "Kettlebell_One-Legged_Deadlift", zh: "單腿硬舉", en: "Single-leg deadlift", aliases: ["單腳羅馬尼亞硬舉", "Kettlebell One-Legged Deadlift"] },
  { id: "Good_Morning", zh: "早安體前屈", en: "Good morning", aliases: [] },
  { id: "Hyperextensions_With_No_Hyperextension_Bench", zh: "背部伸展", en: "Back extension", aliases: ["背部伸展機", "山羊挺身", "Hyperextensions With No Hyperextension Bench"] },
  { id: "Barbell_Shrug", zh: "槓鈴聳肩", en: "Barbell shrug", aliases: ["聳肩"] },
  { id: "Dumbbell_Shrug", zh: "啞鈴聳肩", en: "Dumbbell shrug", aliases: [] },
  { id: "Barbell_Shoulder_Press", zh: "坐姿槓鈴肩推", en: "Seated barbell shoulder press", aliases: ["Barbell Shoulder Press"] },
  { id: "Standing_Military_Press", zh: "站姿槓鈴肩推", en: "Overhead press", aliases: ["站姿肩推", "軍事推舉", "Standing Military Press"] },
  { id: "Dumbbell_Shoulder_Press", zh: "啞鈴肩推", en: "Dumbbell shoulder press", aliases: ["坐姿啞鈴肩推"] },
  { id: "Standing_Dumbbell_Press", zh: "站姿啞鈴肩推", en: "Standing dumbbell press", aliases: [] },
  { id: "Arnold_Dumbbell_Press", zh: "阿諾肩推", en: "Arnold press", aliases: ["Arnold Dumbbell Press"] },
  { id: "Machine_Shoulder_Military_Press", zh: "坐姿肩推機", en: "Machine shoulder press", aliases: ["肩推機", "器械肩推", "Machine Shoulder (Military) Press"] },
  { id: "Leverage_Shoulder_Press", zh: "槓桿式肩推機", en: "Lever shoulder press", aliases: ["Leverage Shoulder Press"] },
  { id: "Smith_Machine_Overhead_Shoulder_Press", zh: "史密斯肩推", en: "Smith machine shoulder press", aliases: ["Smith Machine Overhead Shoulder Press"] },
  { id: "Cable_Shoulder_Press", zh: "滑輪肩推", en: "Cable shoulder press", aliases: [] },
  { id: "Side_Lateral_Raise", zh: "啞鈴側平舉", en: "Dumbbell lateral raise", aliases: ["側平舉", "Side Lateral Raise"] },
  { id: "Seated_Side_Lateral_Raise", zh: "坐姿側平舉", en: "Seated lateral raise", aliases: ["Seated Side Lateral Raise"] },
  { id: "Cable_Seated_Lateral_Raise", zh: "滑輪側平舉", en: "Cable lateral raise", aliases: ["單手滑輪側平舉", "Cable Seated Lateral Raise"] },
  { id: "Lateral_Raise_-_With_Bands", zh: "彈力帶側平舉", en: "Band lateral raise", aliases: ["Lateral Raise - With Bands"] },
  { id: "Front_Dumbbell_Raise", zh: "啞鈴前平舉", en: "Dumbbell front raise", aliases: ["前平舉", "Front Dumbbell Raise"] },
  { id: "Front_Cable_Raise", zh: "滑輪前平舉", en: "Cable front raise", aliases: ["Front Cable Raise"] },
  { id: "Upright_Barbell_Row", zh: "槓鈴直立划船", en: "Barbell upright row", aliases: ["直立划船", "Upright Barbell Row"] },
  { id: "Upright_Cable_Row", zh: "滑輪直立划船", en: "Cable upright row", aliases: ["Upright Cable Row"] },
  { id: "External_Rotation_with_Cable", zh: "滑輪肩外旋", en: "Cable external rotation", aliases: ["肩外旋", "External Rotation with Cable"] },
  { id: "Barbell_Curl", zh: "槓鈴彎舉", en: "Barbell curl", aliases: ["二頭彎舉"] },
  { id: "EZ-Bar_Curl", zh: "EZ 槓彎舉", en: "EZ-bar curl", aliases: [] },
  { id: "Dumbbell_Bicep_Curl", zh: "啞鈴彎舉", en: "Dumbbell curl", aliases: ["啞鈴二頭彎舉", "Dumbbell Bicep Curl"] },
  { id: "Dumbbell_Alternate_Bicep_Curl", zh: "交替啞鈴彎舉", en: "Alternating dumbbell curl", aliases: ["Dumbbell Alternate Bicep Curl"] },
  { id: "Hammer_Curls", zh: "錘式彎舉", en: "Hammer curl", aliases: ["槌式彎舉", "Hammer Curls"] },
  { id: "Incline_Dumbbell_Curl", zh: "上斜啞鈴彎舉", en: "Incline dumbbell curl", aliases: [] },
  { id: "Concentration_Curls", zh: "集中彎舉", en: "Concentration curl", aliases: ["Concentration Curls"] },
  { id: "Preacher_Curl", zh: "牧師椅彎舉", en: "Preacher curl", aliases: ["牧師凳彎舉"] },
  { id: "Machine_Preacher_Curls", zh: "牧師椅彎舉機", en: "Machine preacher curl", aliases: ["Machine Preacher Curls"] },
  { id: "Machine_Bicep_Curl", zh: "二頭彎舉機", en: "Machine biceps curl", aliases: ["Machine Bicep Curl"] },
  { id: "Standing_Biceps_Cable_Curl", zh: "滑輪彎舉", en: "Cable curl", aliases: ["繩索彎舉", "Standing Biceps Cable Curl"] },
  { id: "Cable_Hammer_Curls_-_Rope_Attachment", zh: "繩索錘式彎舉", en: "Rope hammer curl", aliases: ["Cable Hammer Curls - Rope Attachment"] },
  { id: "Spider_Curl", zh: "蜘蛛彎舉", en: "Spider curl", aliases: [] },
  { id: "Reverse_Barbell_Curl", zh: "反握槓鈴彎舉", en: "Reverse barbell curl", aliases: [] },
  { id: "Zottman_Curl", zh: "佐特曼彎舉", en: "Zottman curl", aliases: [] },
  { id: "Triceps_Pushdown", zh: "三頭下壓", en: "Triceps pushdown", aliases: ["滑輪三頭下壓", "直槓三頭下壓"] },
  { id: "Triceps_Pushdown_-_Rope_Attachment", zh: "三頭繩索下壓", en: "Rope triceps pushdown", aliases: ["繩索下壓", "三頭肌繩索下壓", "Triceps Pushdown - Rope Attachment"] },
  { id: "Triceps_Pushdown_-_V-Bar_Attachment", zh: "V 把三頭下壓", en: "V-bar pushdown", aliases: ["Triceps Pushdown - V-Bar Attachment"] },
  { id: "Reverse_Grip_Triceps_Pushdown", zh: "反握三頭下壓", en: "Reverse-grip pushdown", aliases: ["Reverse Grip Triceps Pushdown"] },
  { id: "Cable_Rope_Overhead_Triceps_Extension", zh: "繩索過頭三頭伸展", en: "Rope overhead triceps extension", aliases: ["過頭三頭伸展", "繩索過頭伸展", "Cable Rope Overhead Triceps Extension"] },
  { id: "Standing_Dumbbell_Triceps_Extension", zh: "啞鈴過頭三頭伸展", en: "Dumbbell overhead triceps extension", aliases: ["啞鈴頸後臂屈伸", "Standing Dumbbell Triceps Extension"] },
  { id: "EZ-Bar_Skullcrusher", zh: "EZ 槓仰臥三頭伸展", en: "EZ-bar skull crusher", aliases: ["碎顱者", "仰臥三頭伸展", "EZ-Bar Skullcrusher"] },
  { id: "Lying_Dumbbell_Tricep_Extension", zh: "啞鈴仰臥三頭伸展", en: "Dumbbell skull crusher", aliases: ["Lying Dumbbell Tricep Extension"] },
  { id: "Tricep_Dumbbell_Kickback", zh: "啞鈴三頭後踢", en: "Dumbbell kickback", aliases: ["三頭後踢", "Tricep Dumbbell Kickback"] },
  { id: "Machine_Triceps_Extension", zh: "三頭伸展機", en: "Machine triceps extension", aliases: [] },
  { id: "Barbell_Squat", zh: "槓鈴深蹲", en: "Barbell back squat", aliases: ["深蹲", "背蹲", "Barbell Squat"] },
  { id: "Barbell_Full_Squat", zh: "槓鈴全蹲", en: "Barbell full squat", aliases: [] },
  { id: "Front_Barbell_Squat", zh: "槓鈴前蹲舉", en: "Front squat", aliases: ["前蹲舉", "Front Barbell Squat"] },
  { id: "Goblet_Squat", zh: "高腳杯深蹲", en: "Goblet squat", aliases: [] },
  { id: "Dumbbell_Squat", zh: "啞鈴深蹲", en: "Dumbbell squat", aliases: [] },
  { id: "Bodyweight_Squat", zh: "徒手深蹲", en: "Bodyweight squat", aliases: ["空手深蹲"] },
  { id: "Box_Squat", zh: "箱上深蹲", en: "Box squat", aliases: [] },
  { id: "Dumbbell_Squat_To_A_Bench", zh: "啞鈴箱上深蹲", en: "Dumbbell box squat", aliases: ["椅子深蹲", "Dumbbell Squat To A Bench"] },
  { id: "Smith_Machine_Squat", zh: "史密斯深蹲", en: "Smith machine squat", aliases: ["Smith 深蹲"] },
  { id: "Hack_Squat", zh: "哈克深蹲", en: "Hack squat", aliases: ["哈克深蹲機"] },
  { id: "Plie_Dumbbell_Squat", zh: "啞鈴相撲深蹲", en: "Dumbbell sumo squat", aliases: ["相撲深蹲", "Plie Dumbbell Squat"] },
  { id: "Leg_Press", zh: "腿推機", en: "Leg press", aliases: ["腿推", "倒蹬"] },
  { id: "Narrow_Stance_Leg_Press", zh: "窄站距腿推", en: "Narrow-stance leg press", aliases: ["Narrow Stance Leg Press"] },
  { id: "Split_Squat_with_Dumbbells", zh: "保加利亞分腿蹲", en: "Bulgarian split squat", aliases: ["保加利亞蹲", "分腿蹲", "啞鈴分腿蹲", "Split Squat with Dumbbells"] },
  { id: "Smith_Single-Leg_Split_Squat", zh: "史密斯分腿蹲", en: "Smith machine split squat", aliases: ["Smith Single-Leg Split Squat"] },
  { id: "Dumbbell_Lunges", zh: "啞鈴弓步", en: "Dumbbell lunge", aliases: ["弓箭步", "啞鈴弓箭步", "Dumbbell Lunges"] },
  { id: "Dumbbell_Rear_Lunge", zh: "啞鈴後跨步蹲", en: "Dumbbell reverse lunge", aliases: ["後跨步", "反向弓步", "Dumbbell Rear Lunge"] },
  { id: "Barbell_Walking_Lunge", zh: "槓鈴行走弓步", en: "Barbell walking lunge", aliases: ["行走弓步", "行走弓箭步"] },
  { id: "Dumbbell_Step_Ups", zh: "啞鈴登階", en: "Dumbbell step-up", aliases: ["登階", "跨步上箱", "Dumbbell Step Ups"] },
  { id: "Leg_Extensions", zh: "腿伸展", en: "Leg extension", aliases: ["腿伸屈機", "坐姿腿伸展", "Leg Extensions"] },
  { id: "Lying_Leg_Curls", zh: "俯臥腿彎舉", en: "Lying leg curl", aliases: ["腿彎舉", "俯臥腿後勾", "Lying Leg Curls"] },
  { id: "Seated_Leg_Curl", zh: "坐姿腿彎舉", en: "Seated leg curl", aliases: ["坐姿腿後勾"] },
  { id: "Standing_Leg_Curl", zh: "站姿腿彎舉", en: "Standing leg curl", aliases: [] },
  { id: "Barbell_Hip_Thrust", zh: "槓鈴臀推", en: "Barbell hip thrust", aliases: ["臀推", "臀推機", "Hip thrust"] },
  { id: "Barbell_Glute_Bridge", zh: "槓鈴臀橋", en: "Barbell glute bridge", aliases: [] },
  { id: "Butt_Lift_Bridge", zh: "臀橋", en: "Glute bridge", aliases: ["徒手臀橋", "Butt Lift (Bridge)"] },
  { id: "Single_Leg_Glute_Bridge", zh: "單腳臀橋", en: "Single-leg glute bridge", aliases: ["Single Leg Glute Bridge"] },
  { id: "Glute_Kickback", zh: "跪姿後踢腿", en: "Glute kickback", aliases: ["驢踢"] },
  { id: "One-Legged_Cable_Kickback", zh: "滑輪後踢腿", en: "Cable glute kickback", aliases: ["繩索後踢", "One-Legged Cable Kickback"] },
  { id: "Thigh_Abductor", zh: "髖外展機", en: "Hip abductor machine", aliases: ["髖外展", "外展機", "Thigh Abductor"] },
  { id: "Thigh_Adductor", zh: "髖內收機", en: "Hip adductor machine", aliases: ["髖內收", "內收機", "Thigh Adductor"] },
  { id: "Monster_Walk", zh: "彈力帶側走", en: "Band lateral walk", aliases: ["怪獸走路", "彈力帶怪獸走", "Monster Walk"] },
  { id: "Pull_Through", zh: "滑輪髖屈伸", en: "Cable pull-through", aliases: ["Pull Through"] },
  { id: "Glute_Ham_Raise", zh: "臀腿抬升", en: "Glute-ham raise", aliases: ["Glute Ham Raise"] },
  { id: "Standing_Calf_Raises", zh: "站姿提踵", en: "Standing calf raise", aliases: ["小腿提踵", "提踵", "站姿小腿提踵", "Standing Calf Raises"] },
  { id: "Seated_Calf_Raise", zh: "坐姿提踵", en: "Seated calf raise", aliases: [] },
  { id: "Calf_Press_On_The_Leg_Press_Machine", zh: "腿推機提踵", en: "Leg press calf raise", aliases: ["Calf Press On The Leg Press Machine"] },
  { id: "Standing_Dumbbell_Calf_Raise", zh: "啞鈴提踵", en: "Dumbbell calf raise", aliases: ["Standing Dumbbell Calf Raise"] },
  { id: "Smith_Machine_Calf_Raise", zh: "史密斯提踵", en: "Smith machine calf raise", aliases: [] },
  { id: "Plank", zh: "棒式", en: "Plank", aliases: ["平板支撐"] },
  { id: "Side_Bridge", zh: "側棒式", en: "Side plank", aliases: ["Side Bridge"] },
  { id: "Crunches", zh: "捲腹", en: "Crunch", aliases: ["仰臥捲腹", "腹部訓練", "Crunches"] },
  { id: "Cable_Crunch", zh: "跪姿滑輪捲腹", en: "Cable crunch", aliases: ["繩索捲腹"] },
  { id: "Ab_Crunch_Machine", zh: "捲腹機", en: "Ab crunch machine", aliases: [] },
  { id: "Reverse_Crunch", zh: "反向捲腹", en: "Reverse crunch", aliases: [] },
  { id: "Hanging_Leg_Raise", zh: "懸垂舉腿", en: "Hanging leg raise", aliases: [] },
  { id: "Flat_Bench_Lying_Leg_Raise", zh: "仰臥抬腿", en: "Lying leg raise", aliases: ["躺姿抬腿", "Flat Bench Lying Leg Raise"] },
  { id: "Dead_Bug", zh: "死蟲式", en: "Dead bug", aliases: [] },
  { id: "Russian_Twist", zh: "俄羅斯轉體", en: "Russian twist", aliases: [] },
  { id: "Pallof_Press", zh: "抗旋轉推", en: "Pallof press", aliases: [] },
  { id: "Standing_Cable_Wood_Chop", zh: "滑輪伐木", en: "Cable wood chop", aliases: ["伐木", "Standing Cable Wood Chop"] },
  { id: "Barbell_Ab_Rollout_-_On_Knees", zh: "跪姿健腹輪", en: "Ab rollout", aliases: ["健腹輪", "滾輪", "Barbell Ab Rollout - On Knees"] },
  { id: "One-Arm_Kettlebell_Swings", zh: "壺鈴擺盪", en: "Kettlebell swing", aliases: ["壺鈴甩擺", "One-Arm Kettlebell Swings"] },
  { id: "Running_Treadmill", zh: "跑步機", en: "Treadmill", aliases: ["跑步", "慢跑", "跑步機慢跑", "Running, Treadmill"] },
  { id: "Walking_Treadmill", zh: "坡度快走", en: "Incline treadmill walk", aliases: ["快走", "跑步機快走", "坡度走路", "Walking, Treadmill"] },
  { id: "Bicycling_Stationary", zh: "飛輪", en: "Stationary bike", aliases: ["固定式腳踏車", "健身車", "Bicycling, Stationary"] },
  { id: "Elliptical_Trainer", zh: "滑步機", en: "Elliptical", aliases: ["橢圓機", "Elliptical Trainer"] },
  { id: "Rowing_Stationary", zh: "划船機有氧", en: "Rowing machine", aliases: ["划船機（有氧）", "Rowing, Stationary"] },
  { id: "Stairmaster", zh: "登階機", en: "Stair climber", aliases: ["爬樓梯機", "Stairmaster"] },
]

const BY_ID = new Map(EXERCISE_CATALOG.map((e) => [e.id, e]))

export function findCatalogEntry(id: string | null | undefined): CatalogEntry | null {
  return (id && BY_ID.get(id)) || null
}

export function catalogImages(id: string): [string, string] {
  return [`/exercises/${id}-0.webp`, `/exercises/${id}-1.webp`]
}

// 比對用：忽略大小寫、空白、標點與括號內的補充說明
export function normalizeExerciseName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\s\-–—_・·.,，、/／'’"]+/g, '')
}

const BY_NAME = new Map<string, string>()
for (const e of EXERCISE_CATALOG) {
  for (const n of [e.zh, e.en, ...e.aliases]) {
    const key = normalizeExerciseName(n)
    if (!BY_NAME.has(key)) BY_NAME.set(key, e.id)
  }
}

// 依課表上的動作名稱找圖解；「A 或 B」「A / B」時先試整個名稱，再依序試各個選項
export function matchCatalog(name: string): string | null {
  const whole = BY_NAME.get(normalizeExerciseName(name))
  if (whole) return whole
  for (const part of name.split(/或|\bor\b|\/|／/i)) {
    const id = BY_NAME.get(normalizeExerciseName(part))
    if (id) return id
  }
  return null
}
