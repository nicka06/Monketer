import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

/**
 * Authentication Context Interface
 * Defines the shape of the authentication context data and methods
 * 
 * @property session - Current Supabase session or null when not authenticated
 * @property user - Current authenticated user or null when not authenticated
 * @property loading - Boolean indicating if auth state is being determined
 * @property signIn - Function to authenticate an existing user
 * @property signUp - Function to register and authenticate a new user
 * @property signOut - Function to end the current user session
 */
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Authentication Context
 * React context for sharing authentication state throughout the application
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 * 
 * Manages authentication state and provides authentication methods
 * to the entire application. Handles session persistence, user authentication,
 * and synchronizes with Supabase auth service.
 * 
 * Key features:
 * - Real-time auth state synchronization
 * - Session persistence across page reloads
 * - User authentication operations (sign in, sign up, sign out)
 * - Toast notifications for auth events
 * - Database synchronization for user profiles
 * 
 * @param children - React components that will have access to auth context
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('useAuth.tsx onAuthStateChange EVENT:', event, 'SESSION:', session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
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

  /**
   * Authenticates a user with email and password
   * 
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if authentication fails
   */
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

  /**
   * Registers a new user and creates associated database records
   * 
   * Handles the two-stage process:
   * 1. Create the auth user in Supabase Auth
   * 2. Create the user_info record in the database
   * 
   * @param email - User's email address
   * @param password - User's chosen password
   * @param username - User's chosen username
   * @throws Error if registration fails at any stage
   */
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
        const { error: infoError } = await supabase
          .from('user_info')
          .insert({
            auth_user_uuid: authData.user.id,
            username: email
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

  /**
   * Ends the current user session
   * 
   * @throws Error if sign out fails
   */
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

/**
 * Authentication Hook
 * 
 * Custom hook that provides access to the authentication context
 * throughout the application. Must be used within an AuthProvider.
 * 
 * Usage:
 * ```tsx
 * function ProfilePage() {
 *   const { user, signOut } = useAuth();
 *   
 *   if (!user) return <LoginRedirect />;
 *   
 *   return (
 *     <div>
 *       <h1>Welcome, {user.email}</h1>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @returns Authentication context with user data and auth methods
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
