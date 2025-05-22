import React, { useState } from 'react';
import { Moon, Sun, Laptop, LogIn, LogOut, User, Loader, Mail, Info } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const SettingsPage: React.FC = () => {
  const { settings, isLoading: settingsLoading, setTheme, setNotifications, setNotificationTiming, setDietary } = useSettings();
  const { user, signIn, signUp, signInWithGoogle, signOut, isLoading: authLoading, error: authContextError } = React.useContext(AuthContext);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };
  
  const handleDietaryChange = (preference: keyof typeof settings.dietary) => {
    setDietary(preference, !settings.dietary[preference]);
  };
  
  const handleNotificationsChange = (enabled: boolean) => {
    setNotifications(enabled);
  };
  
  const handleNotificationTimingChange = (timing: number) => {
    setNotificationTiming(timing);
  };
  
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSignupSuccess(false);
    
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      if (isSignUp) {
        console.log('Attempting to sign up with email:', email);
        await signUp(email, password);
        setSignupSuccess(true);
        // Don't clear form on signup success so user can see what they entered
      } else {
        console.log('Attempting to sign in with email:', email);
        await signIn(email, password);
        // Clear the form after successful sign-in
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      setAuthError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSignOut = async () => {
    try {
      setIsSubmitting(true);
      await signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
      setAuthError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (settingsLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 md:pb-4"> {/* Padding to accommodate mobile nav */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Settings</h2>
      
      <div className="space-y-8 max-w-2xl">
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">Account</h3>
          
          {user ? (
            <div>
              <div className="flex items-center mb-4">
                <User className="mr-2 text-blue-500" size={24} />
                <div>
                  <p className="text-slate-800 dark:text-slate-100 font-medium">{user.email}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Signed in</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center"
              >
                <LogOut size={18} className="mr-2" />
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                You're currently using Frostie in guest mode. Sign in to sync your data across devices.
              </p>
              
              <button 
                onClick={handleGoogleSignIn}
                className="w-full mb-4 flex items-center justify-center bg-white border border-slate-300 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Or</span>
                </div>
              </div>
              
              {signupSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 flex items-start">
                  <Mail className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Check your email!</p>
                    <p className="text-sm">We've sent a confirmation link to <span className="font-medium">{email}</span>. Please check your inbox and click the link to verify your account.</p>
                  </div>
                </div>
              )}
              
              {authError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 flex items-start">
                  <Info className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{authError}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleAuthSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    required
                    minLength={6}
                  />
                  {isSignUp && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Password must be at least 6 characters long
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <input
                      id="remember_me"
                      name="remember_me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700"
                    />
                    <label htmlFor="remember_me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                      Remember me
                    </label>
                  </div>
                  
                  <div className="text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setAuthError(null);
                        setSignupSuccess(false);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader size={18} className="animate-spin mr-2" />
                      {isSignUp ? "Signing Up..." : "Signing In..."}
                    </>
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      {isSignUp ? "Sign Up" : "Sign In"}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </section>
        
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">Appearance</h3>
          <div className="inline-flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                settings.theme === 'light' 
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/80'
              }`}
              aria-pressed={settings.theme === 'light'}
            >
              <Sun className="h-5 w-5" aria-hidden="true" />
              <span>Light</span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                settings.theme === 'dark' 
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/80'
              }`}
              aria-pressed={settings.theme === 'dark'}
            >
              <Moon className="h-5 w-5" aria-hidden="true" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                settings.theme === 'system' 
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/80'
              }`}
              aria-pressed={settings.theme === 'system'}
            >
              <Laptop className="h-5 w-5" aria-hidden="true" />
              <span>System</span>
            </button>
          </div>
        </section>
        
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">Notifications</h3>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-700 dark:text-slate-300">Notify of Expiring Items</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={() => handleNotificationsChange(!settings.notifications)}
                className="sr-only peer"
                aria-label="Enable notifications for expiring items"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="mt-2">
            <label htmlFor="notification-timing" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notification Timing
            </label>
            <select
              id="notification-timing"
              value={settings.notificationTiming}
              onChange={(e) => handleNotificationTimingChange(Number(e.target.value))}
              className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 ${
                !settings.notifications ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!settings.notifications}
              aria-label="Select when to receive notifications before items expire"
            >
              <option value={3}>Default (3 days before)</option>
              <option value={7}>7 days before</option>
              <option value={14}>14 days before</option>
              <option value={30}>30 days before</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {settings.notifications 
                ? "You'll be notified when items are about to expire." 
                : "Enable notifications to get alerts about expiring items."}
            </p>
          </div>
        </section>
        
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">Dietary Preferences</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            These preferences will influence recipe suggestions.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.dietary.vegetarian}
                onChange={() => handleDietaryChange('vegetarian')}
                className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-300">Vegetarian</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.dietary.vegan}
                onChange={() => handleDietaryChange('vegan')}
                className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-300">Vegan</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.dietary.glutenFree}
                onChange={() => handleDietaryChange('glutenFree')}
                className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-300">Gluten Free</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.dietary.dairyFree}
                onChange={() => handleDietaryChange('dairyFree')}
                className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-300">Dairy Free</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;