import coverPepperCarrot from '../assets/images/comic_cover_pepper_carrot_1795099898592.jpg';
import coverAdaTelescope from '../assets/images/comic_cover_ada_telescope_1795099901297.jpg';
import coverMiloPip from '../assets/images/comic_cover_milo_pip_1795099900489.jpg';
import coverMidnightCode from '../assets/images/comic_cover_midnight_code_1795099900284.jpg';
import coverEmeraldBay from '../assets/images/comic_cover_emerald_bay_1795099900402.jpg';

export type ComicCategory = 'all' | 'science' | 'fantasy' | 'mystery';

export type PanelSceneId =
  | 'witch_lab_brew'
  | 'witch_herb_shelf'
  | 'witch_arena_stage'
  | 'witch_boom_mistake'
  | 'witch_sparkle_victory'
  | 'witch_tea_celebrate'
  | 'ada_classroom_chart'
  | 'ada_observatory_night'
  | 'ada_telescope_lens'
  | 'ada_jupiter_comet'
  | 'ada_data_screen'
  | 'ada_certificate'
  | 'milo_treehouse_midnight'
  | 'milo_sound_waves'
  | 'milo_water_tank'
  | 'milo_wood_knock'
  | 'milo_owl_reveal'
  | 'milo_concert'
  | 'code_library_dusk'
  | 'code_drone_hover'
  | 'code_tablet_binary'
  | 'code_hidden_shelf'
  | 'code_time_capsule'
  | 'code_club_badge'
  | 'bay_boat_sunset'
  | 'bay_coral_glow'
  | 'bay_ghost_net'
  | 'bay_ranger_radio'
  | 'bay_turtle_free'
  | 'bay_sunrise_pledge';

export interface ComicDialogue {
  speaker: string;
  text: string;
  side: 'left' | 'right' | 'center';
  bubbleType?: 'speech' | 'thought' | 'shout';
}

export interface ComicPanel {
  scene: PanelSceneId;
  caption?: string;
  sfx?: string;
  dialogues: ComicDialogue[];
}

export interface ComicVocab {
  word: string;
  pos: string;
  meaningVi: string;
}

export interface ComicPage {
  pageNumber: number;
  layout: '2x2' | 'top-wide' | 'hero-left';
  panels: ComicPanel[];
  vocab: ComicVocab[];
}

export interface ComicBook {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<ComicCategory, 'all'>;
  categoryLabel: string;
  ageLevel: string;
  sourceCredit: string;
  coverImage: string;
  accentColor: string;
  summaryVi: string;
  pages: ComicPage[];
  quiz: {
    question: string;
    options: [string, string, string];
    correctIndex: number;
    explanationVi: string;
  };
}

export const OPEN_COMIC_SOURCES = [
  {
    name: 'Pepper&Carrot (CC-BY 4.0)',
    desc: 'Bộ truyện tranh phép thuật mã nguồn mở nổi tiếng của họa sĩ David Revoy, phù hợp lứa tuổi 10–14.',
    urlLabel: 'peppercarrot.com'
  },
  {
    name: "Ada's Adventures in Science (CC-BY)",
    desc: 'Truyện tranh khoa học thiên văn & STEM cho học sinh THCS bởi nhà thiên văn học Edward Gomez.',
    urlLabel: 'adacomic.uk'
  },
  {
    name: 'Free Kids Books & Thunderbolt Kids (CC-BY)',
    desc: 'Kho truyện tranh tiếng Anh miễn phí chủ đề Vật lý, Vũ trụ và Bảo vệ thiên nhiên cho tuổi 10–13.',
    urlLabel: 'freekidsbooks.org'
  }
];

export const COMIC_BOOKS_CATALOG: ComicBook[] = [
  {
    id: 'comic_pepper_carrot',
    title: 'Pepper & Carrot: The Potion Contest',
    subtitle: 'Adapted from Episode 1 · Magic & Creativity',
    category: 'fantasy',
    categoryLabel: 'Phiêu lưu & Phép thuật',
    ageLevel: '11–13 tuổi · Lớp 6–7',
    sourceCredit: 'Adapted from Pepper&Carrot by David Revoy (CC-BY 4.0)',
    coverImage: coverPepperCarrot,
    accentColor: '#7C3AED',
    summaryVi:
      'Cô phù thủy nhỏ Pepper cùng chú mèo cam Carrot tham gia Cuộc thi Pha chế Thuốc Phép. Liệu sự sáng tạo có giúp Pepper vượt qua đối thủ kiêu ngạo Saffron?',
    pages: [
      {
        pageNumber: 1,
        layout: 'top-wide',
        panels: [
          {
            scene: 'witch_lab_brew',
            caption: 'Morning at Squirrel’s End cottage. Tomorrow is the Great Potion Championship!',
            sfx: 'BUBBLE!',
            dialogues: [
              { speaker: 'Pepper', text: 'Two drops of starlight dew, one pinch of cinnamon... Hold steady, Carrot!', side: 'left' },
              { speaker: 'Carrot', text: 'Meow?! Why is the soup glowing purple?!', side: 'right', bubbleType: 'thought' }
            ]
          },
          {
            scene: 'witch_herb_shelf',
            caption: 'Every witch in Komona City buys expensive dragon scales for the contest.',
            dialogues: [
              { speaker: 'Pepper', text: 'I cannot afford dragon scales, Carrot. We must invent something totally new!', side: 'left' }
            ]
          },
          {
            scene: 'witch_boom_mistake',
            sfx: 'POOF!',
            dialogues: [
              { speaker: 'Pepper', text: 'Oops! Too much fizzy ginger! Cough, cough!', side: 'center', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'championship', pos: 'noun', meaningVi: 'giải vô địch, cuộc thi lớn' },
          { word: 'afford', pos: 'verb', meaningVi: 'đủ tiền chi trả' },
          { word: 'invent', pos: 'verb', meaningVi: 'phát minh, sáng tạo ra' }
        ]
      },
      {
        pageNumber: 2,
        layout: '2x2',
        panels: [
          {
            scene: 'witch_herb_shelf',
            caption: 'Pepper searches her dusty wooden shelves for ordinary kitchen spices.',
            dialogues: [
              { speaker: 'Pepper', text: 'Wait a second! What happens if I combine mint leaves with honey and moonstone dust?', side: 'left' }
            ]
          },
          {
            scene: 'witch_lab_brew',
            sfx: 'FIZZ...',
            dialogues: [
              { speaker: 'Carrot', text: 'Purr... Actually, that smells like warm apple pie!', side: 'right', bubbleType: 'thought' },
              { speaker: 'Pepper', text: 'Whoa! Look at that turquoise swirl!', side: 'left' }
            ]
          },
          {
            scene: 'witch_tea_celebrate',
            caption: 'A single sip fills the entire room with gentle floating sparkles.',
            dialogues: [
              { speaker: 'Pepper', text: 'It does not explode—it makes anyone who drinks it feel brave and calm!', side: 'center' }
            ]
          },
          {
            scene: 'witch_arena_stage',
            caption: 'The next morning, the Grand Stadium of Komona is packed with cheering crowds.',
            sfx: 'TRUMPET!',
            dialogues: [
              { speaker: 'Announcer', text: 'Welcome, young witches! Show the judges your finest brew!', side: 'center', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'combine', pos: 'verb', meaningVi: 'kết hợp lại' },
          { word: 'ordinary', pos: 'adj', meaningVi: 'bình thường, quen thuộc' },
          { word: 'stadium', pos: 'noun', meaningVi: 'sân vận động, đấu trường' }
        ]
      },
      {
        pageNumber: 3,
        layout: 'hero-left',
        panels: [
          {
            scene: 'witch_arena_stage',
            caption: 'Saffron, the richest contestant, steps forward with a giant golden flask.',
            dialogues: [
              { speaker: 'Saffron', text: 'My potion uses rare phoenix feathers! Nobody can beat luxury magic!', side: 'right' },
              { speaker: 'Pepper', text: 'Gulp... Stay confident, Carrot. It is our turn next.', side: 'left' }
            ]
          },
          {
            scene: 'witch_boom_mistake',
            sfx: 'FLASH!',
            dialogues: [
              { speaker: 'Saffron', text: 'Behold! Giant fireworks from a teacup!', side: 'center', bubbleType: 'shout' }
            ]
          },
          {
            scene: 'witch_tea_celebrate',
            caption: 'The judges clap politely, though the smoke makes everyone sneeze.',
            dialogues: [
              { speaker: 'Judge', text: 'Very bright, Saffron! A bit smoky, though. Next: Pepper!', side: 'left' }
            ]
          }
        ],
        vocab: [
          { word: 'contestant', pos: 'noun', meaningVi: 'thí sinh dự thi' },
          { word: 'luxury', pos: 'noun', meaningVi: 'sự xa xỉ, đắt đỏ' },
          { word: 'confident', pos: 'adj', meaningVi: 'tự tin' }
        ]
      },
      {
        pageNumber: 4,
        layout: 'top-wide',
        panels: [
          {
            scene: 'witch_lab_brew',
            caption: 'Pepper sets her tiny, plain clay teapot on the marble pedestal.',
            dialogues: [
              { speaker: 'Saffron', text: 'Ha! Did she bring afternoon tea to a magic tournament?!', side: 'right' },
              { speaker: 'Pepper', text: 'Just wait until the judges taste it, Saffron.', side: 'left' }
            ]
          },
          {
            scene: 'witch_boom_mistake',
            caption: 'Suddenly, Carrot knocks over Saffron’s leftover spark powder toward Pepper’s cup!',
            sfx: 'WHOOSH!',
            dialogues: [
              { speaker: 'Pepper', text: 'Carrot! Look out!', side: 'left', bubbleType: 'shout' }
            ]
          },
          {
            scene: 'witch_sparkle_victory',
            caption: 'Instead of ruining the brew, the stray spark freezes into a floating star crystal!',
            sfx: 'CHIME!',
            dialogues: [
              { speaker: 'Judge', text: 'Astonishing! Pure harmony in a teacup!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'pedestal', pos: 'noun', meaningVi: 'bệ trưng bày' },
          { word: 'tournament', pos: 'noun', meaningVi: 'giải đấu, cuộc thi đấu' },
          { word: 'astonishing', pos: 'adj', meaningVi: 'đáng kinh ngạc' }
        ]
      },
      {
        pageNumber: 5,
        layout: '2x2',
        panels: [
          {
            scene: 'witch_sparkle_victory',
            caption: 'The Chief Judge tastes a single drop of Pepper’s turquoise elixir.',
            dialogues: [
              { speaker: 'Chief Judge', text: 'I feel twenty years younger! Even my grumpy mood vanished!', side: 'left' }
            ]
          },
          {
            scene: 'witch_arena_stage',
            sfx: 'CLAP! CLAP!',
            dialogues: [
              { speaker: 'Announcer', text: 'The winner of the Creativity Medal is... Pepper and Carrot!', side: 'center', bubbleType: 'shout' }
            ]
          },
          {
            scene: 'witch_tea_celebrate',
            caption: 'Even Saffron looks surprised, then offers a reluctant smile.',
            dialogues: [
              { speaker: 'Saffron', text: 'Fine... maybe expensive ingredients are not everything. Teach me that mint trick?', side: 'right' }
            ]
          },
          {
            scene: 'witch_lab_brew',
            dialogues: [
              { speaker: 'Pepper', text: 'Anytime! True magic is sharing good ideas together.', side: 'left' }
            ]
          }
        ],
        vocab: [
          { word: 'vanish', pos: 'verb', meaningVi: 'tan biến, biến mất' },
          { word: 'reluctant', pos: 'adj', meaningVi: 'ngần ngại, miễn cưỡng' },
          { word: 'creativity', pos: 'noun', meaningVi: 'sự sáng tạo' }
        ]
      },
      {
        pageNumber: 6,
        layout: 'top-wide',
        panels: [
          {
            scene: 'witch_tea_celebrate',
            caption: 'Back home in Squirrel’s End, Carrot proudly wears his tiny silver ribbon.',
            dialogues: [
              { speaker: 'Pepper', text: 'We did it without spending a single gold coin, buddy!', side: 'left' },
              { speaker: 'Carrot', text: 'Purr-fect! Now can I have two honey cookies?', side: 'right', bubbleType: 'thought' }
            ]
          },
          {
            scene: 'witch_sparkle_victory',
            caption: 'Moral of the story: Curiosity and imagination always shine brighter than gold.',
            dialogues: [
              { speaker: 'Pepper', text: 'Next year, let’s invent a potion that helps garden flowers sing!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'curiosity', pos: 'noun', meaningVi: 'tính tò mò, ham học hỏi' },
          { word: 'imagination', pos: 'noun', meaningVi: 'trí tưởng tượng' }
        ]
      }
    ],
    quiz: {
      question: 'Why did Pepper win the Creativity Medal instead of Saffron?',
      options: [
        'She bought the most expensive dragon scales in the city.',
        'She invented a gentle, uplifting potion from simple herbs and imagination.',
        'She copied Saffron’s golden firework recipe.'
      ],
      correctIndex: 1,
      explanationVi: 'Pepper đã sáng tạo ra lọ thuốc dịu nhẹ từ nguyên liệu đơn giản và trí tưởng tượng thay vì chạy theo đồ đắt tiền!'
    }
  },
  {
    id: 'comic_ada_telescope',
    title: "Ada's Cosmic Telescope",
    subtitle: 'Inspired by Ada’s Adventures in Science (CC-BY)',
    category: 'science',
    categoryLabel: 'Khoa học & Vũ trụ',
    ageLevel: '11–13 tuổi · Lớp 6–7',
    sourceCredit: "Inspired by Ada's Adventures in Science (Edward Gomez & Laura Sorvala, CC-BY)",
    coverImage: coverAdaTelescope,
    accentColor: '#0284C7',
    summaryVi:
      'Cô bé 12 tuổi Ada cùng câu lạc bộ thiên văn kết nối kính viễn vọng từ xa và phát hiện một thiên thể bí ẩn phát sáng gần Sao Mộc!',
    pages: [
      {
        pageNumber: 1,
        layout: 'top-wide',
        panels: [
          {
            scene: 'ada_classroom_chart',
            caption: 'Friday afternoon at Horizon Middle School Astronomy Club.',
            dialogues: [
              { speaker: 'Ada', text: 'Look at this star map! Tonight Jupiter rises right beside the Orion constellation.', side: 'left' },
              { speaker: 'Ben', text: 'Too bad our town is cloudy tonight. We won’t see anything!', side: 'right' }
            ]
          },
          {
            scene: 'ada_data_screen',
            dialogues: [
              { speaker: 'Ada', text: 'Don’t worry! Remember our school has access to the Desert Robotic Telescope online!', side: 'center' }
            ]
          },
          {
            scene: 'ada_observatory_night',
            caption: 'Thousands of kilometers away in the clear Atacama Desert, a silver dome opens.',
            sfx: 'WHIRR...',
            dialogues: [
              { speaker: 'Computer', text: 'Remote link connected. Target locked: Jupiter Sector 4.', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'constellation', pos: 'noun', meaningVi: 'chòm sao' },
          { word: 'observatory', pos: 'noun', meaningVi: 'đài thiên văn' },
          { word: 'remote', pos: 'adj', meaningVi: 'từ xa' }
        ]
      },
      {
        pageNumber: 2,
        layout: '2x2',
        panels: [
          {
            scene: 'ada_telescope_lens',
            caption: 'Ada carefully adjusts the coordinates and camera exposure time.',
            dialogues: [
              { speaker: 'Ada', text: 'Set exposure to 45 seconds so faint stars become crystal clear.', side: 'left' }
            ]
          },
          {
            scene: 'ada_jupiter_comet',
            sfx: 'PING!',
            dialogues: [
              { speaker: 'Ben', text: 'Whoa! Those four tiny dots near Jupiter are its Galilean moons!', side: 'right' },
              { speaker: 'Ada', text: 'Wait... look at the top right corner. What is that fuzzy blue streak?', side: 'left' }
            ]
          },
          {
            scene: 'ada_data_screen',
            caption: 'Ada compares three photos taken ten minutes apart.',
            dialogues: [
              { speaker: 'Ada', text: 'Stars stay still relative to each other, but this object moved across the frame!', side: 'center' }
            ]
          },
          {
            scene: 'ada_classroom_chart',
            dialogues: [
              { speaker: 'Ben', text: 'Wait... did we just spot a comet or a rogue asteroid?!', side: 'right', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'coordinates', pos: 'noun', meaningVi: 'tọa độ' },
          { word: 'faint', pos: 'adj', meaningVi: 'mờ nhạt (ánh sáng yếu)' },
          { word: 'asteroid', pos: 'noun', meaningVi: 'tiểu hành tinh' }
        ]
      },
      {
        pageNumber: 3,
        layout: 'hero-left',
        panels: [
          {
            scene: 'ada_observatory_night',
            caption: 'Real scientists double-check every clue before celebrating.',
            dialogues: [
              { speaker: 'Ada', text: 'First, let’s rule out camera dust or an airplane passing over the observatory.', side: 'left' },
              { speaker: 'Ben', text: 'Good call! An airplane moves in a straight dotted line and leaves fast.', side: 'right' }
            ]
          },
          {
            scene: 'ada_data_screen',
            sfx: 'BEEP!',
            dialogues: [
              { speaker: 'Ada', text: 'I measured its speed and brightness. It has a glowing icy tail pointing away from the Sun!', side: 'center' }
            ]
          },
          {
            scene: 'ada_jupiter_comet',
            dialogues: [
              { speaker: 'Ben', text: 'An icy tail! That means sunlight is heating frozen gas—it IS a comet!', side: 'right' }
            ]
          }
        ],
        vocab: [
          { word: 'double-check', pos: 'verb', meaningVi: 'kiểm tra kỹ lại lần hai' },
          { word: 'clue', pos: 'noun', meaningVi: 'manh mối, dữ kiện' },
          { word: 'comet', pos: 'noun', meaningVi: 'sao chổi' }
        ]
      },
      {
        pageNumber: 4,
        layout: '2x2',
        panels: [
          {
            scene: 'ada_data_screen',
            caption: 'Ada emails their time-stamped images to Dr. Lin at the Planetary Network.',
            dialogues: [
              { speaker: 'Ada', text: 'Sending our report with exact pixel coordinates and timestamps!', side: 'left' }
            ]
          },
          {
            scene: 'ada_observatory_night',
            caption: 'Hours later, observatories in Chile and Hawaii confirm the same moving streak.',
            sfx: 'DING!',
            dialogues: [
              { speaker: 'Dr. Lin', text: 'Brilliant catch, Horizon Club! You tracked Comet C/2026-Horizon!', side: 'center' }
            ]
          },
          {
            scene: 'ada_telescope_lens',
            dialogues: [
              { speaker: 'Ben', text: 'Is it going to crash into Earth?!', side: 'right', bubbleType: 'shout' },
              { speaker: 'Dr. Lin', text: 'No need to panic! Its orbit passes millions of kilometers safely past Mars.', side: 'left' }
            ]
          },
          {
            scene: 'ada_jupiter_comet',
            caption: 'Sunlight turns the comet’s dust trail into a gentle ribbon of emerald light.',
            dialogues: [
              { speaker: 'Ada', text: 'Look how peaceful it looks drifting across the solar system.', side: 'left' }
            ]
          }
        ],
        vocab: [
          { word: 'confirm', pos: 'verb', meaningVi: 'xác nhận' },
          { word: 'orbit', pos: 'noun', meaningVi: 'quỹ đạo quay' },
          { word: 'solar system', pos: 'noun', meaningVi: 'hệ Mặt Trời' }
        ]
      },
      {
        pageNumber: 5,
        layout: 'top-wide',
        panels: [
          {
            scene: 'ada_classroom_chart',
            caption: 'On Monday morning, the whole 6th-grade science class gathers around the projector.',
            dialogues: [
              { speaker: 'Ada', text: 'You don’t need a rocket to explore space—just math, teamwork, and curiosity!', side: 'left' },
              { speaker: 'Classmate', text: 'Can I join the Astronomy Club next week too?', side: 'right' }
            ]
          },
          {
            scene: 'ada_certificate',
            sfx: 'HURRAY!',
            dialogues: [
              { speaker: 'Principal', text: 'Congratulations, Ada and Ben, for your Junior Citizen Astronomer award!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'explore', pos: 'verb', meaningVi: 'khám phá, thám hiểm' },
          { word: 'teamwork', pos: 'noun', meaningVi: 'tinh thần làm việc nhóm' }
        ]
      },
      {
        pageNumber: 6,
        layout: 'top-wide',
        panels: [
          {
            scene: 'ada_observatory_night',
            caption: 'That evening, the clouds finally part above Ada’s hometown.',
            dialogues: [
              { speaker: 'Ada', text: 'Look up, Ben! Somewhere up there, our icy traveler is racing around the Sun.', side: 'left' },
              { speaker: 'Ben', text: 'Next challenge: let’s map craters on the Moon!', side: 'right' }
            ]
          },
          {
            scene: 'ada_certificate',
            caption: 'Science Tip: Astronomers identify moving comets by comparing photos taken minutes apart.',
            dialogues: [
              { speaker: 'Ada', text: 'Keep asking questions and never stop looking up!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'crater', pos: 'noun', meaningVi: 'miệng hố va chạm (trên Mặt Trăng)' },
          { word: 'identify', pos: 'verb', meaningVi: 'nhận diện, xác định' }
        ]
      }
    ],
    quiz: {
      question: 'How did Ada know the fuzzy blue streak in her photo was a moving comet and not a star?',
      options: [
        'It disappeared whenever she closed the window.',
        'It moved across photos taken 10 minutes apart and had an icy tail.',
        'It was larger than Jupiter itself.'
      ],
      correctIndex: 1,
      explanationVi: 'Ada so sánh các bức ảnh chụp cách nhau 10 phút và thấy vệt sáng di chuyển kèm đuôi băng — dấu hiệu đặc trưng của sao chổi!'
    }
  },
  {
    id: 'comic_milo_pip',
    title: 'Milo & Pip: Secret Waves of Sound',
    subtitle: 'Science Mystery · Physics for Young Inventors',
    category: 'science',
    categoryLabel: 'Khoa học & STEM',
    ageLevel: '11–13 tuổi · Lớp 6–7',
    sourceCredit: 'Inspired by Open Science Comics (Milo & Pip Series, CC-BY)',
    coverImage: coverMiloPip,
    accentColor: '#0D9488',
    summaryVi:
      'Những rung động kỳ lạ đánh thức Milo và chú mèo rô-bốt Pip lúc nửa đêm. Cả hai cùng làm thí nghiệm sóng âm để tìm ra bí mật!',
    pages: [
      {
        pageNumber: 1,
        layout: 'top-wide',
        panels: [
          {
            scene: 'milo_treehouse_midnight',
            caption: '11:30 PM inside Milo’s backyard treehouse laboratory.',
            sfx: 'HUMMM...',
            dialogues: [
              { speaker: 'Milo', text: 'Wait, Pip! Do you hear that low humming sound shaking the window glass?', side: 'left' },
              { speaker: 'Pip', text: 'BEEP! My acoustic sensors detect a 110-Hertz vibration!', side: 'right' }
            ]
          },
          {
            scene: 'milo_sound_waves',
            dialogues: [
              { speaker: 'Milo', text: 'Look at the glass of water on my desk—tiny ripples are dancing on the surface!', side: 'left' }
            ]
          },
          {
            scene: 'milo_owl_reveal',
            caption: 'Outside, the oak branches look completely calm. No trucks are driving by.',
            dialogues: [
              { speaker: 'Pip', text: 'Mystery alert! Where is the vibration coming from, Milo?', side: 'right' }
            ]
          }
        ],
        vocab: [
          { word: 'vibration', pos: 'noun', meaningVi: 'sự rung động' },
          { word: 'detect', pos: 'verb', meaningVi: 'phát hiện ra' },
          { word: 'surface', pos: 'noun', meaningVi: 'bề mặt' }
        ]
      },
      {
        pageNumber: 2,
        layout: '2x2',
        panels: [
          {
            scene: 'milo_sound_waves',
            caption: 'Milo switches on her DIY oscilloscope to visualize the invisible waves.',
            dialogues: [
              { speaker: 'Milo', text: 'Remember science class: sound is a wave of vibrating molecules!', side: 'left' }
            ]
          },
          {
            scene: 'milo_wood_knock',
            dialogues: [
              { speaker: 'Milo', text: 'Watch! When I press my ear against the wooden wall, the humming gets MUCH louder!', side: 'left' },
              { speaker: 'Pip', text: 'Fact check: sound travels nearly 10 times faster through solid wood than through air!', side: 'right' }
            ]
          },
          {
            scene: 'milo_water_tank',
            caption: 'Milo tests her waterproof mini-microphone inside the garden fish pond.',
            sfx: 'SPLASH!',
            dialogues: [
              { speaker: 'Pip', text: 'Even underwater, the wave travels fast—almost 1,500 meters per second!', side: 'right' }
            ]
          },
          {
            scene: 'milo_treehouse_midnight',
            dialogues: [
              { speaker: 'Milo', text: 'Aha! Since the oak trunk shakes strongest, the source must be touching this tree!', side: 'center', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'molecule', pos: 'noun', meaningVi: 'phân tử' },
          { word: 'solid', pos: 'noun/adj', meaningVi: 'chất rắn' },
          { word: 'source', pos: 'noun', meaningVi: 'nguồn gốc, nơi phát ra' }
        ]
      },
      {
        pageNumber: 3,
        layout: 'hero-left',
        panels: [
          {
            scene: 'milo_wood_knock',
            caption: 'Armed with a flashlight, Milo and Pip climb higher up the oak branches.',
            dialogues: [
              { speaker: 'Milo', text: 'The wood vibration is stronger near the upper fork. Let’s check gently!', side: 'left' },
              { speaker: 'Pip', text: 'Scanning... Thermal sensors detect two warm feathers ahead!', side: 'right' }
            ]
          },
          {
            scene: 'milo_owl_reveal',
            sfx: 'WHOO-WHOO!',
            dialogues: [
              { speaker: 'Milo', text: 'Oh!! It’s a Barn Owl using the hollow tree trunk as a natural amplifier!', side: 'center' }
            ]
          },
          {
            scene: 'milo_sound_waves',
            dialogues: [
              { speaker: 'Pip', text: 'Just like a wooden acoustic guitar! The hollow trunk boosts his deep hoot!', side: 'right' }
            ]
          }
        ],
        vocab: [
          { word: 'hollow', pos: 'adj', meaningVi: 'rỗng ở bên trong' },
          { word: 'amplifier', pos: 'noun', meaningVi: 'bộ khuếch đại âm thanh' },
          { word: 'boost', pos: 'verb', meaningVi: 'tăng cường, đẩy mạnh' }
        ]
      },
      {
        pageNumber: 4,
        layout: '2x2',
        panels: [
          {
            scene: 'milo_owl_reveal',
            caption: 'The owl tilts its heart-shaped face, curious about Pip’s glowing blue eyes.',
            dialogues: [
              { speaker: 'Milo', text: 'Shh, Pip! We shouldn’t frighten our new neighbor. Let’s measure its pitch quietly.', side: 'left' }
            ]
          },
          {
            scene: 'milo_sound_waves',
            dialogues: [
              { speaker: 'Pip', text: 'Low frequency means fewer waves per second—that creates a deep bass note!', side: 'right' }
            ]
          },
          {
            scene: 'milo_water_tank',
            caption: 'Meanwhile, a tiny tree frog chirps in high-frequency notes near the pond.',
            sfx: 'CHIRP!',
            dialogues: [
              { speaker: 'Milo', text: 'And high frequency creates sharp, squeaky notes! Nature is a full orchestra!', side: 'left' }
            ]
          },
          {
            scene: 'milo_concert',
            dialogues: [
              { speaker: 'Pip', text: 'Can I play a gentle lullaby frequency for them, Milo?', side: 'right' }
            ]
          }
        ],
        vocab: [
          { word: 'frequency', pos: 'noun', meaningVi: 'tần số (số dao động mỗi giây)' },
          { word: 'pitch', pos: 'noun', meaningVi: 'cao độ của âm thanh' },
          { word: 'orchestra', pos: 'noun', meaningVi: 'dàn nhạc giao hưởng' }
        ]
      },
      {
        pageNumber: 5,
        layout: 'top-wide',
        panels: [
          {
            scene: 'milo_concert',
            caption: 'The next day at the School Science Fair, Milo presents her acoustic discovery.',
            dialogues: [
              { speaker: 'Milo', text: 'Sound waves need a medium—like air, water, or wood—to travel! In outer space, there is no air, so space is silent.', side: 'left' },
              { speaker: 'Teacher', text: 'Super clear explanation, Milo! Your tree-trunk guitar model is fantastic.', side: 'right' }
            ]
          },
          {
            scene: 'milo_sound_waves',
            sfx: 'APPLAUSE!',
            dialogues: [
              { speaker: 'Pip', text: 'Meow-beep! First prize ribbon unlocked!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'medium', pos: 'noun', meaningVi: 'môi trường truyền (sóng/âm)' },
          { word: 'silent', pos: 'adj', meaningVi: 'im lặng, không có tiếng động' }
        ]
      },
      {
        pageNumber: 6,
        layout: 'top-wide',
        panels: [
          {
            scene: 'milo_treehouse_midnight',
            caption: 'Back in the treehouse, Milo places soft felt pads under her desk instruments.',
            dialogues: [
              { speaker: 'Milo', text: 'Now our owl friend can sing peacefully without rattling my water glasses!', side: 'left' },
              { speaker: 'Pip', text: 'Purring at 25 Hertz... Goodnight, scientist Milo!', side: 'right' }
            ]
          },
          {
            scene: 'milo_owl_reveal',
            caption: 'Physics Tip: Sound travels fastest in solids, slower in liquids, and slowest in gases.',
            dialogues: [
              { speaker: 'Milo', text: 'Listen closely—every sound tells a hidden story!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'instrument', pos: 'noun', meaningVi: 'dụng cụ / nhạc cụ' },
          { word: 'rattle', pos: 'verb', meaningVi: 'làm rung lắc lạch cạch' }
        ]
      }
    ],
    quiz: {
      question: 'Why did Milo hear the owl’s low hoot much louder when she put her ear against the wooden treehouse wall?',
      options: [
        'Because sound waves travel faster and stronger through solid wood than through air.',
        'Because the owl was hiding inside Milo’s water glass.',
        'Because sound waves cannot travel through air at night.'
      ],
      correctIndex: 0,
      explanationVi: 'Âm thanh truyền qua chất rắn (gỗ) nhanh và rõ hơn nhiều so với truyền qua không khí!'
    }
  },
  {
    id: 'comic_midnight_code',
    title: 'The Midnight Code Mystery',
    subtitle: 'B2KS Graphic Novel · Logic & Coding',
    category: 'mystery',
    categoryLabel: 'Bí ẩn & Công nghệ',
    ageLevel: '11–13 tuổi · Lớp 6–7',
    sourceCredit: 'B2KS Original Middle-Grade Graphic Novel',
    coverImage: coverMidnightCode,
    accentColor: '#4F46E5',
    summaryVi:
      'Hai bạn học sinh lớp 6 phát hiện chiếc drone sắp xếp sách tự động của thư viện phát tín hiệu mã nhị phân kỳ lạ lúc chạng vạng!',
    pages: [
      {
        pageNumber: 1,
        layout: 'top-wide',
        panels: [
          {
            scene: 'code_library_dusk',
            caption: '5:45 PM. Staying late to finish their history poster, Linh and Sam hear a soft buzz.',
            sfx: 'BZZZT...',
            dialogues: [
              { speaker: 'Linh', text: 'Hey Sam, why is Dewey—the library helper drone—still awake after closing prep?', side: 'left' },
              { speaker: 'Sam', text: 'Look! Its LED is blinking in groups of eight flashes!', side: 'right' }
            ]
          },
          {
            scene: 'code_drone_hover',
            dialogues: [
              { speaker: 'Dewey Drone', text: '01001000 ... 01000101 ... 01001100 ... 01010000!', side: 'center' }
            ]
          },
          {
            scene: 'code_tablet_binary',
            dialogues: [
              { speaker: 'Linh', text: 'Wait a minute! Eight bits per letter... That is ASCII binary code!', side: 'left', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'binary', pos: 'noun/adj', meaningVi: 'hệ nhị phân (0 và 1)' },
          { word: 'signal', pos: 'noun', meaningVi: 'tín hiệu' },
          { word: 'decode', pos: 'verb', meaningVi: 'giải mã' }
        ]
      },
      {
        pageNumber: 2,
        layout: '2x2',
        panels: [
          {
            scene: 'code_tablet_binary',
            caption: 'Sam opens his coding notebook to translate the 8-bit pulses.',
            dialogues: [
              { speaker: 'Sam', text: '01001000 is 72—letter H! Then E, L, P... It’s spelling HELP!', side: 'left' }
            ]
          },
          {
            scene: 'code_drone_hover',
            dialogues: [
              { speaker: 'Linh', text: 'Dewey isn’t broken! Someone programmed it to guide us somewhere!', side: 'right' }
            ]
          },
          {
            scene: 'code_library_dusk',
            caption: 'The little drone glides quietly down Aisle 42—the Old Geography & Maps section.',
            sfx: 'WHOOSH!',
            dialogues: [
              { speaker: 'Sam', text: 'Follow that light! Let’s see which shelf it stops beside.', side: 'left' }
            ]
          },
          {
            scene: 'code_hidden_shelf',
            dialogues: [
              { speaker: 'Linh', text: 'It’s pointing behind the 1996 School Yearbook! Look—a dusty brass latch!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'translate', pos: 'verb', meaningVi: 'dịch, chuyển đổi ngôn ngữ/mã' },
          { word: 'aisle', pos: 'noun', meaningVi: 'lối đi giữa các giá sách' },
          { word: 'latch', pos: 'noun', meaningVi: 'chốt cửa nhỏ' }
        ]
      },
      {
        pageNumber: 3,
        layout: 'hero-left',
        panels: [
          {
            scene: 'code_hidden_shelf',
            caption: 'Ms. Hoa, the head librarian, arrives with a curious smile when Linh calls her.',
            dialogues: [
              { speaker: 'Ms. Hoa', text: 'Hold on—our school founders wrote about a hidden niche here thirty years ago!', side: 'left' },
              { speaker: 'Sam', text: 'There is a keypad lock: "Enter the year our town library opened in binary."', side: 'right' }
            ]
          },
          {
            scene: 'code_tablet_binary',
            dialogues: [
              { speaker: 'Linh', text: '1996! Wait—let’s divide by 2 step-by-step on my tablet... Got it!', side: 'left' }
            ]
          },
          {
            scene: 'code_time_capsule',
            sfx: 'CLICK!',
            dialogues: [
              { speaker: 'Sam', text: 'The panel slid open! Look at that silver time capsule!', side: 'center', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'founder', pos: 'noun', meaningVi: 'người sáng lập' },
          { word: 'time capsule', pos: 'noun', meaningVi: 'hộp lưu giữ kỷ vật vượt thời gian' },
          { word: 'divide', pos: 'verb', meaningVi: 'chia (phép chia)' }
        ]
      },
      {
        pageNumber: 4,
        layout: '2x2',
        panels: [
          {
            scene: 'code_time_capsule',
            caption: 'Inside lies a hand-drawn comic strip from 1996, a floppy disk, and a letter.',
            dialogues: [
              { speaker: 'Ms. Hoa', text: 'Read the letter aloud, Linh!', side: 'left' }
            ]
          },
          {
            scene: 'code_library_dusk',
            dialogues: [
              { speaker: 'Linh', text: '"To future students of 2026: Remember that technology changes fast, but stories connect every generation."', side: 'center' }
            ]
          },
          {
            scene: 'code_drone_hover',
            caption: 'Dewey’s screen flashes a cheerful green smiley face.',
            sfx: 'CHIME!',
            dialogues: [
              { speaker: 'Sam', text: 'Wait—how did Dewey know the message was inside the shelf?', side: 'right' }
            ]
          },
          {
            scene: 'code_hidden_shelf',
            dialogues: [
              { speaker: 'Ms. Hoa', text: 'Aha! Last week’s Robotics Club teacher uploaded an NFC tag inside the capsule as a treasure hunt!', side: 'left' }
            ]
          }
        ],
        vocab: [
          { word: 'generation', pos: 'noun', meaningVi: 'thế hệ' },
          { word: 'upload', pos: 'verb', meaningVi: 'tải lên, nạp dữ liệu vào' },
          { word: 'treasure hunt', pos: 'noun', meaningVi: 'trò chơi săn tìm kho báu' }
        ]
      },
      {
        pageNumber: 5,
        layout: 'top-wide',
        panels: [
          {
            scene: 'code_club_badge',
            caption: 'The next morning, the 1996 comic strip is framed in the library entrance display.',
            dialogues: [
              { speaker: 'Sam', text: 'Look! Students from thirty years ago drew the exact same dream of flying book helpers!', side: 'left' },
              { speaker: 'Linh', text: 'And now Dewey actually exists!', side: 'right' }
            ]
          },
          {
            scene: 'code_drone_hover',
            sfx: 'DING!',
            dialogues: [
              { speaker: 'Ms. Hoa', text: 'Thank you, Junior Code Detectives! We added your story into the new 2026 Time Capsule.', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'detective', pos: 'noun', meaningVi: 'thám tử' },
          { word: 'entrance', pos: 'noun', meaningVi: 'lối vào, sảnh chính' }
        ]
      },
      {
        pageNumber: 6,
        layout: 'top-wide',
        panels: [
          {
            scene: 'code_club_badge',
            caption: 'Both Sam and Linh earn the Golden Binary Decoder badge.',
            dialogues: [
              { speaker: 'Linh', text: 'What should we put inside the 2026 capsule for kids in 2056?', side: 'left' },
              { speaker: 'Sam', text: 'Our favorite English comic book and a USB drive with our own game!', side: 'right' }
            ]
          },
          {
            scene: 'code_tablet_binary',
            caption: 'Fun Fact: Computers store every letter, photo, and video using only 0s and 1s!',
            dialogues: [
              { speaker: 'Dewey Drone', text: '01001111 01001011 = OK! See you at the library!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'decoder', pos: 'noun', meaningVi: 'người/bộ giải mã' },
          { word: 'store', pos: 'verb', meaningVi: 'lưu trữ' }
        ]
      }
    ],
    quiz: {
      question: 'What did the blinking light pattern "01001000 01000101 01001100 01010000" from the drone spell out?',
      options: ['BOOK', 'HELP', 'CODE'],
      correctIndex: 1,
      explanationVi: 'Linh và Sam đã giải mã dãy nhị phân ASCII 8-bit đó thành chữ HELP để tìm ra hộp lưu giữ kỷ vật!'
    }
  },
  {
    id: 'comic_emerald_bay',
    title: 'Guardians of Emerald Bay',
    subtitle: 'Eco Adventure · Ha Long Bay Marine Science',
    category: 'fantasy',
    categoryLabel: 'Phiêu lưu & Thiên nhiên',
    ageLevel: '11–13 tuổi · Lớp 6–7',
    sourceCredit: 'B2KS Bilingual Eco-Adventure Graphic Novel',
    coverImage: coverEmeraldBay,
    accentColor: '#059669',
    summaryVi:
      'Trong chuyến trại hè sinh thái tại Vịnh Hạ Long, hai anh em họ Maya và Leo phát hiện rạn san hô phát sáng và giải cứu chú rùa biển bị mắc lưới!',
    pages: [
      {
        pageNumber: 1,
        layout: 'top-wide',
        panels: [
          {
            scene: 'bay_boat_sunset',
            caption: 'Golden hour at Emerald Bay Marine Camp. Cousins Maya and Leo patrol aboard Eco-Explorer 2.',
            dialogues: [
              { speaker: 'Maya', text: 'Look at those limestone cliffs glowing in the sunset! Everything is so calm.', side: 'left' },
              { speaker: 'Leo', text: 'Wait—check the clear water near the cave! Why is the reef flickering cyan?', side: 'right' }
            ]
          },
          {
            scene: 'bay_coral_glow',
            sfx: 'GLOW...',
            dialogues: [
              { speaker: 'Maya', text: 'Bio-luminescent plankton! When water moves swiftly around the reef, tiny organisms sparkle like stars!', side: 'left' }
            ]
          },
          {
            scene: 'bay_ghost_net',
            caption: 'Suddenly, their flashlight beam catches something tangled beneath the sparkling waves.',
            dialogues: [
              { speaker: 'Leo', text: 'Oh no! Look down there—an abandoned fishing net is wrapped around the coral!', side: 'right', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'limestone', pos: 'noun', meaningVi: 'đá vôi' },
          { word: 'plankton', pos: 'noun', meaningVi: 'sinh vật phù du' },
          { word: 'tangled', pos: 'adj', meaningVi: 'bị mắc kẹt, rối vào nhau' }
        ]
      },
      {
        pageNumber: 2,
        layout: '2x2',
        panels: [
          {
            scene: 'bay_ghost_net',
            caption: 'Worst of all, a young green sea turtle is struggling gently under the plastic ropes.',
            dialogues: [
              { speaker: 'Maya', text: 'It’s a "ghost net"! If we don’t call the rangers, the turtle cannot surface for air!', side: 'left' }
            ]
          },
          {
            scene: 'bay_ranger_radio',
            sfx: 'KSSSH!',
            dialogues: [
              { speaker: 'Leo', text: 'Ranger Tuan, this is Eco-Explorer 2! We spotted a trapped sea turtle at Dragon Cave Cove!', side: 'center', bubbleType: 'shout' }
            ]
          },
          {
            scene: 'bay_boat_sunset',
            dialogues: [
              { speaker: 'Ranger Tuan', text: 'Copy that, kids! Keep your solar lantern steady—our dive rescue boat is three minutes away!', side: 'right' }
            ]
          },
          {
            scene: 'bay_coral_glow',
            dialogues: [
              { speaker: 'Maya', text: 'Hang in there, little turtle! Help is racing across the bay right now.', side: 'left' }
            ]
          }
        ],
        vocab: [
          { word: 'abandoned', pos: 'adj', meaningVi: 'bị bỏ rơi, vứt lại' },
          { word: 'surface', pos: 'verb', meaningVi: 'trồi lên mặt nước' },
          { word: 'trapped', pos: 'adj', meaningVi: 'bị mắc bẫy, kẹt lại' }
        ]
      },
      {
        pageNumber: 3,
        layout: 'hero-left',
        panels: [
          {
            scene: 'bay_ranger_radio',
            caption: 'Ranger Tuan arrives swiftly and equips underwater safety shears.',
            sfx: 'SPLASH!',
            dialogues: [
              { speaker: 'Ranger Tuan', text: 'Great job spotting the GPS coordinates and not jumping into the dark reef alone!', side: 'right' },
              { speaker: 'Leo', text: 'Safety first! Now let’s shine the spotlight to help you see clearly.', side: 'left' }
            ]
          },
          {
            scene: 'bay_ghost_net',
            sfx: 'SNIP!',
            dialogues: [
              { speaker: 'Ranger Tuan', text: 'Almost free... Cutting the last nylon knot away from the coral branches.', side: 'center' }
            ]
          },
          {
            scene: 'bay_turtle_free',
            caption: 'With one joyful flap of her flippers, the green turtle glides safely back into deep water!',
            dialogues: [
              { speaker: 'Maya', text: 'Look! She popped up to take a big breath and waved her flipper!', side: 'left', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'swiftly', pos: 'adv', meaningVi: 'nhanh chóng' },
          { word: 'equip', pos: 'verb', meaningVi: 'trang bị' },
          { word: 'glide', pos: 'verb', meaningVi: 'lướt đi nhẹ nhàng' }
        ]
      },
      {
        pageNumber: 4,
        layout: '2x2',
        panels: [
          {
            scene: 'bay_boat_sunset',
            caption: 'They haul the heavy tangled ghost net aboard to recycle it properly on shore.',
            dialogues: [
              { speaker: 'Leo', text: 'Phew! This net weighs almost 15 kilograms!', side: 'right' }
            ]
          },
          {
            scene: 'bay_coral_glow',
            dialogues: [
              { speaker: 'Ranger Tuan', text: 'Did you know ghost nets keep trapping fish for decades unless someone removes them?', side: 'left' }
            ]
          },
          {
            scene: 'bay_turtle_free',
            dialogues: [
              { speaker: 'Maya', text: 'And healthy coral reefs protect our coastlines from big ocean storms too!', side: 'left' }
            ]
          },
          {
            scene: 'bay_sunrise_pledge',
            dialogues: [
              { speaker: 'Leo', text: 'Can we organize a weekend beach cleanup with our classmates next month?', side: 'right' }
            ]
          }
        ],
        vocab: [
          { word: 'recycle', pos: 'verb', meaningVi: 'tái chế' },
          { word: 'decade', pos: 'noun', meaningVi: 'thập kỷ (10 năm)' },
          { word: 'coastline', pos: 'noun', meaningVi: 'đường bờ biển' }
        ]
      },
      {
        pageNumber: 5,
        layout: 'top-wide',
        panels: [
          {
            scene: 'bay_sunrise_pledge',
            caption: 'At sunrise, the marine camp awards Maya and Leo the Junior Bay Guardian pin.',
            dialogues: [
              { speaker: 'Ranger Tuan', text: 'Old fishing nets shouldn’t stay in the ocean—next week we turn them into recycled backpacks!', side: 'left' },
              { speaker: 'Maya', text: 'That is awesome! From ocean trash to school treasure!', side: 'right' }
            ]
          },
          {
            scene: 'bay_turtle_free',
            sfx: 'CHEERS!',
            dialogues: [
              { speaker: 'Campers', text: 'Protect the reef, keep the bay clean!', side: 'center', bubbleType: 'shout' }
            ]
          }
        ],
        vocab: [
          { word: 'guardian', pos: 'noun', meaningVi: 'người bảo vệ, người canh giữ' },
          { word: 'treasure', pos: 'noun', meaningVi: 'kho báu, vật quý' }
        ]
      },
      {
        pageNumber: 6,
        layout: 'top-wide',
        panels: [
          {
            scene: 'bay_boat_sunset',
            caption: 'Every small action helps keep oceans bright for future explorers.',
            dialogues: [
              { speaker: 'Maya', text: 'Remember: never leave plastic behind when visiting beaches or rivers!', side: 'left' },
              { speaker: 'Leo', text: 'See you next adventure, little sea turtle!', side: 'right' }
            ]
          },
          {
            scene: 'bay_sunrise_pledge',
            caption: 'Eco Tip: Reporting hazards safely to adults or rangers is always the smartest rescue plan.',
            dialogues: [
              { speaker: 'Maya & Leo', text: 'Be smart, stay safe, and care for our blue planet!', side: 'center' }
            ]
          }
        ],
        vocab: [
          { word: 'hazard', pos: 'noun', meaningVi: 'mối nguy hiểm' },
          { word: 'planet', pos: 'noun', meaningVi: 'hành tinh' }
        ]
      }
    ],
    quiz: {
      question: 'What is the smartest thing Maya and Leo did when they discovered the trapped sea turtle?',
      options: [
        'They radioed Ranger Tuan with exact coordinates and shined a spotlight from the boat.',
        'They threw more plastic bottles into the water to mark the spot.',
        'They ignored the net and sailed back to sleep.'
      ],
      correctIndex: 0,
      explanationVi: 'Maya và Leo đã báo vị trí chính xác cho kiểm lâm biển qua bộ đàm và chiếu đèn hỗ trợ an toàn từ trên thuyền!'
    }
  }
];
