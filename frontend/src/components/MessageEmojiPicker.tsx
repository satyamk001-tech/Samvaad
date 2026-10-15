import React, { useState, useMemo } from 'react';
import { Smile, X, Search, Sparkles } from 'lucide-react';

interface MessageEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: { char: string; name: string }[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'स्माइली (Smileys)',
    icon: '😀',
    emojis: [
      { char: '😀', name: 'grinning face happy smile' },
      { char: '😃', name: 'smiling face big eyes' },
      { char: '😄', name: 'grinning face with smiling eyes' },
      { char: '😁', name: 'beaming face with smiling eyes' },
      { char: '😆', name: 'grinning squinting face laughing' },
      { char: '😅', name: 'grinning face with sweat phew' },
      { char: '🤣', name: 'rolling on the floor laughing rofl' },
      { char: '😂', name: 'face with tears of joy lol haha' },
      { char: '🙂', name: 'slightly smiling face' },
      { char: '🙃', name: 'upside down face sarcasm' },
      { char: '😉', name: 'winking face wink' },
      { char: '😊', name: 'smiling face with smiling eyes blush' },
      { char: '😇', name: 'smiling face with halo angel innocent' },
      { char: '🥰', name: 'smiling face with hearts love adore' },
      { char: '😍', name: 'smiling face with heart eyes love heart' },
      { char: '🤩', name: 'star struck wow amazing' },
      { char: '😘', name: 'face blowing a kiss kiss love' },
      { char: '😋', name: 'face savoring food delicious yum' },
      { char: '😛', name: 'face with tongue playful' },
      { char: '😜', name: 'winking face with tongue crazy joke' },
      { char: '🤪', name: 'zany face goofy funny' },
      { char: '😝', name: 'squinting face with tongue playful' },
      { char: '🤑', name: 'money mouth face rich cash' },
      { char: '🤗', name: 'smiling face with open hands hug' },
      { char: '🤭', name: 'face with hand over mouth oops giggle' },
      { char: '🤫', name: 'shushing face quiet secret silence' },
      { char: '🤔', name: 'thinking face hmm think ponder' },
      { char: '🤐', name: 'zipper mouth face quiet secret' },
      { char: '🤨', name: 'face with raised eyebrow suspicious skeptic' },
      { char: '😐', name: 'neutral face straight poker' },
      { char: '😑', name: 'expressionless face blank' },
      { char: '😶', name: 'face without mouth speechless' },
      { char: '😏', name: 'smirking face smirk sly' },
      { char: '😒', name: 'unamused face meh bored' },
      { char: '🙄', name: 'face with rolling eyes eye roll whatever' },
      { char: '😬', name: 'grimacing face awkward oops' },
      { char: '🤥', name: 'lying face pinocchio lie' },
      { char: '😌', name: 'relieved face calm peace' },
      { char: '😔', name: 'pensive face sad sorrow' },
      { char: '😪', name: 'sleepy face tired' },
      { char: '🤤', name: 'drooling face drool crave' },
      { char: '😴', name: 'sleeping face sleep zzz' },
      { char: '😷', name: 'face with medical mask sick covid' },
      { char: '🤒', name: 'face with thermometer fever sick' },
      { char: '🤕', name: 'face with head bandage hurt injured' },
      { char: '🤢', name: 'nauseated face sick gross' },
      { char: '🤮', name: 'face vomiting barf puke' },
      { char: '🤧', name: 'sneezing face sneeze tissue' },
      { char: '🥵', name: 'hot face sweating hot summer' },
      { char: '🥶', name: 'cold face freezing ice winter' },
      { char: '🥴', name: 'woozy face dizzy tipsy' },
      { char: '😵', name: 'knocked out face dizzy dead' },
      { char: '🤯', name: 'exploding head mind blown shock' },
      { char: '🤠', name: 'cowboy hat face cowboy' },
      { char: '🥳', name: 'partying face party celebration hat' },
      { char: '🥸', name: 'disguised face spy glasses mustache' },
      { char: '😎', name: 'smiling face with sunglasses cool boss' },
      { char: '🤓', name: 'nerd face smart geek book' },
      { char: '🧐', name: 'face with monocle classy inspect' },
      { char: '😕', name: 'confused face what huh' },
      { char: '😟', name: 'worried face worry anxious' },
      { char: '🙁', name: 'slightly frowning face frown sad' },
      { char: '😮', name: 'face with open mouth surprised wow' },
      { char: '😯', name: 'hushed face surprised gasping' },
      { char: '😲', name: 'astonished face shock stunned' },
      { char: '😳', name: 'flushed face embarrassed shocked' },
      { char: '🥺', name: 'pleading face please puppy eyes beg' },
      { char: '😦', name: 'frowning face with open mouth sad' },
      { char: '😧', name: 'anguished face painful agony' },
      { char: '😨', name: 'fearful face scared afraid' },
      { char: '😰', name: 'anxious face with sweat nervous' },
      { char: '😥', name: 'sad but relieved face phew' },
      { char: '😢', name: 'crying face tear sad cry' },
      { char: '😭', name: 'loudly crying face bawling sob tears' },
      { char: '😱', name: 'face screaming in fear scream terror' },
      { char: '😖', name: 'confounded face upset' },
      { char: '😣', name: 'persevering face struggling' },
      { char: '😞', name: 'disappointed face sad regret' },
      { char: '😓', name: 'downcast face with sweat stress' },
      { char: '😩', name: 'weary face tired exasperated' },
      { char: '😫', name: 'tired face exhausted sleepy' },
      { char: '🥱', name: 'yawning face yawn bored tired' },
      { char: '😤', name: 'face with steam from nose proud angry victory' },
      { char: '😡', name: 'enraged face mad angry fury' },
      { char: '😠', name: 'angry face mad upset' },
      { char: '🤬', name: 'face with symbols on mouth curse swear swearword' },
    ],
  },
  {
    id: 'gestures',
    label: 'हाथ व भाव (Gestures)',
    icon: '👋',
    emojis: [
      { char: '👋', name: 'waving hand wave hello goodbye hi' },
      { char: '🤚', name: 'raised back of hand stop' },
      { char: '🖐️', name: 'hand with fingers splayed five high five' },
      { char: '✋', name: 'raised hand stop high five palm' },
      { char: '🖖', name: 'vulcan salute spock star trek' },
      { char: '👌', name: 'ok hand fine perfect good' },
      { char: '🤌', name: 'pinched fingers italian what' },
      { char: '🤏', name: 'pinching hand little small bit' },
      { char: '✌️', name: 'victory hand peace two v' },
      { char: '🤞', name: 'crossed fingers good luck hope' },
      { char: '🫰', name: 'hand with index finger and thumb crossed finger heart love money' },
      { char: '🤟', name: 'love you gesture sign love' },
      { char: '🤘', name: 'sign of the horns rock on metal' },
      { char: '🤙', name: 'call me hand phone shaka' },
      { char: '👈', name: 'backhand index pointing left' },
      { char: '👉', name: 'backhand index pointing right' },
      { char: '👆', name: 'backhand index pointing up' },
      { char: '👇', name: 'backhand index pointing down' },
      { char: '☝️', name: 'index pointing up one listen' },
      { char: '👍', name: 'thumbs up good like yes approve' },
      { char: '👎', name: 'thumbs down bad dislike no' },
      { char: '✊', name: 'raised fist power strength solid' },
      { char: '👊', name: 'oncoming fist punch bump brofist' },
      { char: '🤛', name: 'left facing fist fist bump' },
      { char: '🤜', name: 'right facing fist fist bump' },
      { char: '👏', name: 'clapping hands clap bravo applaud' },
      { char: '🙌', name: 'raising hands praise celebrate hooray' },
      { char: '👐', name: 'open hands open embrace' },
      { char: '🤲', name: 'palms up together dua prayer offer' },
      { char: '🤝', name: 'handshake deal agree partner hello' },
      { char: '🙏', name: 'folded hands pray please namaste thanks namaskar dhanyawad' },
      { char: '✍️', name: 'writing hand write sign pencil' },
      { char: '💅', name: 'nail polish care beauty fabulous' },
      { char: '🤳', name: 'selfie camera photo' },
      { char: '💪', name: 'flexed biceps muscle strong gym flex' },
    ],
  },
  {
    id: 'hearts',
    label: 'हृदय व प्रतीक (Hearts)',
    icon: '❤️',
    emojis: [
      { char: '❤️', name: 'red heart love passion sweet' },
      { char: '🧡', name: 'orange heart warmth friendship' },
      { char: '💛', name: 'yellow heart sunshine loyalty' },
      { char: '💚', name: 'green heart nature life health' },
      { char: '💙', name: 'blue heart trust peace cold' },
      { char: '💜', name: 'purple heart royalty magic lavender' },
      { char: '🖤', name: 'black heart dark gothic sorrow' },
      { char: '🤍', name: 'white heart pure angel peace' },
      { char: '🤎', name: 'brown heart chocolate earth' },
      { char: '💔', name: 'broken heart heartbreak breakup hurt' },
      { char: '❣️', name: 'heart exclamation love point emphasis' },
      { char: '💕', name: 'two hearts love floating' },
      { char: '💞', name: 'revolving hearts revolving love' },
      { char: '💓', name: 'beating heart pulse heartbeat alive' },
      { char: '💗', name: 'growing heart expanding excitement' },
      { char: '💖', name: 'sparkling heart sparkle shine pretty' },
      { char: '💘', name: 'heart with arrow cupid love strike' },
      { char: '💝', name: 'heart with ribbon gift present love' },
      { char: '💟', name: 'heart decoration purple card' },
      { char: '🔥', name: 'fire lit hot flame passion' },
      { char: '✨', name: 'sparkles stars magic sparkle shine bright' },
      { char: '💯', name: 'hundred points score perfect 100 exam' },
      { char: '⭐', name: 'star gold favorite bookmark' },
      { char: '🌟', name: 'glowing star bright shining' },
    ],
  },
  {
    id: 'indic',
    label: 'भारतीय व उत्सव (Celebration)',
    icon: '🪔',
    emojis: [
      { char: '🪔', name: 'diya oil lamp diwali light festival puja deepak deepawali' },
      { char: '🇮🇳', name: 'flag india tricolor bharat tiranga vande mataram' },
      { char: '🕉️', name: 'om omkara hindu sacred symbol sanskrit aum' },
      { char: '🪷', name: 'lotus flower kamal sacred beauty purity' },
      { char: '🚩', name: 'triangular flag saffron dhwaja mandir temple flag' },
      { char: '🧘', name: 'person in lotus position yoga dhyan meditation' },
      { char: '🎆', name: 'fireworks celebration diwali festival new year' },
      { char: '🎇', name: 'sparkler celebration joy' },
      { char: '✨', name: 'sparkles magic shubh labh' },
      { char: '🎉', name: 'party popper tada celebration congrats badhai' },
      { char: '🎊', name: 'confetti ball festival party' },
      { char: '🎁', name: 'wrapped gift present bhent' },
      { char: '🏆', name: 'trophy winner champion vijayi' },
      { char: '🥇', name: '1st place medal gold first' },
      { char: '🏏', name: 'cricket bat ball match ipl bcci test odi' },
      { char: '🏑', name: 'field hockey national sport india' },
      { char: '🫖', name: 'teapot chai tea kadak tapri' },
      { char: '🍛', name: 'curry rice dal tadka food thali' },
      { char: '🥭', name: 'mango aam king of fruits summer' },
      { char: '🐘', name: 'elephant haathi gajraj royal' },
      { char: '🦚', name: 'peacock mor national bird beauty' },
      { char: '🐅', name: 'tiger baagh national animal royal bengal' },
    ],
  },
  {
    id: 'food',
    label: 'खान-पान (Food)',
    icon: '☕',
    emojis: [
      { char: '☕', name: 'hot beverage coffee tea espresso chai' },
      { char: '🍵', name: 'teacup without handle green tea matcha' },
      { char: '🧃', name: 'beverage box juice box carton' },
      { char: '🥤', name: 'cup with straw soda soft drink shake' },
      { char: '🥛', name: 'glass of milk doodh' },
      { char: '🍎', name: 'red apple fruit healthy seb' },
      { char: '🍌', name: 'banana kela fruit potassium' },
      { char: '🍉', name: 'watermelon tarbooz summer fruit' },
      { char: '🍇', name: 'grapes angoor wine' },
      { char: '🍓', name: 'strawberry berries sweet' },
      { char: '🍕', name: 'pizza slice cheesy Italian fast food' },
      { char: '🍔', name: 'hamburger burger fast food' },
      { char: '🍟', name: 'french fries chips fast food' },
      { char: '🥪', name: 'sandwich lunch bread' },
      { char: '🍿', name: 'popcorn movie snack theatre' },
      { char: '🍫', name: 'chocolate bar sweet cadbury dairy milk' },
      { char: '🍬', name: 'candy toffee sweet' },
      { char: '🎂', name: 'birthday cake celebration happy birthday' },
      { char: '🍰', name: 'shortcake pastry sweet dessert' },
      { char: '🍨', name: 'ice cream sweet cold dessert' },
    ],
  },
];

export const MessageEmojiPicker: React.FC<MessageEmojiPickerProps> = ({ onEmojiSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      const activeCat = EMOJI_CATEGORIES.find((c) => c.id === activeTab);
      return activeCat ? activeCat.emojis : [];
    }
    // Search across all categories
    const results: { char: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (item.name.toLowerCase().includes(q) && !seen.has(item.char)) {
          seen.add(item.char);
          results.push(item);
        }
      }
    }
    return results;
  }, [searchQuery, activeTab]);

  const handleSelect = (emojiChar: string) => {
    onEmojiSelect(emojiChar);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
          isOpen
            ? 'bg-[#191C3B] text-white border-[#191C3B]'
            : 'bg-[#FAF7F2] text-[#686578] border-[#E8E2D5] hover:text-[#191C3B] hover:border-[#C59A58]'
        }`}
        title="इमोजी चुनें • Emoji Picker"
      >
        <Smile className="w-4 h-4 text-[#C59A58]" />
      </button>

      {isOpen && (
        <div className="absolute bottom-12 left-0 z-50 w-80 sm:w-88 bg-white border border-[#E8E2D5] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="p-2.5 border-b border-[#E8E2D5] bg-[#FAF7F2] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C59A58]" />
              <span className="text-xs font-bold text-[#191C3B]">इमोजी संग्रह • Emojis</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#686578] hover:text-[#191C3B] hover:bg-[#E8E2D5]/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2 border-b border-[#E8E2D5] bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#686578] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="इमोजी खोजें (Search happy, heart, pray, tea)..."
                className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                autoFocus
              />
            </div>
          </div>

          {/* Category Tabs */}
          {!searchQuery && (
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#E8E2D5] bg-[#FAF7F2]/60 gap-1 overflow-x-auto">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-2 py-1 rounded-lg text-sm flex items-center gap-1 transition-all ${
                    activeTab === cat.id
                      ? 'bg-white shadow-xs border border-[#E8E2D5] scale-105'
                      : 'opacity-70 hover:opacity-100 hover:bg-white/60'
                  }`}
                  title={cat.label}
                >
                  <span>{cat.icon}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji Grid */}
          <div className="p-2.5 max-h-60 overflow-y-auto grid grid-cols-7 gap-1.5 select-none bg-white">
            {filteredEmojis.length === 0 ? (
              <div className="col-span-7 py-8 text-center text-xs text-[#686578]">
                कोई इमोजी नहीं मिला • No emojis found
              </div>
            ) : (
              filteredEmojis.map((item, idx) => (
                <button
                  key={`${item.char}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item.char)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-[#FAF7F2] hover:scale-125 active:scale-95 transition-transform"
                  title={item.name}
                >
                  {item.char}
                </button>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-1.5 bg-[#FAF7F2] border-t border-[#E8E2D5] text-[10px] text-center text-[#686578] font-medium flex items-center justify-between px-3">
            <span>क्लिक करें और जोड़ें • Click to insert</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#C59A58] font-bold hover:underline"
            >
              पूर्ण (Done)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
