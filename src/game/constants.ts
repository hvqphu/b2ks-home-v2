import {
  ActivityConfigId,
  ActivityConfigItem,
  B2KSState,
  BgmThemeDef,
  BuildingShape,
  CrossWorldItem,
  EnglishQuestion,
  NavDestination,
  PetAccessoryDef,
  PetVariantDef
} from '../types/b2ks';
import { GLOBAL_SUCCESS_ENGLISH_BANK } from './englishCurriculum';

export const MAX_PARENT_POINTS = 500;
export const DAILY_PARENT_ALLOWANCE = 150;
export const DEFAULT_FIREBASE_URL = 'https://b2ks-home-default-rtdb.asia-southeast1.firebasedatabase.app';

// Expanded neighborhood world so Fashion Boutique and Arcade have plenty of space + 3 new zones
export const STREET_WORLD = { width: 2520, height: 1700 };
export const HOUSE_WORLD = { width: 1120, height: 800 };
export const PRIVATE_ROOM_WORLD = { width: 760, height: 420 };

export const PLOTS = [
  { x: 440, y: 340, label: 'Lô số 1 (Khu Tây)' },
  { x: 860, y: 340, label: 'Lô số 2 (Trung tâm)' },
  { x: 440, y: 880, label: 'Lô số 3 (Đại lộ Nam)' }
];

export const ROOM_DECOR_SLOTS = [
  { id: 'slot_bedside', label: 'Đầu giường ngủ', x: 208, y: 205 },
  { id: 'slot_left_corner', label: 'Góc trái phòng', x: 105, y: 342 },
  { id: 'slot_window', label: 'Dưới cửa sổ', x: 322, y: 175 },
  { id: 'slot_mid_left', label: 'Bên trái thảm', x: 265, y: 305 },
  { id: 'slot_center', label: 'Trung tâm thảm', x: 390, y: 290 },
  { id: 'slot_bookshelf_side', label: 'Góc tường phải', x: 575, y: 190 },
  { id: 'slot_right_corner', label: 'Góc phải thảm', x: 520, y: 332 },
  { id: 'slot_right_wall', label: 'Góc phải tủ đồ', x: 668, y: 338 }
];

export const SHOP_CATALOG = [
  { id: 'd_plant', category: 'decor', name: 'Chậu cây Monstera', icon: '🪴', price: 25, desc: 'Chậu gốm trắng & cây lá xẻ xanh mướt' },
  { id: 'd_bear', category: 'decor', name: 'Gấu bông Khổng lồ', icon: '🧸', price: 35, desc: 'Chú gấu bông nâu mềm mại ngồi góc phòng' },
  { id: 'd_pc', category: 'decor', name: 'Bàn học & Máy tính', icon: '🖥️', price: 60, desc: 'Bàn học gỗ kèm màn hình PC, bàn phím & ghế' },
  { id: 'd_guitar', category: 'decor', name: 'Đàn Guitar Gỗ Acoustic', icon: '🎸', price: 45, desc: 'Cây đàn guitar gỗ đặt trên giá đỡ nghệ thuật' },
  { id: 'd_aquarium', category: 'decor', name: 'Bể cá Thủy Sinh Mini', icon: '🐠', price: 50, desc: 'Bể kính trong suốt có cá vàng & rong biển' },
  { id: 'tv_30min', category: 'tv_card', name: 'Thẻ Xem YouTube (+30 phút)', icon: '📺', price: 35, desc: 'Nạp thêm 30 phút xem Tivi YouTube trong ngày' }
];

// Kept only for backward compatibility with vouchers already stored in member bags
export const LEGACY_VOUCHERS = [
  { id: 'v_icecream', category: 'voucher', name: 'Phiếu Ăn Kem Tự Chọn', icon: '🍦', price: 50, desc: 'Đổi 1 ly kem mát lạnh cuối tuần' },
  { id: 'v_movie', category: 'voucher', name: 'Phiếu Xem Phim Rạp', icon: '🎬', price: 100, desc: 'Cùng gia đình đi xem phim' },
  { id: 'v_game', category: 'voucher', name: 'Thêm 30 phút Chơi Game', icon: '🎮', price: 40, desc: 'Thẻ đặc quyền giải trí' },
  { id: 'v_dish', category: 'voucher', name: 'Thẻ Miễn Rửa Bát 1 Lần', icon: '🍽️', price: 60, desc: 'Chuyển lượt rửa bát cho Bố/Mẹ' }
];

export const FASHION_CATALOG = [
  { id: 'f_set_royal', sub: 'set', name: 'Set Hoàng Tử / Công Chúa', icon: '🤴', price: 75, shirtColor: '#8E44AD', shirtPattern: 'vest', pantsColor: '#2C3E50', pantsStyle: 'pants', desc: 'Gồm: Áo gile tím cổ trắng hoàng gia + Quần tây dài xanh than lịch lãm' },
  { id: 'f_set_princess', sub: 'set', name: 'Set Váy Hồng Dạ Hội', icon: '👗', price: 75, shirtColor: '#E91E63', shirtPattern: 'heart', pantsColor: '#D81B60', pantsStyle: 'skirt', desc: 'Gồm: Áo hồng in trái tim + Chân váy xòe xếp ly hồng đậm nữ tính' },
  { id: 'f_set_sport', sub: 'set', name: 'Set Thể Thao Năng Động', icon: '⚽', price: 55, shirtColor: '#E74C3C', shirtPattern: 'stripe', pantsColor: '#1F618D', pantsStyle: 'shorts', desc: 'Gồm: Áo thun thể thao đỏ kẻ ngang trắng + Quần short xanh dương thoáng mát' },
  { id: 'f_set_sailor', sub: 'set', name: 'Set Thủy Thủ Hải Quân', icon: '⛵', price: 65, shirtColor: '#16A085', shirtPattern: 'collar', pantsColor: '#2C3E50', pantsStyle: 'pants', desc: 'Gồm: Áo cổ thủy thủ xanh ngọc bích + Quần dài hải quân chỉnh tề' },
  { id: 'f_set_astronaut', sub: 'set', name: 'Set Phi Hành Gia Sao Vàng', icon: '🚀', price: 85, shirtColor: '#F39C12', shirtPattern: 'star', pantsColor: '#5D6D7E', pantsStyle: 'pants', desc: 'Gồm: Áo cam in ngôi sao vàng nổi bật + Quần du hành vũ trụ xám bạc' },
  // Áo riêng (Shirts)
  { id: 'f_shirt_galaxy', sub: 'shirt', name: 'Áo Khoác Vũ Trụ Galaxy', icon: '🧥', price: 42, shirtColor: '#4F46E5', shirtPattern: 'star', desc: 'Áo tím xanh vũ trụ in sao lấp lánh, dễ phối với mọi loại quần & váy' },
  { id: 'f_shirt_sakura', sub: 'shirt', name: 'Áo Len Sakura Ngọt Ngào', icon: '👚', price: 38, shirtColor: '#EC4899', shirtPattern: 'heart', desc: 'Áo hồng pastel trái tim dịu dàng cực xinh cho các buổi dạo phố' },
  { id: 'f_shirt_mint_hoodie', sub: 'shirt', name: 'Áo Hoodie Bạc Hà Thể Thao', icon: '👕', price: 35, shirtColor: '#10B981', shirtPattern: 'stripe', desc: 'Áo hoodie xanh bạc hà kẻ sọc trắng trẻ trung, năng động' },
  { id: 'f_shirt_gold_vest', sub: 'shirt', name: 'Áo Gile Hoàng Kim Quý Tộc', icon: '🦺', price: 48, shirtColor: '#D97706', shirtPattern: 'vest', desc: 'Áo gile vàng đồng sang trọng phong cách cổ điển' },
  { id: 'f_shirt_sky_polo', sub: 'shirt', name: 'Áo Sơ Mi Bầu Trời Thanh Lịch', icon: '👔', price: 32, shirtColor: '#0EA5E9', shirtPattern: 'collar', desc: 'Áo cổ bẻ xanh trời sáng gọn gàng và mát mẻ' },
  // Quần & Váy riêng (Pants & Skirts)
  { id: 'f_pants_sky_jeans', sub: 'pants', name: 'Quần Jeans Xanh Rách Cá Tính', icon: '👖', price: 34, pantsColor: '#2563EB', pantsStyle: 'pants', desc: 'Quần jeans dài xanh tươi tôn dáng, hợp với mọi mẫu áo' },
  { id: 'f_pants_beige_chino', sub: 'pants', name: 'Quần Tây Kaki Kem Thanh Lịch', icon: '🩳', price: 36, pantsColor: '#B45309', pantsStyle: 'pants', desc: 'Quần dài kaki tông nâu ấm sang trọng' },
  { id: 'f_pants_sport_shorts', sub: 'pants', name: 'Quần Short Đá Bóng B2KS', icon: '🩳', price: 28, pantsColor: '#DC2626', pantsStyle: 'shorts', desc: 'Quần short đỏ siêu nhẹ giúp chạy nhảy ghi bàn cực nhanh' },
  { id: 'f_skirt_lavender', sub: 'pants', name: 'Chân Váy Xếp Ly Lavender', icon: '🩰', price: 38, pantsColor: '#9333EA', pantsStyle: 'skirt', desc: 'Chân váy xòe tím lavender bồng bềnh duyên dáng' },
  { id: 'f_skirt_mint', sub: 'pants', name: 'Chân Váy Xanh Ngọc Năng Động', icon: '🩰', price: 36, pantsColor: '#0D9488', pantsStyle: 'skirt', desc: 'Chân váy xếp ly xanh ngọc tươi mát dễ phối áo thun & sơ mi' },
  // Mũ & Phụ kiện
  { id: 'o_crown', sub: 'hat', name: 'Vương miện Hoàng gia', icon: '👑', price: 80, desc: 'Vương miện vàng kim lấp lánh đội trên đầu, hợp với Set Hoàng Gia' },
  { id: 'o_cap', sub: 'hat', name: 'Mũ lưỡi trai Thể thao', icon: '🧢', price: 30, desc: 'Mũ lưỡi trai xanh cá tính dành cho các buổi dạo phố & chơi thể thao' },
  { id: 'o_tophat', sub: 'hat', name: 'Mũ Ảo Thuật Gia', icon: '🎩', price: 45, desc: 'Mũ chóp cao màu đen cổ điển phong cách quý tộc' },
  { id: 'o_ribbon', sub: 'hat', name: 'Nơ Hồng Dễ Thương', icon: '🎀', price: 35, desc: 'Nơ ruy băng hồng cài tóc cực kỳ xinh xắn' },
  { id: 'o_glasses', sub: 'acc', name: 'Kính râm Thời trang', icon: '🕶️', price: 35, desc: 'Kính mát gọng đen sành điệu cho những ngày nắng đẹp' },
  { id: 'o_scarf', sub: 'acc', name: 'Khăn choàng Ấm áp', icon: '🧣', price: 30, desc: 'Khăn len đỏ giữ ấm cổ khi dạo phố buổi tối' },
  { id: 'o_backpack', sub: 'acc', name: 'Ba lô Khám phá', icon: '🎒', price: 40, desc: 'Ba lô đi học & dã ngoại năng động cho cả nhà' }
];

export const DEFAULT_CROSS_WORLD_ITEMS: CrossWorldItem[] = [
  { id: 'cw_10k', name: 'Đổi Tiền Mặt 10.000 VNĐ', icon: '💵', category: 'money', pointsCost: 100, realValue: '10.000 VNĐ tiền mặt', quantity: 3 },
  { id: 'cw_20k', name: 'Đổi Tiền Mặt 20.000 VNĐ', icon: '💰', category: 'money', pointsCost: 190, realValue: '20.000 VNĐ tiền mặt', quantity: 2 },
  { id: 'cw_game15', name: 'Thẻ +15 Phút Chơi Game Thực Tế', icon: '🎮', category: 'privilege', pointsCost: 60, realValue: 'Thêm 15 phút chơi game cuối ngày', quantity: 4 },
  { id: 'cw_dessert', name: 'Thẻ Chọn Món Tráng Miệng Cuối Tuần', icon: '🍨', category: 'privilege', pointsCost: 80, realValue: 'Tự chọn món kem / trà sữa / bánh ngọt', quantity: 2 }
];

export const HAIR_STYLES_VISUAL = [
  { id: 'short', label: 'Tóc ngắn' },
  { id: 'spiky', label: 'Tóc vuốt' },
  { id: 'sidepart', label: 'Rẽ ngôi 7/3' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'bob', label: 'Tóc Bob cúp' },
  { id: 'curly', label: 'Xoăn xù' },
  { id: 'long', label: 'Tóc dài mượt' },
  { id: 'wavy', label: 'Xoăn sóng dài' },
  { id: 'pigtails', label: 'Buộc 2 bên' },
  { id: 'ponytail', label: 'Đuôi ngựa' },
  { id: 'bun', label: 'Búi Natra đôi' },
  { id: 'braids', label: 'Tết bím 2 bên' }
];

export const HAIR_COLORS = ['#1A252F', '#4E342E', '#8D6E63', '#D4AC0D', '#E67E22', '#C0392B', '#8E44AD', '#2980B9', '#EC4899', '#16A085'];

export const SHIRT_VISUAL_OPTIONS = [
  { id: 'blue_polo', label: 'Áo Polo Xanh', color: '#2980B9', pattern: 'collar' },
  { id: 'pink_tee', label: 'Áo Thun Hồng', color: '#E91E63', pattern: 'heart' },
  { id: 'green_hoodie', label: 'Áo Hoodie Lá', color: '#27AE60', pattern: 'stripe' },
  { id: 'orange_star', label: 'Áo Ngôi Sao', color: '#F39C12', pattern: 'star' },
  { id: 'purple_vest', label: 'Áo Gile Tím', color: '#8E44AD', pattern: 'vest' },
  { id: 'red_sport', label: 'Áo Thể Thao', color: '#E74C3C', pattern: 'stripe' },
  { id: 'teal_sailor', label: 'Áo Thủy Thủ', color: '#16A085', pattern: 'collar' },
  { id: 'navy_suit', label: 'Áo Vest Lịch Lãm', color: '#34495E', pattern: 'vest' }
];

export const PANTS_VISUAL_OPTIONS = [
  { id: 'jeans_dark', label: 'Quần Jeans Đậm', color: '#2C3E50', style: 'pants' },
  { id: 'jeans_blue', label: 'Quần Jeans Xanh', color: '#1F618D', style: 'pants' },
  { id: 'skirt_purple', label: 'Chân Váy Tím', color: '#8E44AD', style: 'skirt' },
  { id: 'skirt_red', label: 'Chân Váy Đỏ', color: '#C0392B', style: 'skirt' },
  { id: 'shorts_teal', label: 'Quần Short Lửng', color: '#117864', style: 'shorts' },
  { id: 'khaki_gold', label: 'Quần Kaki Vàng', color: '#B9770E', style: 'pants' },
  { id: 'skirt_pink', label: 'Chân Váy Hồng', color: '#D81B60', style: 'skirt' },
  { id: 'slacks_grey', label: 'Quần Tây Xám', color: '#5D6D7E', style: 'pants' }
];

export const ACTIVITY_RULES = {
  eat: { label: 'Ăn cơm', cooldownMs: 15 * 60 * 1000, maxPerDay: 5, reward: 2, fullMsg: 'Bụng no căng rồi! Để lát nữa mới ăn tiếp được nhé 😋', doneMsg: 'Hôm nay đã ăn đủ bữa chính rồi! 🍽️' },
  sleep: { label: 'Đi ngủ', cooldownMs: 30 * 60 * 1000, maxPerDay: 2, reward: 2, fullMsg: 'Mình vừa ngủ dậy, tỉnh táo lắm rồi! Đi chơi thôi ☀️', doneMsg: 'Hôm nay đã ngủ đủ giấc trưa & tối rồi! 😴' },
  park_rest: { label: 'Nghỉ chân Quảng trường', cooldownMs: 15 * 60 * 1000, maxPerDay: 3, reward: 2, fullMsg: 'Mình vừa nghỉ ngơi ở quảng trường rồi! Đi khám phá tiếp thôi ⛲', doneMsg: 'Hôm nay đã nhận đủ điểm dạo công viên rồi! 🌳' }
} as const;

export const DEFAULT_ACTIVITY_CONFIGS: Record<ActivityConfigId, ActivityConfigItem> = {
  english_chat: {
    id: 'english_chat',
    label: '💬 Trò chuyện Tiếng Anh (Chat bar)',
    desc: 'Gõ câu Tiếng Anh hợp lệ ở thanh thoại để hiện bong bóng & nhận sao (Chống lặp câu & giãn cách 30 giây)',
    reward: 2,
    enabled: true,
    cooldownMs: 30 * 1000,
    maxPerDay: 10,
    unitLabel: '⭐/lần'
  },
  eat: {
    id: 'eat',
    label: '🍽️ Ăn cơm & Đố Tiếng Anh (Phòng ăn)',
    desc: 'Giải câu đố món ăn bằng Tiếng Anh tại bàn ăn gia đình',
    reward: 2,
    enabled: true,
    cooldownMs: 15 * 60 * 1000,
    maxPerDay: 5,
    unitLabel: '⭐/bữa'
  },
  sleep: {
    id: 'sleep',
    label: '😴 Đi ngủ / Nghỉ ngơi (Phòng riêng)',
    desc: 'Ngủ trưa / tối đúng giờ trên giường phòng riêng',
    reward: 2,
    enabled: true,
    cooldownMs: 30 * 60 * 1000,
    maxPerDay: 2,
    unitLabel: '⭐/giấc'
  },
  park_rest: {
    id: 'park_rest',
    label: '⛲ Nghỉ chân Quảng trường',
    desc: 'Thư giãn tại Đài Phun Nước ngoài Khu Phố',
    reward: 2,
    enabled: true,
    cooldownMs: 15 * 60 * 1000,
    maxPerDay: 3,
    unitLabel: '⭐/lần'
  },
  english_quiz_per_correct: {
    id: 'english_quiz_per_correct',
    label: '🎓 Đố Vui Tiếng Anh Lớp 6 (Mỗi câu đúng)',
    desc: 'Điểm thưởng cho từng câu trả lời đúng tại Trung Tâm Tiếng Anh',
    reward: 2,
    enabled: true,
    unitLabel: '⭐/câu'
  },
  english_quiz_high_bonus: {
    id: 'english_quiz_high_bonus',
    label: '🏆 Thưởng Đạt >=8/10 Đố Vui Tiếng Anh',
    desc: 'Điểm thưởng cộng thêm khi bé làm bài thi Tiếng Anh đạt từ 8 câu đúng trở lên',
    reward: 5,
    enabled: true,
    unitLabel: '⭐/lần'
  },
  homework_high_bonus: {
    id: 'homework_high_bonus',
    label: '📝 Thưởng Bài Tập Điểm Cao (>=8/10)',
    desc: 'Điểm thưởng thêm khi Bố/Mẹ chấm bài tập từ 8 điểm trở lên',
    reward: 10,
    enabled: true,
    unitLabel: '⭐/bài'
  },
  read_comic: {
    id: 'read_comic',
    label: '📚 Đọc Truyện Tranh Tiếng Anh (Tủ Sách)',
    desc: 'Hoàn thành đọc hết 1 truyện tranh Tiếng Anh tại Tủ Sách Phòng Sinh Hoạt Chung',
    reward: 5,
    enabled: true,
    cooldownMs: 120 * 1000,
    maxPerDay: 5,
    unitLabel: '⭐/truyện'
  }
};

export const DEFAULT_ENGLISH_BANK: EnglishQuestion[] = GLOBAL_SUCCESS_ENGLISH_BANK;

export const ENGLISH_WORDS = new Set([
  'hello', 'hi', 'good', 'morning', 'afternoon', 'evening', 'night', 'thank', 'thanks',
  'you', 'please', 'love', 'family', 'dad', 'father', 'mom', 'mother', 'brother', 'sister',
  'homework', 'done', 'finish', 'finished', 'clean', 'room', 'house', 'eat', 'dinner',
  'lunch', 'breakfast', 'water', 'help', 'can', 'yes', 'no', 'okay', 'ok', 'great',
  'awesome', 'nice', 'happy', 'study', 'read', 'book', 'play', 'game', 'what', 'how',
  'are', 'is', 'am', 'doing', 'going', 'to', 'the', 'my', 'your', 'we', 'have', 'a', 'an', 'open', 'door'
]);

export const DINING_FOOD_PUZZLES = [
  { word: 'PIZZA', emoji: '🍕', vi: 'Bánh Pizza', hint: 'Món bánh nướng tròn nổi tiếng của Ý có phô mai' },
  { word: 'BURGER', emoji: '🍔', vi: 'Bánh Mì Kẹp Thịt', hint: 'Bánh tròn kẹp thịt bò, rau xà lách và phô mai' },
  { word: 'NOODLES', emoji: '🍜', vi: 'Mì / Phở', hint: 'Món sợi ăn nóng bằng đũa trong bát tô' },
  { word: 'CHICKEN', emoji: '🍗', vi: 'Thịt Gà', hint: 'Đùi gà rán hoặc nướng thơm ngon' },
  { word: 'SANDWICH', emoji: '🥪', vi: 'Bánh Mì Kẹp', hint: 'Hai lát bánh mì lát kẹp nhân ở giữa' },
  { word: 'SALAD', emoji: '🥗', vi: 'Rau Trộn', hint: 'Món rau củ tươi xanh tốt cho sức khỏe' },
  { word: 'SUSHI', emoji: '🍣', vi: 'Cơm Cuộn Nhật', hint: 'Món cơm cuộn rong biển và cá hồi của Nhật Bản' },
  { word: 'PANCAKE', emoji: '🥞', vi: 'Bánh Kếp', hint: 'Bánh rán tròn xếp chồng ăn với mật ong buổi sáng' },
  { word: 'ICECREAM', emoji: '🍦', vi: 'Kem Lạnh', hint: 'Món tráng miệng mát lạnh ngọt ngào' },
  { word: 'WATERMELON', emoji: '🍉', vi: 'Dưa Hấu', hint: 'Loại quả vỏ xanh ruột đỏ mọng nước' },
  { word: 'STRAWBERRY', emoji: '🍓', vi: 'Dâu Tây', hint: 'Quả màu đỏ nhỏ xinh có vị chua ngọt' },
  { word: 'CROISSANT', emoji: '🥐', vi: 'Bánh Sừng Bò', hint: 'Bánh mì ngàn lớp hình trăng khuyết của Pháp' }
];

export const PET_SHOP_POS = { x: 2345, y: 345, interactY: 410 };
export const SOCCER_PITCH_POS = { x: 2060, y: 1400 };

export const PET_SPECIES = [
  {
    id: 'pet_corgi',
    name: 'Cún Thần Tốc',
    eggName: 'Trứng Cún Vàng Năng Động',
    eggIcon: '🥚',
    eggPrice: 150,
    primaryColor: '#F59E0B',
    accentColor: '#FEF3C7',
    statLabel: '⚡ Tốc độ di chuyển & +Sao nhiệm vụ',
    desc: 'Chú cún thông minh chạy lon ton siêu đáng yêu, giúp tăng tốc độ dạo phố & thưởng thêm sao.',
    hungerDecayPerMin: 0.55,
    stages: [
      { stage: 0 as const, title: 'Trứng Cún Vàng', minXp: 0, scale: 0.85, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Cún Con Lon Ton', minXp: 0, scale: 0.78, speedBonus: 0.35, starBonus: 1 },
      { stage: 2 as const, title: 'Cún Bảnh Bao', minXp: 100, scale: 0.94, speedBonus: 0.65, starBonus: 1 },
      { stage: 3 as const, title: 'Siêu Cún Tia Chớp', minXp: 260, scale: 1.1, speedBonus: 1.0, starBonus: 2 },
      { stage: 4 as const, title: 'Thần Khuyển Ánh Sáng', minXp: 520, scale: 1.24, speedBonus: 1.35, starBonus: 3 }
    ]
  },
  {
    id: 'pet_kitty',
    name: 'Mèo Tiên Ánh Sao',
    eggName: 'Trứng Mèo Hồng Mộng Mơ',
    eggIcon: '🥚',
    eggPrice: 240,
    primaryColor: '#EC4899',
    accentColor: '#FCE7F3',
    statLabel: '⭐ Thưởng thêm Sao học tập & dạo phố',
    desc: 'Cô mèo phép thuật biết mọc cánh bướm khi tiến hóa, mang lại may mắn cộng sao mỗi ngày.',
    hungerDecayPerMin: 0.5,
    stages: [
      { stage: 0 as const, title: 'Trứng Mèo Ngọc Trai', minXp: 0, scale: 0.85, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Mèo Con Xinh Xắn', minXp: 0, scale: 0.78, speedBonus: 0.25, starBonus: 1 },
      { stage: 2 as const, title: 'Mèo Phép Thuật', minXp: 100, scale: 0.94, speedBonus: 0.5, starBonus: 2 },
      { stage: 3 as const, title: 'Mèo Tiên Cánh Bướm', minXp: 260, scale: 1.1, speedBonus: 0.8, starBonus: 3 },
      { stage: 4 as const, title: 'Nữ Hoàng Tinh Tú', minXp: 520, scale: 1.24, speedBonus: 1.1, starBonus: 4 }
    ]
  },
  {
    id: 'pet_owl',
    name: 'Cú Tuyết Thông Thái',
    eggName: 'Trứng Cú Băng Tri Thức',
    eggIcon: '🥚',
    eggPrice: 350,
    primaryColor: '#0EA5E9',
    accentColor: '#E0F2FE',
    statLabel: '🎓 Bậc thầy Tiếng Anh & +Sao vượt trội',
    desc: 'Bạn đồng hành thông thái giúp bé hăng say giải đố Tiếng Anh và nhận thưởng sao hậu hĩnh.',
    hungerDecayPerMin: 0.45,
    stages: [
      { stage: 0 as const, title: 'Trứng Cú Tuyết Băng', minXp: 0, scale: 0.85, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Cú Bông Nhỏ Xíu', minXp: 0, scale: 0.78, speedBonus: 0.3, starBonus: 1 },
      { stage: 2 as const, title: 'Cú Đeo Kính Học Giả', minXp: 100, scale: 0.94, speedBonus: 0.55, starBonus: 2 },
      { stage: 3 as const, title: 'Pháp Sư Cú Tuyết', minXp: 260, scale: 1.1, speedBonus: 0.9, starBonus: 3 },
      { stage: 4 as const, title: 'Thần Cú Thiên Hà', minXp: 520, scale: 1.24, speedBonus: 1.2, starBonus: 4 }
    ]
  },
  {
    id: 'pet_unicorn',
    name: 'Kỳ Lân Cầu Vồng',
    eggName: 'Trứng Kỳ Lân Pha Lê',
    eggIcon: '🥚',
    eggPrice: 480,
    primaryColor: '#8B5CF6',
    accentColor: '#F3E8FF',
    statLabel: '🌈 Bay nhanh siêu hạng & Hào quang Sao',
    desc: 'Sinh vật huyền thoại sừng pha lê tỏa sáng rực rỡ trên phố, nâng tối đa tốc độ & sao thưởng.',
    hungerDecayPerMin: 0.6,
    stages: [
      { stage: 0 as const, title: 'Trứng Kỳ Lân Pha Lê', minXp: 0, scale: 0.85, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Ngựa Con Kỳ Lân', minXp: 0, scale: 0.8, speedBonus: 0.45, starBonus: 1 },
      { stage: 2 as const, title: 'Kỳ Lân Bờm Bảy Sắc', minXp: 110, scale: 0.96, speedBonus: 0.75, starBonus: 2 },
      { stage: 3 as const, title: 'Kỳ Lân Cánh Thiên Thần', minXp: 280, scale: 1.12, speedBonus: 1.15, starBonus: 3 },
      { stage: 4 as const, title: 'Thánh Thú Cầu Vồng', minXp: 560, scale: 1.26, speedBonus: 1.5, starBonus: 5 }
    ]
  },
  {
    id: 'pet_dragon',
    name: 'Rồng Lửa Hoàng Kim',
    eggName: 'Trứng Rồng Cổ Đại Huyền Thoại',
    eggIcon: '🥚',
    eggPrice: 650,
    primaryColor: '#EF4444',
    accentColor: '#FEF08A',
    statLabel: '🔥 Sức mạnh Toàn Năng Tối Thượng',
    desc: 'Trứng Rồng hiếm nhất khu phố — mục tiêu danh giá cho bé chăm chỉ nhất, tiến hóa thành Thần Long!',
    hungerDecayPerMin: 0.7,
    stages: [
      { stage: 0 as const, title: 'Trứng Rồng Cổ Đại', minXp: 0, scale: 0.88, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Rồng Lửa Nhỏ', minXp: 0, scale: 0.82, speedBonus: 0.5, starBonus: 2 },
      { stage: 2 as const, title: 'Hỏa Long Chiến Binh', minXp: 120, scale: 0.98, speedBonus: 0.85, starBonus: 3 },
      { stage: 3 as const, title: 'Thiên Long Rực Cháy', minXp: 300, scale: 1.15, speedBonus: 1.25, starBonus: 4 },
      { stage: 4 as const, title: 'Chúa Tể Rồng Hoàng Kim', minXp: 600, scale: 1.3, speedBonus: 1.65, starBonus: 6 }
    ]
  },
  {
    id: 'pet_bunny',
    name: 'Thỏ Ngọc Tia Chớp',
    eggName: 'Trứng Thỏ Bạc Đáng Yêu',
    eggIcon: '🥚',
    eggPrice: 180,
    primaryColor: '#F472B6',
    accentColor: '#FDF2F8',
    statLabel: '🐰 Nhảy Siêu Nhanh & +Sao Đáng Yêu',
    desc: 'Chú thỏ tai dài siêu dễ thương nhảy nhót tung tăng, giúp tăng tốc chạy cực nhanh trên phố.',
    hungerDecayPerMin: 0.55,
    stages: [
      { stage: 0 as const, title: 'Trứng Thỏ Bạc', minXp: 0, scale: 0.85, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Thỏ Con Bông Gòn', minXp: 0, scale: 0.78, speedBonus: 0.45, starBonus: 1 },
      { stage: 2 as const, title: 'Thỏ Đeo Nơ Vàng', minXp: 100, scale: 0.94, speedBonus: 0.75, starBonus: 1 },
      { stage: 3 as const, title: 'Thỏ Ngọc Cánh Tiên', minXp: 260, scale: 1.1, speedBonus: 1.1, starBonus: 2 },
      { stage: 4 as const, title: 'Nữ Thần Thỏ Mặt Trăng', minXp: 520, scale: 1.24, speedBonus: 1.45, starBonus: 3 }
    ]
  },
  {
    id: 'pet_penguin',
    name: 'Chim Cánh Cụt Băng',
    eggName: 'Trứng Cánh Cụt Nam Cực',
    eggIcon: '🥚',
    eggPrice: 210,
    primaryColor: '#0284C7',
    accentColor: '#E0F2FE',
    statLabel: '🐧 Lướt Băng Nhanh & +Sao Kiên Trì',
    desc: 'Chú chim cánh cụt mũm mĩm lạch bạch siêu cưng, giúp bé luôn mát mẻ và cộng sao đều đặn.',
    hungerDecayPerMin: 0.45,
    stages: [
      { stage: 0 as const, title: 'Trứng Cánh Cụt Băng', minXp: 0, scale: 0.85, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Cánh Cụt Bông Xám', minXp: 0, scale: 0.78, speedBonus: 0.3, starBonus: 1 },
      { stage: 2 as const, title: 'Cánh Cụt Quàng Khăn', minXp: 100, scale: 0.94, speedBonus: 0.55, starBonus: 2 },
      { stage: 3 as const, title: 'Hiệp Sĩ Cánh Cụt', minXp: 260, scale: 1.1, speedBonus: 0.9, starBonus: 3 },
      { stage: 4 as const, title: 'Hoàng Đế Nam Cực', minXp: 520, scale: 1.24, speedBonus: 1.25, starBonus: 4 }
    ]
  },
  {
    id: 'pet_panda',
    name: 'Gấu Trúc Kungfu',
    eggName: 'Trứng Gấu Trúc Tre Xanh',
    eggIcon: '🥚',
    eggPrice: 290,
    primaryColor: '#16A34A',
    accentColor: '#DCFCE7',
    statLabel: '🐼 Võ Sư Nhí & +Sao Siêu Chăm Chỉ',
    desc: 'Gấu trúc mũm mĩm tập võ công cùng bé, tiến hóa thành Đại Sư Kungfu bảo vệ cả nhà.',
    hungerDecayPerMin: 0.5,
    stages: [
      { stage: 0 as const, title: 'Trứng Gấu Trúc Tre', minXp: 0, scale: 0.86, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Gấu Trúc Nhỏ Xíu', minXp: 0, scale: 0.8, speedBonus: 0.3, starBonus: 1 },
      { stage: 2 as const, title: 'Gấu Trúc Đeo Băng Trán', minXp: 105, scale: 0.96, speedBonus: 0.6, starBonus: 2 },
      { stage: 3 as const, title: 'Võ Sư Panda', minXp: 270, scale: 1.12, speedBonus: 0.95, starBonus: 3 },
      { stage: 4 as const, title: 'Thần Thú Thái Cực', minXp: 540, scale: 1.26, speedBonus: 1.3, starBonus: 4 }
    ]
  },
  {
    id: 'pet_fox',
    name: 'Cáo Lửa Kitsune',
    eggName: 'Trứng Hồ Ly Ngọn Lửa',
    eggIcon: '🥚',
    eggPrice: 420,
    primaryColor: '#EA580C',
    accentColor: '#FFEDD5',
    statLabel: '🦊 Lanh Lợi Tuyệt Đỉnh & +Sao Cao',
    desc: 'Chú cáo lửa nhanh nhẹn với chiếc đuôi bồng bềnh huyền bí, bứt phá tốc độ di chuyển.',
    hungerDecayPerMin: 0.58,
    stages: [
      { stage: 0 as const, title: 'Trứng Hồ Ly Lửa', minXp: 0, scale: 0.86, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Cáo Con Tinh Nghịch', minXp: 0, scale: 0.8, speedBonus: 0.45, starBonus: 1 },
      { stage: 2 as const, title: 'Cáo Đuôi Lửa', minXp: 110, scale: 0.96, speedBonus: 0.75, starBonus: 2 },
      { stage: 3 as const, title: 'Hồ Ly Chín Đuôi', minXp: 280, scale: 1.12, speedBonus: 1.15, starBonus: 3 },
      { stage: 4 as const, title: 'Thần Cáo Thái Dương', minXp: 550, scale: 1.26, speedBonus: 1.5, starBonus: 5 }
    ]
  },
  {
    id: 'pet_phoenix',
    name: 'Phượng Hoàng Bất Tử',
    eggName: 'Trứng Phượng Hoàng Mặt Trời',
    eggIcon: '🥚',
    eggPrice: 750,
    primaryColor: '#DC2626',
    accentColor: '#FEF9C3',
    statLabel: '🦅 Huyền Thoại Tối Cao & +Sao Kỷ Lục',
    desc: 'Loài thần thú quý hiếm nhất B2KS với bộ lông rực sáng bầu trời — phần thưởng xứng đáng cho quán quân!',
    hungerDecayPerMin: 0.65,
    stages: [
      { stage: 0 as const, title: 'Trứng Phượng Hoàng', minXp: 0, scale: 0.9, speedBonus: 0, starBonus: 0 },
      { stage: 1 as const, title: 'Chim Lửa Nhỏ', minXp: 0, scale: 0.84, speedBonus: 0.55, starBonus: 2 },
      { stage: 2 as const, title: 'Phượng Hoàng Rực Sáng', minXp: 130, scale: 1.0, speedBonus: 0.95, starBonus: 3 },
      { stage: 3 as const, title: 'Thiên Phượng Cánh Vàng', minXp: 320, scale: 1.18, speedBonus: 1.35, starBonus: 5 },
      { stage: 4 as const, title: 'Thần Điểu Bất Tử', minXp: 650, scale: 1.34, speedBonus: 1.8, starBonus: 7 }
    ]
  }
];

export const PET_FOOD_CATALOG = [
  {
    id: 'food_biscuit',
    name: 'Bánh Quy Dinh Dưỡng',
    icon: '🦴',
    price: 12,
    xpGain: 25,
    hungerGain: 35,
    desc: 'Giúp thú cưng no bụng & tăng +25 XP trưởng thành.'
  },
  {
    id: 'food_berry',
    name: 'Quả Mọng Năng Lượng',
    icon: '🍓',
    price: 28,
    xpGain: 65,
    hungerGain: 60,
    desc: 'Trái cây phép thuật tăng +65 XP & hồi phục năng lượng nhanh.'
  },
  {
    id: 'food_star_candy',
    name: 'Kẹo Sao Tiến Hóa',
    icon: '🌟',
    price: 60,
    xpGain: 150,
    hungerGain: 100,
    desc: 'Siêu thức ăn giúp thú cưng bứt phá +150 XP tiến hóa cấp bậc!'
  }
];

export const NEIGHBORHOOD_LOCATIONS: NavDestination[] = [
  { id: 'house', name: 'Nhà Phố Gia Đình', icon: '🏡', category: 'home' as const, x: 860, y: 425, color: '#EF4444' },
  { id: 'eng_park', name: 'Công Viên Tiếng Anh', icon: '💬', category: 'learn' as const, x: 175, y: 425, color: '#22C55E' },
  { id: 'supermarket', name: 'Siêu Thị Gia Đình', icon: '🏪', category: 'shop' as const, x: 1560, y: 410, color: '#F97316' },
  { id: 'cross_world', name: 'Trung Tâm Xuyên Thế Giới', icon: '🌌', category: 'shop' as const, x: 1980, y: 410, color: '#7C3AED' },
  { id: 'pet_shop', name: 'Cửa Hàng Thú Cưng', icon: '🐾', category: 'shop' as const, x: 2345, y: 410, color: '#F59E0B' },
  { id: 'english_center', name: 'Trung Tâm Tiếng Anh', icon: '🎓', category: 'learn' as const, x: 250, y: 925, color: '#0D9488' },
  { id: 'fashion', name: 'Cửa Hàng Thời Trang', icon: '👗', category: 'shop' as const, x: 600, y: 945, color: '#EC4899' },
  { id: 'arcade', name: 'Khu Vui Chơi Arcade', icon: '🕹️', category: 'play' as const, x: 950, y: 790, color: '#E11D48' },
  { id: 'lab', name: 'Phòng Thí Nghiệm B2KS', icon: '🧪', category: 'learn' as const, x: 1540, y: 790, color: '#0284C7' },
  { id: 'salon', name: 'Salon Tóc Nghệ Thuật', icon: '💇', category: 'shop' as const, x: 1760, y: 975, color: '#9333EA' },
  { id: 'flea_market', name: 'Chợ Trời B2KS', icon: '🎪', category: 'shop' as const, x: 1980, y: 790, color: '#D97706' },
  { id: 'fountain_plaza', name: 'Quảng Trường Đài Phun Nước', icon: '⛲', category: 'play' as const, x: 280, y: 1420, color: '#38BDF8' },
  { id: 'zoo', name: 'Sở Thú Ảo B2KS Zoo', icon: '🦁', category: 'learn' as const, x: 820, y: 1485, color: '#16A34A' },
  { id: 'reading_corner', name: 'Góc Đọc Sách Ngoài Trời', icon: '📚', category: 'learn' as const, x: 1540, y: 1400, color: '#059669' },
  { id: 'soccer', name: 'Sân Bóng Đá B2KS', icon: '⚽', category: 'play' as const, x: 2060, y: 1400, color: '#15803D' }
];

export const DEFAULT_MEMBER_AGES: Record<string, number> = {
  dad: 38,
  mom: 36,
  kid1: 12,
  kid2: 8
};

export const BUILDING_SHAPE_OPTIONS: { id: BuildingShape; label: string; icon: string; desc: string }[] = [
  { id: 'classic', label: 'Cổ Điển', icon: '🏛️', desc: 'Mái truyền thống thân thiện & biển hiệu ấm áp' },
  { id: 'modern', label: 'Hiện Đại Kính', icon: '🏢', desc: 'Mái bằng vát cạnh, viền kính & đèn LED nổi bật' },
  { id: 'pavilion', label: 'Mái Vòm Pavilion', icon: '⛺', desc: 'Mái cong 2 tầng kiểu công viên lễ hội rực rỡ' },
  { id: 'castle', label: 'Lâu Đài Cổ Tích', icon: '🏰', desc: 'Tháp nhọn hai bên, cờ hiệu & cổng vòm cổ tích' }
];

export const BGM_THEME_OPTIONS: BgmThemeDef[] = [
  {
    id: 'sunny_town',
    name: 'Phố Nắng Vui Tươi',
    icon: '☀️',
    desc: 'Giai điệu thị trấn ấm áp, nhẹ nhàng mặc định',
    stepMs: 430,
    oscType: 'triangle',
    bassType: 'sine',
    melody: [261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66],
    bass: [130.81, 0, 164.81, 0, 196.0, 0, 146.83, 0]
  },
  {
    id: 'adventure_rpg',
    name: 'Phiêu Lưu Khám Phá',
    icon: '🧭',
    desc: 'Nhịp hành khúc phấn khởi cho các nhiệm vụ',
    stepMs: 320,
    oscType: 'triangle',
    bassType: 'triangle',
    melody: [293.66, 349.23, 440.0, 523.25, 493.88, 440.0, 392.0, 329.63, 293.66, 392.0, 440.0, 587.33],
    bass: [146.83, 146.83, 220.0, 0, 196.0, 0, 164.81, 196.0, 146.83, 0, 220.0, 0]
  },
  {
    id: 'cozy_lullaby',
    name: 'Êm Dịu Buổi Tối',
    icon: '🌙',
    desc: 'Nhẹ nhàng thư giãn khi đọc truyện & nghỉ ngơi',
    stepMs: 560,
    oscType: 'sine',
    bassType: 'sine',
    melody: [329.63, 392.0, 493.88, 392.0, 293.66, 349.23, 440.0, 349.23],
    bass: [164.81, 0, 164.81, 0, 146.83, 0, 146.83, 0]
  },
  {
    id: 'retro_chiptune',
    name: 'Retro Arcade 8-bit',
    icon: '🕹️',
    desc: 'Âm thanh máy game cổ điển sôi động',
    stepMs: 250,
    oscType: 'square',
    bassType: 'triangle',
    melody: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 783.99],
    bass: [130.81, 196.0, 130.81, 196.0, 146.83, 220.0, 174.61, 196.0]
  },
  {
    id: 'calm_forest',
    name: 'Vườn Xanh Thiên Nhiên',
    icon: '🌿',
    desc: 'Âm hưởng ngũ cung trong trẻo gần gũi thiên nhiên',
    stepMs: 470,
    oscType: 'sine',
    bassType: 'sine',
    melody: [261.63, 293.66, 392.0, 440.0, 523.25, 440.0, 392.0, 293.66],
    bass: [130.81, 0, 196.0, 0, 130.81, 0, 146.83, 0]
  }
];

export const PET_VARIANT_DEFS: PetVariantDef[] = [
  { id: 'classic', label: 'Nguyên Bản', rarityLabel: 'Phổ thông', chancePercent: 50, badgeColor: '#64748B' },
  { id: 'pastel', label: 'Pastel Kẹo Ngọt', rarityLabel: 'Ít gặp', chancePercent: 20, badgeColor: '#EC4899' },
  { id: 'royal', label: 'Hoàng Gia Lam Tím', rarityLabel: 'Hiếm', chancePercent: 15, badgeColor: '#7C3AED' },
  { id: 'cosmic', label: 'Ngân Hà Huyền Bí', rarityLabel: 'Cực Hiếm', chancePercent: 10, badgeColor: '#0284C7' },
  { id: 'golden', label: 'Hoàng Kim Lấp Lánh', rarityLabel: 'Siêu Hiếm', chancePercent: 5, badgeColor: '#D97706' }
];

export const PET_ACCESSORY_CATALOG: PetAccessoryDef[] = [
  { id: 'pacc_bow', name: 'Nơ Hồng Xinh Xắn', icon: '🎀', price: 30, desc: 'Chiếc nơ ruy-băng nổi bật cài trên đầu thú cưng' },
  { id: 'pacc_bell', name: 'Chuông Vàng May Mắn', icon: '🔔', price: 35, desc: 'Vòng cổ chuông vàng leng keng khi chạy nhảy cùng bé' },
  { id: 'pacc_glasses', name: 'Kính Râm Siêu Ngầu', icon: '🕶️', price: 45, desc: 'Kính mát thời trang cực ngầu cho thú cưng dạo phố' },
  { id: 'pacc_scarf', name: 'Khăn Choàng Ấm Áp', icon: '🧣', price: 40, desc: 'Khăn len đỏ giữ ấm vào những ngày mưa hoặc trời lạnh' },
  { id: 'pacc_wizard', name: 'Mũ Phù Thủy Nhí', icon: '🧙', price: 65, desc: 'Mũ chóp sao phép thuật dành cho thú cưng thông thái' },
  { id: 'pacc_crown', name: 'Vương Miện Nhí', icon: '👑', price: 85, desc: 'Vương miện mini lấp lánh tôn vinh thú cưng cưng nhất' }
];

export function normalizeFamilySlug(rawName: string | undefined | null): string {
  const clean = String(rawName || 'B2KS')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'b2ks';
}

export function formatFamilyBrand(text: string, familyName?: string | null): string {
  const brand = (familyName || 'B2KS').trim() || 'B2KS';
  return String(text || '').replace(/B2KS/g, brand);
}

export function resolveNeighborhoodLocations(state?: Pick<B2KSState, 'house' | 'buildingLayouts' | 'familyName'> | null): NavDestination[] {
  const brand = (state?.familyName || 'B2KS').trim() || 'B2KS';
  const activePlot = PLOTS[state?.house?.plotIndex ?? 1] || PLOTS[1];
  const overrides = state?.buildingLayouts || {};

  return NEIGHBORHOOD_LOCATIONS.map((loc) => {
    const ov = overrides[loc.id];
    const baseX = loc.id === 'house' ? activePlot.x : loc.x;
    const baseY = loc.id === 'house' ? activePlot.y + 85 : loc.y;
    return {
      ...loc,
      name: formatFamilyBrand(loc.name, brand),
      x: ov && typeof ov.x === 'number' ? Math.max(120, Math.min(STREET_WORLD.width - 120, Math.round(ov.x))) : baseX,
      y: ov && typeof ov.y === 'number' ? Math.max(300, Math.min(STREET_WORLD.height - 90, Math.round(ov.y))) : baseY,
      shape: ov?.shape || 'classic'
    };
  });
}

export function getFamilyFirebaseRoot(familyName?: string | null): string {
  const slug = normalizeFamilySlug(familyName);
  return slug === 'b2ks' ? 'b2ks_family_rpg_v16' : `b2ks_family_ns_${slug}`;
}



