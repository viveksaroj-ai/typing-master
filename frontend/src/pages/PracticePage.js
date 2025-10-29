import { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AuthContext } from "@/App";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Timer, RotateCcw, Play, StopCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PracticePage = () => {
  const { fetchUser } = useContext(AuthContext);
  const [mode, setMode] = useState("words");
  const [duration, setDuration] = useState(60);
  const [content, setContent] = useState("");
  const [typedText, setTypedText] = useState("");
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadContent();
  }, [mode]);

  useEffect(() => {
    if (started && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishPractice();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [started, timeLeft]);

  useEffect(() => {
    if (typedText.length > 0) {
      calculateStats();
    }
  }, [typedText]);

  const loadContent = async () => {
    try {
      const response = await axios.get(`${API}/practice/content/${mode}`);
      setContent(response.data.content);
    } catch (error) {
      toast.error("Failed to load content");
    }
  };

  const startPractice = () => {
    setStarted(true);
    setTimeLeft(duration);
    setTypedText("");
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const calculateStats = () => {
    const words = typedText.trim().split(/\s+/).length;
    const minutes = (duration - timeLeft) / 60;
    const currentWpm = minutes > 0 ? Math.round(words / minutes) : 0;
    setWpm(currentWpm);

    let errorCount = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] !== content[i]) {
        errorCount++;
      }
    }
    setErrors(errorCount);
    const acc = typedText.length > 0 ? Math.round(((typedText.length - errorCount) / typedText.length) * 100) : 100;
    setAccuracy(acc);
  };

  const finishPractice = async () => {
    clearInterval(timerRef.current);
    setStarted(false);

    if (typedText.length === 0) {
      toast.error("No text typed");
      return;
    }

    try {
      const response = await axios.post(`${API}/practice/session`, {
        mode,
        duration,
        typed_text: typedText,
        original_text: content,
        wpm,
        accuracy,
        errors
      });

      toast.success(`Practice completed! +${response.data.xp_gained} XP`);
      await fetchUser();
    } catch (error) {
      toast.error("Failed to save practice session");
    }
  };

  const resetPractice = () => {
    clearInterval(timerRef.current);
    setStarted(false);
    setTypedText("");
    setTimeLeft(duration);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    loadContent();
  };

  const handleTyping = (e) => {
    if (!started) return;
    const value = e.target.value;
    if (value.length <= content.length) {
      setTypedText(value);
    }
  };

  const renderText = () => {
    return content.split('').map((char, index) => {
      let className = '';
      if (index < typedText.length) {
        className = typedText[index] === char ? 'correct' : 'incorrect';
      } else if (index === typedText.length) {
        className = 'current';
      }
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="practice-title">Practice Mode</h1>
          <p className="text-slate-600">Choose a mode and duration to start practicing</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card data-testid="mode-select-card">
            <CardHeader>
              <CardTitle className="text-lg">Practice Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={mode} onValueChange={setMode} disabled={started}>
                <SelectTrigger data-testid="mode-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="words">Words</SelectItem>
                  <SelectItem value="sentences">Sentences</SelectItem>
                  <SelectItem value="paragraphs">Paragraphs</SelectItem>
                  <SelectItem value="numbers">Numbers</SelectItem>
                  <SelectItem value="punctuation">Punctuation</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card data-testid="duration-select-card">
            <CardHeader>
              <CardTitle className="text-lg">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={duration.toString()} onValueChange={(val) => setDuration(parseInt(val))} disabled={started}>
                <SelectTrigger data-testid="duration-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="180">3 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                  <SelectItem value="900">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card data-testid="timer-card" className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-600" />
                Time Left
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card data-testid="wpm-card">
            <CardHeader>
              <CardTitle className="text-sm">WPM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{wpm}</div>
            </CardContent>
          </Card>

          <Card data-testid="accuracy-card">
            <CardHeader>
              <CardTitle className="text-sm">Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
            </CardContent>
          </Card>

          <Card data-testid="errors-card">
            <CardHeader>
              <CardTitle className="text-sm">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{errors}</div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="typing-area-card" className="mb-6">
          <CardHeader>
            <CardTitle>Typing Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="typing-area mb-6 p-6 bg-slate-50 rounded-lg min-h-[200px] no-select">
              {renderText()}
            </div>
            <input
              ref={inputRef}
              data-testid="typing-input"
              type="text"
              value={typedText}
              onChange={handleTyping}
              disabled={!started}
              className="w-full p-4 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-lg"
              placeholder={started ? "Start typing..." : "Click Start to begin"}
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          {!started ? (
            <Button 
              data-testid="start-practice-btn"
              onClick={startPractice} 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Practice
            </Button>
          ) : (
            <Button 
              data-testid="stop-practice-btn"
              onClick={finishPractice} 
              size="lg" 
              className="bg-red-600 hover:bg-red-700 px-8"
            >
              <StopCircle className="w-5 h-5 mr-2" />
              Stop & Submit
            </Button>
          )}
          <Button 
            data-testid="reset-practice-btn"
            onClick={resetPractice} 
            size="lg" 
            variant="outline"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PracticePage;
