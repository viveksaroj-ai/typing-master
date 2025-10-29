import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, FileText, BarChart3, Plus, Edit, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [tests, setTests] = useState([]);
  const [users, setUsers] = useState([]);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testForm, setTestForm] = useState({
    test_number: '',
    title: '',
    content: '',
    duration: 900,
    target_wpm: 35,
    difficulty: 'intermediate'
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, testsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/tests`),
        axios.get(`${API}/admin/users?limit=100`)
      ]);
      setStats(statsRes.data);
      setTests(testsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error("Failed to load admin data");
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    try {
      if (editingTest) {
        await axios.put(`${API}/admin/tests/${editingTest.id}`, testForm);
        toast.success("Test updated successfully");
      } else {
        await axios.post(`${API}/admin/tests`, testForm);
        toast.success("Test created successfully");
      }
      setShowTestDialog(false);
      setEditingTest(null);
      resetForm();
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save test");
    }
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    setTestForm({
      test_number: test.test_number,
      title: test.title,
      content: test.content,
      duration: test.duration,
      target_wpm: test.target_wpm,
      difficulty: test.difficulty
    });
    setShowTestDialog(true);
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    
    try {
      await axios.delete(`${API}/admin/tests/${testId}`);
      toast.success("Test deleted successfully");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to delete test");
    }
  };

  const resetForm = () => {
    setTestForm({
      test_number: '',
      title: '',
      content: '',
      duration: 900,
      target_wpm: 35,
      difficulty: 'intermediate'
    });
  };

  const openNewTestDialog = () => {
    setEditingTest(null);
    resetForm();
    setShowTestDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="admin-title">Admin Panel</h1>
          <p className="text-slate-600">Manage tests, users, and view analytics</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card data-testid="total-users-card" className="stat-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.total_users}</div>
              </CardContent>
            </Card>

            <Card data-testid="total-tests-card" className="stat-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  Total Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.total_tests}</div>
              </CardContent>
            </Card>

            <Card data-testid="total-sessions-card" className="stat-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4" />
                  Practice Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.total_practice_sessions}</div>
              </CardContent>
            </Card>

            <Card data-testid="total-results-card" className="stat-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.total_test_results}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="tests">
          <TabsList className="mb-6">
            <TabsTrigger data-testid="tests-tab" value="tests">Tests Management</TabsTrigger>
            <TabsTrigger data-testid="users-tab" value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <Card data-testid="tests-management-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Typing Tests</CardTitle>
                  <Button 
                    data-testid="create-test-btn"
                    onClick={openNewTestDialog} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Test
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tests.map((test) => (
                    <div 
                      key={test.id}
                      data-testid={`admin-test-${test.test_number}`}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">Test #{test.test_number}: {test.title}</p>
                        <p className="text-sm text-slate-600">
                          {test.difficulty} | {test.duration / 60} min | Target: {test.target_wpm} WPM
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          data-testid={`edit-test-${test.test_number}-btn`}
                          onClick={() => handleEditTest(test)} 
                          size="sm" 
                          variant="outline"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          data-testid={`delete-test-${test.test_number}-btn`}
                          onClick={() => handleDeleteTest(test.id)} 
                          size="sm" 
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card data-testid="users-management-card">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user, index) => (
                    <div 
                      key={user.id || index}
                      data-testid={`user-${index + 1}`}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{user.username}</p>
                        <p className="text-sm text-slate-600">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium capitalize">{user.level}</p>
                        <p className="text-sm text-slate-600">{user.xp} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="test-dialog">
          <DialogHeader>
            <DialogTitle>{editingTest ? 'Edit Test' : 'Create New Test'}</DialogTitle>
            <DialogDescription>
              {editingTest ? 'Update test details' : 'Add a new typing test to the platform'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTest} className="space-y-4">
            <div>
              <Label htmlFor="test_number">Test Number</Label>
              <Input
                id="test_number"
                data-testid="test-number-input"
                type="number"
                value={testForm.test_number}
                onChange={(e) => setTestForm({ ...testForm, test_number: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                data-testid="test-title-input"
                value={testForm.title}
                onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                data-testid="test-content-input"
                value={testForm.content}
                onChange={(e) => setTestForm({ ...testForm, content: e.target.value })}
                rows={8}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  data-testid="test-duration-input"
                  type="number"
                  value={testForm.duration}
                  onChange={(e) => setTestForm({ ...testForm, duration: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="target_wpm">Target WPM</Label>
                <Input
                  id="target_wpm"
                  data-testid="test-target-wpm-input"
                  type="number"
                  value={testForm.target_wpm}
                  onChange={(e) => setTestForm({ ...testForm, target_wpm: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select 
                  value={testForm.difficulty} 
                  onValueChange={(value) => setTestForm({ ...testForm, difficulty: value })}
                >
                  <SelectTrigger data-testid="test-difficulty-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4 justify-end">
              <Button 
                data-testid="cancel-test-btn"
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowTestDialog(false);
                  setEditingTest(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                data-testid="save-test-btn"
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingTest ? 'Update' : 'Create'} Test
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
