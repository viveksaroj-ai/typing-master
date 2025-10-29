import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LeaderboardPage = () => {
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const [globalRes, weeklyRes] = await Promise.all([
        axios.get(`${API}/leaderboard/global`),
        axios.get(`${API}/leaderboard/weekly`)
      ]);
      setGlobalLeaderboard(globalRes.data);
      setWeeklyLeaderboard(weeklyRes.data);
    } catch (error) {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-blue-100 text-blue-700',
      advanced: 'bg-purple-100 text-purple-700',
      expert: 'bg-red-100 text-red-700'
    };
    return colors[level] || colors.beginner;
  };

  const getRankMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const LeaderboardTable = ({ data, showWeeklyStats = false }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No data available yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.map((entry, index) => (
          <Card 
            key={index}
            data-testid={`leaderboard-entry-${index + 1}`}
            className={`stat-card ${index < 3 ? 'border-2 border-yellow-300' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold w-12 text-center">
                    {getRankMedal(index + 1)}
                  </div>
                  <div>
                    <p className="font-semibold text-lg" data-testid={`username-${index + 1}`}>{entry.username}</p>
                    <Badge className={getLevelColor(entry.level)} data-testid={`level-${index + 1}`}>
                      {entry.level}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-lg font-bold text-blue-600" data-testid={`wpm-${index + 1}`}>{entry.wpm} WPM</span>
                  </div>
                  {showWeeklyStats && entry.average_wpm && (
                    <p className="text-sm text-slate-600">Avg: {entry.average_wpm} WPM</p>
                  )}
                  <p className="text-sm text-slate-600" data-testid={`xp-${index + 1}`}>{entry.xp} XP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading leaderboard...</p>
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
          <h1 className="text-4xl font-bold mb-2" data-testid="leaderboard-title">
            <Trophy className="inline w-10 h-10 mr-2 text-yellow-600" />
            Leaderboard
          </h1>
          <p className="text-slate-600">See how you rank against other typists</p>
        </div>

        <Tabs defaultValue="global" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger data-testid="global-tab" value="global">
              <TrendingUp className="w-4 h-4 mr-2" />
              Global
            </TabsTrigger>
            <TabsTrigger data-testid="weekly-tab" value="weekly">
              <Zap className="w-4 h-4 mr-2" />
              Weekly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global">
            <Card data-testid="global-leaderboard-card">
              <CardHeader>
                <CardTitle>Global Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <LeaderboardTable data={globalLeaderboard} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            <Card data-testid="weekly-leaderboard-card">
              <CardHeader>
                <CardTitle>Weekly Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <LeaderboardTable data={weeklyLeaderboard} showWeeklyStats />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeaderboardPage;
