import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Music, 
  Heart, 
  Flame, 
  Moon, 
  Coffee, 
  Ghost,
  Plus,
  Loader2,
  AlertCircle,
  LogIn,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  doc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { sampleSongs } from './sampleSongs';

// Types
interface Song {
  id?: string;
  title: string;
  artist: string;
  lyricsSnippet: string;
  mood: string[];
  tags: string[];
  isUnreleased: boolean;
  createdAt?: any;
}

const MOODS = [
  { id: 'sad', label: 'Sad', icon: Ghost, color: 'text-blue-400' },
  { id: 'heartbreak', label: 'Heartbreak', icon: Heart, color: 'text-red-400' },
  { id: 'chill', label: 'Chill', icon: Coffee, color: 'text-emerald-400' },
  { id: 'hype', label: 'Hype', icon: Flame, color: 'text-orange-400' },
  { id: 'late night', label: 'Late Night', icon: Moon, color: 'text-purple-400' },
];

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Auth & Connection Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (err: any) {
        if (err.message?.includes('the client is offline')) {
          setError("Firebase connection error. Please check your configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'songs'), orderBy('title', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const songsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Song[];
      setSongs(songsData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      // Don't show error for read if it's just empty, but show if it's a permission issue
      if (err.code !== 'permission-denied') {
        setError("Failed to fetch songs. Check your connection.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setError(null);
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Login failed. Make sure popups are allowed.");
    }
  };

  const handleLogout = () => signOut(auth);

  // Seed data if empty
  const seedData = async () => {
    if (songs.length > 0) return;
    if (!user) {
      setError("Please login with Google to seed sample data.");
      return;
    }
    setSeeding(true);
    setError(null);
    try {
      for (const song of sampleSongs) {
        await addDoc(collection(db, 'songs'), {
          ...song,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Seeding error:", err);
      setError("Failed to seed data. Check Firestore rules.");
    } finally {
      setSeeding(false);
    }
  };

  // Filtering
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.lyricsSnippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesMood = !selectedMood || song.mood.includes(selectedMood);
      
      return matchesSearch && matchesMood;
    });
  }, [songs, searchQuery, selectedMood]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Auth Bar */}
      <div className="flex justify-end mb-4">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-brand-purple/50" />
              )}
              <span className="text-zinc-400 text-sm hidden sm:inline">{user.displayName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border border-zinc-800"
          >
            <LogIn className="w-4 h-4" />
            Login to Seed
          </button>
        )}
      </div>

      {/* Header */}
      <header className="mb-12 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block mb-4"
        >
          <div className="juice-gradient p-3 rounded-2xl juice-glow">
            <Music className="w-8 h-8 text-white" />
          </div>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-5xl md:text-7xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
        >
          999 SEARCH
        </motion.h1>
        <p className="text-zinc-500 text-lg font-medium">Legends Never Die. Find your vibe.</p>
      </header>

      {/* Search & Filters */}
      <div className="mb-12 space-y-6">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search title, artist, lyrics, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 transition-all text-lg"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setSelectedMood(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedMood 
                ? 'juice-gradient text-white shadow-lg' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            All Vibes
          </button>
          {MOODS.map((mood) => {
            const Icon = mood.icon;
            return (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedMood === mood.id 
                    ? 'juice-gradient text-white shadow-lg' 
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${selectedMood === mood.id ? 'text-white' : mood.color}`} />
                {mood.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Results Grid */}
      <div className="relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
            <p className="text-zinc-500 animate-pulse">Searching the abyss...</p>
          </div>
        ) : filteredSongs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredSongs.map((song) => (
                <motion.div
                  key={song.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="juice-card p-6 rounded-3xl flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white leading-tight mb-1">{song.title}</h3>
                      <p className="text-brand-purple font-medium text-sm">{song.artist}</p>
                    </div>
                    {song.isUnreleased && (
                      <span className="bg-purple-500/10 text-purple-400 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border border-purple-500/20">
                        Unreleased
                      </span>
                    )}
                  </div>
                  
                  <p className="text-zinc-400 text-sm italic mb-6 line-clamp-2 flex-grow">
                    "{song.lyricsSnippet}"
                  </p>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {song.mood.map(m => {
                      const moodInfo = MOODS.find(mood => mood.id === m);
                      const MoodIcon = moodInfo?.icon || Music;
                      return (
                        <span key={m} className="flex items-center gap-1.5 bg-zinc-800/50 text-zinc-300 text-xs px-3 py-1.5 rounded-full border border-zinc-700/50">
                          <MoodIcon className={`w-3 h-3 ${moodInfo?.color || 'text-zinc-400'}`} />
                          {moodInfo?.label || m}
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20">
            <Ghost className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-400 mb-2">No songs found in the void</h3>
            <p className="text-zinc-600 mb-8">Try searching for something else or clear your filters.</p>
            
            {songs.length === 0 && !seeding && (
              <button 
                onClick={seedData}
                className="inline-flex items-center gap-2 juice-gradient text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-transform"
              >
                <Plus className="w-5 h-5" />
                {user ? 'Seed Sample Songs' : 'Login to Seed Songs'}
              </button>
            )}
            {seeding && (
              <div className="flex items-center justify-center gap-2 text-brand-purple">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Seeding database...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-zinc-900 text-center">
        <p className="text-zinc-600 text-sm">
          999 Search &bull; Inspired by Juice WRLD &bull; Legends Never Die
        </p>
      </footer>
    </div>
  );
}
