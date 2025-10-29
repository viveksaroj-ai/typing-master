import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gamepad2, Zap, Target, Heart } from "lucide-react";

const GamesPage = () => {
  const [selectedGame, setSelectedGame] = useState(null);

  const games = [
    {
      id: 'falling-words',
      title: 'Falling Words',
      description: 'Type words before they fall off the screen',
      icon: Zap,
      color: 'blue'
    },
    {
      id: 'speed-challenge',
      title: 'Speed Challenge',
      description: 'Type as many words as possible in 60 seconds',
      icon: Target,
      color: 'purple'
    },
    {
      id: 'survival',
      title: 'Survival Mode',
      description: 'Type correctly or lose a life. Last as long as you can!',
      icon: Heart,
      color: 'red'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {!selectedGame ? (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2" data-testid="games-title">Typing Games</h1>
              <p className="text-slate-600">Make learning fun with engaging typing games</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {games.map((game) => {
                const Icon = game.icon;
                return (
                  <Card 
                    key={game.id}
                    data-testid={`game-card-${game.id}`}
                    className="game-card cursor-pointer hover:shadow-xl transition-all"
                    onClick={() => setSelectedGame(game.id)}
                  >
                    <CardHeader>
                      <div className={`w-12 h-12 bg-${game.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className={`w-6 h-6 text-${game.color}-600`} />
                      </div>
                      <CardTitle>{game.title}</CardTitle>
                      <CardDescription>{game.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        data-testid={`play-${game.id}-btn`}
                        className="w-full" 
                        variant="outline"
                      >
                        Play Game
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <GameComponent gameId={selectedGame} onBack={() => setSelectedGame(null)} />
        )}
      </div>
    </div>
  );
};

const GameComponent = ({ gameId, onBack }) => {
  if (gameId === 'falling-words') {
    return <FallingWordsGame onBack={onBack} />;
  } else if (gameId === 'speed-challenge') {
    return <SpeedChallengeGame onBack={onBack} />;
  } else if (gameId === 'survival') {
    return <SurvivalGame onBack={onBack} />;
  }
  return null;
};

const FallingWordsGame = ({ onBack }) => {
  const [words, setWords] = useState([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const gameRef = useRef(null);

  const wordList = ['hello', 'world', 'type', 'fast', 'game', 'code', 'speed', 'quick', 'jump', 'play'];

  useEffect(() => {
    if (started && !gameOver) {
      const interval = setInterval(() => {
        addWord();
      }, 2000);

      const fallInterval = setInterval(() => {
        setWords(prev => {
          const updated = prev.map(w => ({ ...w, y: w.y + 10 }));
          const lost = updated.filter(w => w.y > 550);
          if (lost.length > 0) {
            setGameOver(true);
          }
          return updated.filter(w => w.y <= 600);
        });
      }, 100);

      return () => {
        clearInterval(interval);
        clearInterval(fallInterval);
      };
    }
  }, [started, gameOver]);

  const addWord = () => {
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const x = Math.random() * 700;
    setWords(prev => [...prev, { word, x, y: 0, id: Date.now() }]);
  };

  const handleInput = (e) => {
    const value = e.target.value;
    setInput(value);

    const matched = words.find(w => w.word === value);
    if (matched) {
      setWords(prev => prev.filter(w => w.id !== matched.id));
      setScore(prev => prev + 10);
      setInput("");
      toast.success(`+10 points!`);
    }
  };

  const startGame = () => {
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setWords([]);
    setInput("");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold">Falling Words</h2>
        <Button onClick={onBack} variant="outline" data-testid="back-to-games-btn">Back to Games</Button>
      </div>

      <Card data-testid="falling-words-game-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Score: {score}</CardTitle>
            {!started && (
              <Button onClick={startGame} className="bg-blue-600 hover:bg-blue-700" data-testid="start-falling-words-btn">
                Start Game
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={gameRef}
            className="relative bg-slate-100 rounded-lg overflow-hidden mb-4"
            style={{ height: '600px', border: '2px solid #cbd5e1' }}
          >
            {words.map(w => (
              <div
                key={w.id}
                className="absolute font-bold text-xl text-blue-600 word-fall"
                style={{ left: `${w.x}px`, top: `${w.y}px` }}
              >
                {w.word}
              </div>
            ))}
            {gameOver && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg text-center">
                  <h3 className="text-2xl font-bold mb-4">Game Over!</h3>
                  <p className="text-xl mb-4">Final Score: {score}</p>
                  <Button onClick={startGame} className="bg-blue-600 hover:bg-blue-700" data-testid="restart-falling-words-btn">
                    Play Again
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Input
            data-testid="falling-words-input"
            value={input}
            onChange={handleInput}
            placeholder="Type the falling words..."
            className="text-lg font-mono"
            disabled={!started || gameOver}
            onPaste={(e) => e.preventDefault()}
          />
        </CardContent>
      </Card>
    </div>
  );
};

const SpeedChallengeGame = ({ onBack }) => {
  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const wordList = ['hello', 'world', 'type', 'fast', 'game', 'code', 'speed', 'quick', 'jump', 'play', 'test', 'word', 'time', 'score', 'win'];

  useEffect(() => {
    if (started && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [started, timeLeft]);

  const getRandomWord = () => {
    return wordList[Math.floor(Math.random() * wordList.length)];
  };

  const startGame = () => {
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(60);
    setInput('');
    setCurrentWord(getRandomWord());
  };

  const handleInput = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value === currentWord) {
      setScore(prev => prev + 1);
      setInput('');
      setCurrentWord(getRandomWord());
      toast.success('+1 word!');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold">Speed Challenge</h2>
        <Button onClick={onBack} variant="outline" data-testid="back-to-games-btn">Back to Games</Button>
      </div>

      <Card data-testid="speed-challenge-game-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Score: {score} words</CardTitle>
            <div className="text-2xl font-bold text-blue-600">Time: {timeLeft}s</div>
          </div>
        </CardHeader>
        <CardContent>
          {!started ? (
            <div className="text-center py-20">
              <p className="text-lg text-slate-600 mb-6">Type as many words as possible in 60 seconds!</p>
              <Button onClick={startGame} size="lg" className="bg-purple-600 hover:bg-purple-700" data-testid="start-speed-challenge-btn">
                Start Challenge
              </Button>
            </div>
          ) : gameOver ? (
            <div className="text-center py-20">
              <h3 className="text-3xl font-bold mb-4">Time's Up!</h3>
              <p className="text-2xl mb-6">You typed <span className="text-purple-600 font-bold">{score}</span> words</p>
              <Button onClick={startGame} size="lg" className="bg-purple-600 hover:bg-purple-700" data-testid="restart-speed-challenge-btn">
                Play Again
              </Button>
            </div>
          ) : (
            <div>
              <div className="text-center py-12 mb-6 bg-slate-50 rounded-lg">
                <p className="text-5xl font-bold text-purple-600">{currentWord}</p>
              </div>
              <Input
                data-testid="speed-challenge-input"
                value={input}
                onChange={handleInput}
                placeholder="Type the word above..."
                className="text-xl font-mono text-center"
                autoFocus
                onPaste={(e) => e.preventDefault()}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SurvivalGame = ({ onBack }) => {
  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const wordList = ['hello', 'world', 'type', 'survive', 'game', 'careful', 'speed', 'accuracy', 'focus', 'challenge'];

  const getRandomWord = () => {
    return wordList[Math.floor(Math.random() * wordList.length)];
  };

  const startGame = () => {
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setLives(3);
    setInput('');
    setCurrentWord(getRandomWord());
  };

  const handleInput = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value === currentWord) {
      setScore(prev => prev + 1);
      setInput('');
      setCurrentWord(getRandomWord());
      toast.success('+1 point!');
    } else if (value.length >= currentWord.length) {
      const newLives = lives - 1;
      setLives(newLives);
      setInput('');
      setCurrentWord(getRandomWord());
      toast.error('-1 life!');
      if (newLives <= 0) {
        setGameOver(true);
      }
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold">Survival Mode</h2>
        <Button onClick={onBack} variant="outline" data-testid="back-to-games-btn">Back to Games</Button>
      </div>

      <Card data-testid="survival-game-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Score: {score}</CardTitle>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-6 h-6 ${i < lives ? 'fill-red-500 text-red-500' : 'text-slate-300'}`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!started ? (
            <div className="text-center py-20">
              <p className="text-lg text-slate-600 mb-6">Type words correctly or lose a life. You have 3 lives!</p>
              <Button onClick={startGame} size="lg" className="bg-red-600 hover:bg-red-700" data-testid="start-survival-btn">
                Start Survival
              </Button>
            </div>
          ) : gameOver ? (
            <div className="text-center py-20">
              <h3 className="text-3xl font-bold mb-4">Game Over!</h3>
              <p className="text-2xl mb-6">Final Score: <span className="text-red-600 font-bold">{score}</span></p>
              <Button onClick={startGame} size="lg" className="bg-red-600 hover:bg-red-700" data-testid="restart-survival-btn">
                Play Again
              </Button>
            </div>
          ) : (
            <div>
              <div className="text-center py-12 mb-6 bg-slate-50 rounded-lg">
                <p className="text-5xl font-bold text-red-600">{currentWord}</p>
              </div>
              <Input
                data-testid="survival-input"
                value={input}
                onChange={handleInput}
                placeholder="Type the word carefully..."
                className="text-xl font-mono text-center"
                autoFocus
                onPaste={(e) => e.preventDefault()}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GamesPage;
