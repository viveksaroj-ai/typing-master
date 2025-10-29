import { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "@/App";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Timer, CheckCircle, XCircle, TrendingUp } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TestPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { fetchUser } = useContext(AuthContext);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTest();
    return () => clearInterval(timerRef.current);
  }, [testId]);

  useEffect(() => {
    if (started && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            submitTest();
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

  const fetchTest = async () => {
    try {
      const response = await axios.get(`${API}/tests/${testId}`);
      setTest(response.data);
      setTimeLeft(response.data.duration);
    } catch (error) {
      toast.error("Failed to load test");
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    setStarted(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const calculateStats = () => {
    const words = typedText.trim().split(/\s+/).length;
    const minutes = (test.duration - timeLeft) / 60;
    const currentWpm = minutes > 0 ? Math.round(words / minutes) : 0;
    setWpm(currentWpm);

    let errorCount = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] !== test.content[i]) {
        errorCount++;
      }
    }
    setErrors(errorCount);
    const acc = typedText.length > 0 ? Math.round(((typedText.length - errorCount) / typedText.length) * 100) : 100;
    setAccuracy(acc);
  };

  const submitTest = async () => {
    clearInterval(timerRef.current);
    setFinished(true);

    try {
      const response = await axios.post(`${API}/tests/submit`, {
        test_id: testId,
        typed_text: typedText,
        wpm,
        accuracy,
        errors,
        duration: test.duration - timeLeft
      });

      setResult(response.data);
      await fetchUser();

      if (response.data.passed) {
        toast.success(`Test passed! +${response.data.xp_gained} XP`);
      } else {
        toast.error("Test not passed. Keep practicing!");
      }
    } catch (error) {
      toast.error("Failed to submit test");
    }
  };

  const handleTyping = (e) => {
    if (!started || finished) return;
    const value = e.target.value;
    if (value.length <= test.content.length) {
      setTypedText(value);
    }
  };

  const renderText = () => {
    if (!test) return null;
    return test.content.split('').map((char, index) => {
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

  const handleExit = () => {
    if (started && !finished) {
      setShowExitDialog(true);
    } else {
      navigate('/tests');
    }
  };

  const confirmExit = () => {
    clearInterval(timerRef.current);
    navigate('/tests');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading test...</p>
          </div>
        </div>
      </div>
    );
  }

  if (finished && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card data-testid="test-result-card" className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {result.passed ? (
                  <CheckCircle className="w-20 h-20 text-green-600" />
                ) : (
                  <XCircle className="w-20 h-20 text-red-600" />
                )}
              </div>
              <CardTitle className="text-3xl">
                {result.passed ? "Test Passed!" : "Test Not Passed"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-2">Your WPM</p>
                  <p className="text-4xl font-bold text-blue-600">{wpm}</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-2">Accuracy</p>
                  <p className="text-4xl font-bold text-green-600">{accuracy}%</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-2">Target WPM</p>
                  <p className="text-4xl font-bold text-purple-600">{test.target_wpm}</p>
                </div>
                <div className="text-center p-6 bg-orange-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-2">XP Gained</p>
                  <p className="text-4xl font-bold text-orange-600">+{result.xp_gained}</p>
                </div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg mb-6">
                <p className="text-sm text-slate-600 mb-1">Errors: {errors}</p>
                <p className="text-sm text-slate-600">Duration: {Math.floor((test.duration - timeLeft) / 60)}m {(test.duration - timeLeft) % 60}s</p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  data-testid="back-to-tests-btn"
                  onClick={() => navigate('/tests')} 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Back to Tests
                </Button>
                <Button 
                  data-testid="retake-test-btn"
                  onClick={() => window.location.reload()} 
                  size="lg"
                  variant="outline"
                >
                  Retake Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold" data-testid="test-page-title">{test.title}</h1>
            <Button 
              data-testid="exit-test-btn"
              onClick={handleExit} 
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Exit Test
            </Button>
          </div>
          <Badge className="text-sm" data-testid="test-difficulty-badge">{test.difficulty}</Badge>
        </div>

        {!started ? (
          <Card data-testid="test-instructions-card" className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Test Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6 text-slate-600">
                <li>• Duration: {test.duration / 60} minutes</li>
                <li>• Target Speed: {test.target_wpm} WPM</li>
                <li>• Minimum Accuracy: 90%</li>
                <li>• Copy/Paste is disabled</li>
                <li>• Test will auto-submit when time runs out</li>
                <li>• Type the text exactly as shown</li>
              </ul>
              <Button 
                data-testid="start-test-btn"
                onClick={startTest} 
                size="lg" 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Start Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card data-testid="test-timer-card" className="bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Time Left
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="test-wpm-card">
                <CardHeader>
                  <CardTitle className="text-sm">WPM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{wpm}</div>
                </CardContent>
              </Card>

              <Card data-testid="test-accuracy-card">
                <CardHeader>
                  <CardTitle className="text-sm">Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
                </CardContent>
              </Card>

              <Card data-testid="test-errors-card">
                <CardHeader>
                  <CardTitle className="text-sm">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{errors}</div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="test-typing-area-card">
              <CardHeader>
                <CardTitle>Type the following text:</CardTitle>
                <Progress 
                  value={(typedText.length / test.content.length) * 100} 
                  className="mt-2"
                />
              </CardHeader>
              <CardContent>
                <div className="typing-area mb-6 p-6 bg-slate-50 rounded-lg min-h-[300px] no-select">
                  {renderText()}
                </div>
                <textarea
                  ref={inputRef}
                  data-testid="test-typing-input"
                  value={typedText}
                  onChange={handleTyping}
                  className="w-full p-4 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-lg resize-none"
                  rows={6}
                  placeholder="Start typing here..."
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit? Your progress will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-exit-btn">Continue Test</AlertDialogCancel>
            <AlertDialogAction 
              data-testid="confirm-exit-btn"
              onClick={confirmExit} 
              className="bg-red-600 hover:bg-red-700"
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TestPage;
