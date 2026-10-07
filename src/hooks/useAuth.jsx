/**
 * Authentication Context Provider
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Production-ready auth:
 *  - Firebase Auth real login/signup
 *  - New user data stored in Firestore 'users' collection
 *  - Admin-assigned roles + per-user tab visibility (allowedTabs)
 *  - New accounts start as Customer until an owner assigns a staff role
 *  - Demo fallback for development/testing
 */

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, isDemoMode } from '../firebase/config';
import { initializeFirebaseDataSync } from '../services/dataService';
import { ROLES, DEFAULT_ROLE_PERMISSIONS } from '../constants/roles';
import { AUTH_STATE } from '../constants/statuses';
import { requestNotificationPermission } from '../services/notificationService';

// Demo Users for testing (only used when Firebase auth fails)
const DEMO_USERS = {
  'owner@thebharmalskitchen.com': {
    uid: 'demo_owner_01',
    email: 'owner@thebharmalskitchen.com',
    displayName: 'Mustafa Bharmal (Owner)',
    role: ROLES.OWNER,
    organizationId: 'tbk_org_01',
    branchId: 'BRN-01',
  },
  'admin@thebharmalskitchen.com': {
    uid: 'demo_admin_01',
    email: 'admin@thebharmalskitchen.com',
    displayName: 'Mustafa Bharmal (Admin)',
    role: ROLES.OWNER,
    organizationId: 'tbk_org_01',
    branchId: 'BRN-01',
  },
  'chef@thebharmalskitchen.com': {
    uid: 'demo_chef_01',
    email: 'chef@thebharmalskitchen.com',
    displayName: 'Chef Aslam Qureshi',
    role: ROLES.CHEF,
    organizationId: 'tbk_org_01',
    branchId: 'BRN-01',
  },
  'cashier@thebharmalskitchen.com': {
    uid: 'demo_cashier_01',
    email: 'cashier@thebharmalskitchen.com',
    displayName: 'Salman Mansoori',
    role: ROLES.CASHIER,
    organizationId: 'tbk_org_01',
    branchId: 'BRN-01',
  },
  'waiter@thebharmalskitchen.com': {
    uid: 'demo_waiter_01',
    email: 'waiter@thebharmalskitchen.com',
    displayName: 'Imran Shaikh',
    role: ROLES.WAITER,
    organizationId: 'tbk_org_01',
    branchId: 'BRN-01',
  },
  'customer@thebharmalskitchen.com': {
    uid: 'demo_customer_01',
    email: 'customer@thebharmalskitchen.com',
    displayName: 'Demo Customer',
    role: ROLES.CUSTOMER,
    organizationId: 'tbk_org_01',
    branchId: 'BRN-01',
    allowedTabs: [],
  },
};

// ─── State Shape ───────────────────────────────────────────
const initialState = {
  authState: AUTH_STATE.LOGGED_OUT,
  user: null,
  userProfile: null,
  organizationId: null,
  branchId: null,
  role: null,
  permissions: [],
  allowedTabs: null, // null = all tabs visible; array = restricted
  loading: true,
  error: null,
  isDemoSession: false,
};

// ─── Reducer ───────────────────────────────────────────────
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  SIGN_OUT: 'SIGN_OUT',
  SET_PROFILE: 'SET_PROFILE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_BRANCH: 'SET_BRANCH',
};

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case AUTH_ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        authState: AUTH_STATE.AUTHENTICATED,
        user: action.payload.user,
        userProfile: action.payload.profile,
        organizationId: action.payload.profile?.organizationId || 'tbk_org_01',
        branchId: action.payload.profile?.branchId || 'BRN-01',
        role: action.payload.profile?.role || ROLES.CUSTOMER,
        permissions: action.payload.permissions || DEFAULT_ROLE_PERMISSIONS[ROLES.CUSTOMER] || [],
        allowedTabs: action.payload.profile?.allowedTabs || null,
        isDemoSession: !!action.payload.isDemoSession,
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.AUTH_FAILURE:
      return {
        ...state,
        authState: AUTH_STATE.LOGGED_OUT,
        user: null,
        userProfile: null,
        organizationId: null,
        branchId: null,
        role: null,
        permissions: [],
        allowedTabs: null,
        loading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.SIGN_OUT:
      return { ...initialState, loading: false };

    case AUTH_ACTIONS.SET_PROFILE:
      return {
        ...state,
        userProfile: action.payload.profile,
        role: action.payload.profile?.role || state.role,
        permissions: action.payload.permissions || state.permissions,
        allowedTabs: action.payload.profile?.allowedTabs || state.allowedTabs,
        organizationId: action.payload.profile?.organizationId || state.organizationId,
        branchId: action.payload.profile?.branchId || state.branchId,
      };

    case AUTH_ACTIONS.SET_BRANCH:
      return { ...state, branchId: action.payload };

    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore demo session from localStorage
  useEffect(() => {
    const savedDemo = isDemoMode ? localStorage.getItem('tbk_demo_user') : null;
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        if (!Object.values(DEMO_USERS).some((user) => user.uid === parsed.uid) && parsed.role !== ROLES.CUSTOMER) {
          localStorage.removeItem('tbk_demo_user');
          dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
          return;
        }
        const permissions = DEFAULT_ROLE_PERMISSIONS[parsed.role] || [];
        dispatch({
          type: AUTH_ACTIONS.AUTH_SUCCESS,
          payload: {
            user: { uid: parsed.uid, email: parsed.email, displayName: parsed.displayName },
            profile: parsed,
            permissions,
            isDemoSession: true,
          },
        });
        return;
      } catch (e) {
        localStorage.removeItem('tbk_demo_user');
      }
    }

    if (isDemoMode) {
      dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
      return;
    }

    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          prepareLocalCacheForUser(firebaseUser.uid);
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const profile = { id: userDoc.id, ...userDoc.data() };

            if (profile.status !== 'active') {
              await firebaseSignOut(auth);
              dispatch({
                type: AUTH_ACTIONS.AUTH_FAILURE,
                payload: 'Your account is not active. Contact the administrator.',
              });
              return;
            }

            // Update last login
            updateDoc(userDocRef, { lastLogin: serverTimestamp() }).catch(() => {});

            const permissions = getUserPermissions(profile);
            dispatch({
              type: AUTH_ACTIONS.AUTH_SUCCESS,
              payload: { user: firebaseUser, profile, permissions, isDemoSession: false },
            });
            startProfileListener(firebaseUser.uid, dispatch);
          } else {
            // New accounts cannot assign themselves staff access.
            const newProfile = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              role: ROLES.CUSTOMER,
              status: 'active',
              allowedTabs: [],
              organizationId: 'tbk_org_01',
              branchId: 'BRN-01',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            };

            await setDoc(userDocRef, newProfile);
            saveUserToLocalList(newProfile);

            const permissions = getUserPermissions(newProfile);
            dispatch({
              type: AUTH_ACTIONS.AUTH_SUCCESS,
              payload: {
                user: firebaseUser,
                profile: { id: firebaseUser.uid, ...newProfile },
                permissions,
                isDemoSession: false,
              },
            });
            startProfileListener(firebaseUser.uid, dispatch);
          }
        } catch (err) {
          console.warn('Auth profile fetch failed:', err.message);
          await firebaseSignOut(auth).catch(() => {});
          dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: 'Unable to load your user profile. Please try again.' });
        }

        requestNotificationPermission();
      } else {
        clearLocalCache();
        dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
      }
    });

    return () => {
      unsubscribe();
      profileUnsubscribe?.();
      profileUnsubscribe = null;
    };
  }, []);

  // Start cloud data sync only after a real user has authenticated.
  useEffect(() => {
    if (!db || !state.user || state.isDemoSession || state.role === ROLES.CUSTOMER) return;
    let cancelled = false;
    let stopSync = () => {};
    initializeFirebaseDataSync(() => cancelled, state.role).then((unsubscribe) => {
      if (cancelled) unsubscribe?.();
      else stopSync = unsubscribe || stopSync;
    }).catch((err) => console.warn('Firebase data sync failed:', err));
    return () => {
      cancelled = true;
      stopSync();
    };
  }, [state.user, state.isDemoSession, state.role]);

  // ─── Auth Methods ──────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    if (isDemoMode) {
      const message = 'Use a Quick Demo button to enter local demo mode.';
      dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: message });
      throw new Error(message);
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem('tbk_demo_user');
    } catch (err) {
      console.warn('Firebase signIn notice:', err.code, err.message);

      const message = getAuthErrorMessage(err.code);
      dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: message });
      throw new Error(message);
    }
  }, []);

  const loginDemo = useCallback((roleType = 'owner') => {
    if (!isDemoMode) return;
    let selected = DEMO_USERS['owner@thebharmalskitchen.com'];
    if (roleType === 'chef') selected = DEMO_USERS['chef@thebharmalskitchen.com'];
    if (roleType === 'cashier') selected = DEMO_USERS['cashier@thebharmalskitchen.com'];
    if (roleType === 'waiter') selected = DEMO_USERS['waiter@thebharmalskitchen.com'];
    if (roleType === 'customer') selected = DEMO_USERS['customer@thebharmalskitchen.com'];

    localStorage.setItem('tbk_demo_user', JSON.stringify(selected));
    const permissions = DEFAULT_ROLE_PERMISSIONS[selected.role] || DEFAULT_ROLE_PERMISSIONS[ROLES.OWNER] || [];
    dispatch({
      type: AUTH_ACTIONS.AUTH_SUCCESS,
      payload: {
        user: { uid: selected.uid, email: selected.email, displayName: selected.displayName },
        profile: selected,
        permissions,
        isDemoSession: true,
      },
    });
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    if (isDemoMode) {
      const message = 'Account creation requires Firebase mode. Use the Customer demo button.';
      dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: message });
      throw new Error(message);
    }
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      // The onAuthStateChanged listener handles the rest:
      //  - Creates Firestore doc
      //  - Starts with Customer access until the owner assigns a staff role
    } catch (err) {
      console.warn('Firebase signUp fallback notice:', err.code);

      const message = getAuthErrorMessage(err.code);
      dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: message });
      throw new Error(message);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (isDemoMode) throw new Error('Google sign-in requires Firebase mode.');
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      localStorage.removeItem('tbk_demo_user');
      return result.user;
    } catch (err) {
      console.warn('Google sign-in fallback notice:', err.code, err.message);

      const message = getAuthErrorMessage(err.code);
      dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: message });
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      profileUnsubscribe?.();
      profileUnsubscribe = null;
      clearLocalCache();
      dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
      if (auth) {
        await firebaseSignOut(auth).catch(() => {});
      }
      return true;
    } catch (err) {
      clearLocalCache();
      dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
      return true;
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (isDemoMode) throw new Error('Password reset requires Firebase mode.');
    await sendPasswordResetEmail(auth, email);
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (!state.permissions) return true;
      return state.permissions.includes(permission);
    },
    [state.permissions]
  );

  const hasAnyPermission = useCallback(
    (permissionsList) => {
      if (!state.permissions) return true;
      return permissionsList.some((p) => state.permissions.includes(p));
    },
    [state.permissions]
  );

  const hasAllPermissions = useCallback(
    (permissionsList) => {
      if (!state.permissions) return true;
      return permissionsList.every((p) => state.permissions.includes(p));
    },
    [state.permissions]
  );

  /**
   * Check if a navigation tab is visible to the current user.
   * If allowedTabs is null/undefined, all tabs are visible (Owner/Admin default).
   */
  const isTabAllowed = useCallback(
    (tabId) => {
      // Owner/Admin always see everything
      if (state.role === ROLES.OWNER || state.role === ROLES.ADMIN) return true;
      if (!state.allowedTabs) return true; // No restriction set
      if (state.allowedTabs.includes(tabId)) return true;
      const parentId = tabId.split('-')[0];
      if (state.allowedTabs.includes(parentId)) return true;
      if (state.allowedTabs.some((t) => t.startsWith(`${tabId}-`))) return true;
      return false;
    },
    [state.allowedTabs, state.role]
  );

  const switchBranch = useCallback((newBranchId) => {
    dispatch({ type: AUTH_ACTIONS.SET_BRANCH, payload: newBranchId });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const isCustomer = !state.role || state.role === ROLES.CUSTOMER || !Object.values(ROLES).includes(state.role);

  const value = {
    ...state,
    signIn,
    signInWithGoogle,
    loginDemo,
    signUp,
    signOut,
    resetPassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isTabAllowed,
    switchBranch,
    clearError,
    isCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Helpers ───────────────────────────────────────────────

function clearLocalCache() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('tbk_')) localStorage.removeItem(key);
  }
}

function prepareLocalCacheForUser(uid) {
  if (localStorage.getItem('tbk_cache_user_uid') !== uid) {
    clearLocalCache();
    localStorage.setItem('tbk_cache_user_uid', uid);
  }
}

function getUserPermissions(profile) {
  if (!profile?.role) return [];
  return DEFAULT_ROLE_PERMISSIONS[profile.role] || DEFAULT_ROLE_PERMISSIONS[ROLES.STAFF] || [];
}

function saveUserToLocalList(userObj) {
  try {
    const raw = localStorage.getItem('tbk_users');
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(
      (u) =>
        (u.email && u.email.toLowerCase() === userObj.email?.toLowerCase()) ||
        u.id === userObj.id ||
        u.uid === userObj.uid
    );
    const entry = {
      id: userObj.uid || userObj.id || `USR-${Date.now().toString().slice(-4)}`,
      name: userObj.displayName || userObj.name || userObj.email.split('@')[0],
      email: userObj.email,
      role: userObj.role || 'Awaiting Role',
      status: userObj.status || 'awaiting_role',
      allowedTabs: userObj.allowedTabs || ['dashboard'],
      lastLogin: 'Just now',
    };
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.push(entry);
    }
    localStorage.setItem('tbk_users', JSON.stringify(list));
  } catch (e) {
    console.warn('saveUserToLocalList error:', e.message);
  }
}

let profileUnsubscribe = null;

function startProfileListener(uid, dispatch) {
  if (profileUnsubscribe) profileUnsubscribe();

  try {
    profileUnsubscribe = onSnapshot(
      doc(db, 'users', uid),
      async (docSnap) => {
        if (docSnap.exists()) {
          const profile = { id: docSnap.id, ...docSnap.data() };
          if (profile.status !== 'active') {
            clearLocalCache();
            await firebaseSignOut(auth).catch(() => {});
            return;
          }
          const permissions = getUserPermissions(profile);
          dispatch({
            type: AUTH_ACTIONS.SET_PROFILE,
            payload: { profile, permissions },
          });
        }
      },
      (err) => {
        // quiet fallback
      }
    );
  } catch (e) {
    // quiet fallback
  }
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/user-not-found': 'No account found with this email. Create one first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network connection issue. Check your internet.',
    'auth/user-disabled': 'This account has been disabled. Contact admin.',
    'auth/invalid-credential': 'Invalid email or password. Check that this account exists in Firebase Authentication.',
    'auth/invalid-api-key': 'Firebase configuration error. Contact admin.',
    'auth/api-key-not-valid': 'Firebase API Key not valid. Contact admin.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Authentication.',
    'auth/configuration-not-found': 'Firebase Authentication is not configured for this project. Enable the sign-in method in Firebase Console.',
    'auth/unauthorized-domain': 'This domain is not authorized for Firebase Authentication. Add it in Firebase Console.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled. Try again when you are ready.',
    'auth/account-exists-with-different-credential': 'An account with this email uses a different sign-in method.',
  };
  return messages[code] || `Firebase sign-in failed (${code || 'unknown error'}). Check your Authentication settings and try again.`;
}

export default AuthProvider;
