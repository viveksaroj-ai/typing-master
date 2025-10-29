import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Keyboard, Trophy, Target, Zap, TrendingUp, Users } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-2">
            <Keyboard className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold gradient-text">TypeMaster</h1>
          </div>
          <Button 
            data-testid="nav-login-btn"
            onClick={() => navigate('/auth')} 
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            Login
          </Button>
        </nav>

        <div className="text-center max-w-4xl mx-auto mb-20">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Master Your <span className="gradient-text">Typing Skills</span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Practice, compete, and improve your typing speed with our comprehensive platform. 
            Perfect for SSC CGL preparation and daily practice.
          </p>
          <Button 
            data-testid="get-started-btn"
            onClick={() => navigate('/auth')} 
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            Get Started Free
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          <div className="glass-effect p-8 rounded-2xl stat-card">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Practice Modes</h3>
            <p className="text-slate-600">
              Words, sentences, paragraphs, numbers, and punctuation practice with customizable timers.
            </p>
          </div>

          <div className="glass-effect p-8 rounded-2xl stat-card">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Typing Games</h3>
            <p className="text-slate-600">
              Engaging games like falling words, speed challenges, and survival modes to make learning fun.
            </p>
          </div>

          <div className="glass-effect p-8 rounded-2xl stat-card">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">SSC CGL Tests</h3>
            <p className="text-slate-600">
              12+ mock tests designed for SSC CGL preparation with real test environment and detailed analysis.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <div className="text-4xl font-bold gradient-text">50K+</div>
            </div>
            <p className="text-slate-600">Practice Sessions</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-6 h-6 text-purple-600" />
              <div className="text-4xl font-bold gradient-text">10K+</div>
            </div>
            <p className="text-slate-600">Active Users</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-green-600" />
              <div className="text-4xl font-bold gradient-text">95%</div>
            </div>
            <p className="text-slate-600">Success Rate</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-slate-600">
          <p>&copy; 2025 TypeMaster. Built for typing excellence.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
