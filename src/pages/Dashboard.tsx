
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface UserInfo {
  id: number;
  username: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from('user_info')
          .select('*')
          .limit(1);
        
        if (error) {
          console.error('Error fetching user info:', error);
        } else if (data && data.length > 0) {
          setUserInfo(data[0]);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserInfo();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white shadow-sm rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <Button
              onClick={() => signOut()}
              variant="outline"
            >
              Sign Out
            </Button>
          </div>
          
          <div className="bg-gray-50 rounded-md p-4 mb-8">
            <h2 className="text-lg font-medium mb-4">Your Account</h2>
            {loading ? (
              <div className="text-center py-4">Loading account information...</div>
            ) : userInfo ? (
              <div className="space-y-3">
                <p><span className="font-medium">Username:</span> {userInfo.username}</p>
                <p><span className="font-medium">Email:</span> {user?.email}</p>
                <p><span className="font-medium">Member since:</span> {new Date(userInfo.created_at).toLocaleDateString()}</p>
              </div>
            ) : (
              <div className="text-amber-600 py-4">
                No account information found. This could be due to a configuration issue.
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-medium mb-4">Welcome to emailore!</h2>
            <p className="text-gray-600 mb-6">
              This is your personal dashboard. Here you can manage your account and access your email content.
            </p>
            
            <Button asChild className="bg-emailore-purple hover:bg-emailore-purple-dark transition-colors">
              <Link to="/editor">
                Go to Email Editor
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
