
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to create a simple hash of the password
// Note: This is not for security but just to avoid storing plaintext passwords
// For production, you would use a proper password hashing library
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({
        title: "Success",
        description: "You've been signed in successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  }

  async function signUp(email: string, password: string, username: string) {
    try {
      console.log("Starting signup process for:", email);
      
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { username: email }, // Use email as username
          emailRedirectTo: window.location.origin,
        }
      });
      
      if (authError) {
        console.error("Auth error during signup:", authError);
        
        // Handle rate limiting specifically
        if (authError.status === 429 || authError.message.includes("after 7 seconds")) {
          toast({
            title: "Too many signup attempts",
            description: "Please wait a few seconds before trying again",
            variant: "destructive",
          });
        } else {
          // General error toast for other errors
          toast({
            title: "Sign Up Failed",
            description: authError.message || "An unexpected error occurred",
            variant: "destructive",
          });
        }
        
        throw authError;
      }
      
      console.log("Auth signup successful, user:", authData?.user?.id);
      
      // Then explicitly create the user_info entry
      if (authData?.user) {
        // Create a simple hash of the password to store
        const hashedPassword = simpleHash(password);
        
        const { error: infoError } = await supabase
          .from('user_info')
          .insert({
            username: email,
            password: hashedPassword // Store hashed password instead of null
          });
        
        if (infoError) {
          console.error("Error creating user info:", infoError);
          // Don't throw here as we want auth to succeed even if this fails
        } else {
          console.log("User info created successfully");
        }
      }

      toast({
        title: "Success",
        description: "Your account has been created successfully.",
      });
    } catch (error: any) {
      console.error("Signup process failed:", error);
      
      // The specific error toast is already handled above for rate limiting
      // This catch is for any other unexpected errors not caught above
      if (!error.status || error.status !== 429) {
        toast({
          title: "Sign Up Failed",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
      
      throw error;
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Signed Out",
        description: "You've been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign Out Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
