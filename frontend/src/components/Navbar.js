import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Keyboard, LayoutDashboard, Target, Gamepad2, FileText, Trophy, LogOut, Shield } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/practice', label: 'Practice', icon: Target },
    { path: '/games', label: 'Games', icon: Gamepad2 },
    { path: '/tests', label: 'Tests', icon: FileText },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  if (user?.is_admin) {
    navItems.push({ path: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/dashboard')}
          >
            <Keyboard className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold gradient-text">TypeMaster</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}-btn`}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  onClick={() => navigate(item.path)}
                  className={isActive(item.path) ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-slate-600 capitalize">{user?.level} • {user?.xp} XP</p>
            </div>
            <Button 
              data-testid="logout-btn"
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex overflow-x-auto gap-2 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className={`whitespace-nowrap ${isActive(item.path) ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                <Icon className="w-4 h-4 mr-1" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
