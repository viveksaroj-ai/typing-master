import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "@/App";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, Trophy, Flame, TrendingUp, Clock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        axios.get(`${API}/practice/stats`),
        axios.get(`${API}/practice/history?limit=5`)
      ]);
      setStats(statsRes.data);
      setRecentTests(historyRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const getXPProgress = () => {
    const xp = user?.xp || 0;
    if (xp < 100) return { current: xp, target: 100, percentage: (xp / 100) * 100 };
    if (xp < 500) return { current: xp - 100, target: 400, percentage: ((xp - 100) / 400) * 100 };
    if (xp < 1500) return { current: xp - 500, target: 1000, percentage: ((xp - 500) / 1000) * 100 };
    return { current: xp - 1500, target: 500, percentage: Math.min(((xp - 1500) / 500) * 100, 100) };
  };

  const xpProgress = getXPProgress();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="dashboard-title">Welcome back, {user?.username}!</h1>
          <p className="text-slate-600">Track your progress and continue improving your typing skills.</p>
        </div>

        {/* User Progress */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="level-card" className="stat-card border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold gradient-text mb-2 capitalize">
                {user?.level}
              </div>
              <div className="mb-2">
                <Progress value={xpProgress.percentage} className="h-2" />
              </div>
              <p className="text-sm text-slate-600">
                {xpProgress.current} / {xpProgress.target} XP to next level
              </p>
            </CardContent>
          </Card>

          <Card data-testid="streak-card" className="stat-card border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600" />
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {user?.streak_days || 0} days
              </div>
              <p className="text-sm text-slate-600">
                Keep practicing daily to maintain your streak!
              </p>
            </CardContent>
          </Card>

          <Card data-testid="xp-card" className="stat-card border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Total XP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {user?.xp || 0}
              </div>
              <p className="text-sm text-slate-600">
                Earn XP by completing tests and practice sessions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="total-tests-card" className="stat-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_tests || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="avg-wpm-card" className="stat-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Average WPM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.average_wpm || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="avg-accuracy-card" className="stat-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.average_accuracy || 0}%</div>
            </CardContent>
          </Card>

          <Card data-testid="best-wpm-card" className="stat-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Best WPM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.best_wpm || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card 
            data-testid="practice-card"
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => navigate('/practice')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Practice Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">Improve your typing with various practice modes</p>
              <Button data-testid="start-practice-btn" className="w-full bg-blue-600 hover:bg-blue-700">
                Start Practice
              </Button>
            </CardContent>
          </Card>

          <Card 
            data-testid="games-card"
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => navigate('/games')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Typing Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">Fun games to make typing practice engaging</p>
              <Button data-testid="play-games-btn" className="w-full bg-purple-600 hover:bg-purple-700">
                Play Games
              </Button>
            </CardContent>
          </Card>

          <Card 
            data-testid="tests-card"
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => navigate('/tests')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-600" />
                SSC CGL Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">Take official SSC CGL typing mock tests</p>
              <Button data-testid="take-test-btn" className="w-full bg-green-600 hover:bg-green-700">
                Take Test
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {recentTests.length > 0 && (
          <Card data-testid="recent-activity-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTests.map((test, index) => (
                  <div key={test.id || index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{test.mode} Practice</p>
                      <p className="text-sm text-slate-600">
                        {new Date(test.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">{test.wpm} WPM</p>
                      <p className="text-sm text-slate-600">{test.accuracy}% accuracy</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
