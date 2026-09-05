<script setup lang="ts">
import { ref } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import {
  Sparkles,
  PhoneCall,
  MessageCircle,
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  User,
  Building,
  Briefcase,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next';

const store = useCRMStore();

// 'login' | 'signup'
const authMode = ref<'login' | 'signup'>('login');

// Form state
const loginEmail = ref('');
const loginPassword = ref('');
const rememberMe = ref(true);
const showPassword = ref(false);

function handleForgotPassword() {
  window.alert('Please contact your CRM administrator to reset your password.');
}

// Sign up state
const signupName = ref('');
const signupCompanyName = ref('');
const signupEmail = ref('');
const signupRole = ref('Senior SDR / Closer');
const signupPassword = ref('');
const signupConfirmPassword = ref('');
const showSignupPassword = ref(false);
const termsAccepted = ref(true);

const localError = ref('');
const isSubmitting = ref(false);

const demoAccounts = [
  {
    name: 'SuperAdmin',
    email: 'admin@nexleads.io',
    role: 'SuperAdmin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Laiba Khan',
    email: 'salesspacesandplaces@gmail.com',
    role: 'Sales Operations Manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  }
];

async function handleLogin() {
  localError.value = '';
  if (!loginEmail.value.trim() || !loginPassword.value) {
    localError.value = 'Please enter both email and password';
    return;
  }

  isSubmitting.value = true;
  const success = await store.loginUser(loginEmail.value.trim(), loginPassword.value);
  isSubmitting.value = false;
  if (!success) {
    localError.value = store.authError || 'Invalid email or password';
  }
}

async function quickLogin(email: string, pass: string) {
  loginEmail.value = email;
  loginPassword.value = pass;
  await handleLogin();
}

async function handleSignup() {
  localError.value = '';
  if (!signupName.value.trim()) {
    localError.value = 'Please enter your full name';
    return;
  }
  if (!signupEmail.value.trim() || !signupEmail.value.includes('@')) {
    localError.value = 'Please enter a valid work email address';
    return;
  }
  if (signupPassword.value.length < 6) {
    localError.value = 'Password must be at least 6 characters long';
    return;
  }
  if (signupPassword.value !== signupConfirmPassword.value) {
    localError.value = 'Passwords do not match';
    return;
  }

  isSubmitting.value = true;
  const success = await store.registerUser({
    name: signupName.value.trim(),
    email: signupEmail.value.trim(),
    password: signupPassword.value,
    role: signupRole.value,
    companyName: signupCompanyName.value.trim() || 'NexLeads Agency'
  });
  isSubmitting.value = false;
  if (!success) {
    localError.value = store.authError || 'Failed to create account. Please try again.';
  }
}
</script>

<template>
  <div class="min-h-screen w-full bg-slate-950 text-slate-100 overflow-y-auto overflow-x-hidden selection:bg-indigo-500 selection:text-white py-6 sm:py-10 px-3 sm:px-6 flex flex-col justify-start sm:justify-center items-center relative">
    <!-- Ambient glowing backgrounds -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]"></div>
    </div>

    <!-- Main Card Container -->
    <div class="relative z-10 w-full max-w-5xl bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto">
      
      <!-- LEFT BRAND HERO (On mobile: compact header, on desktop: full feature showcase) -->
      <div class="lg:col-span-5 p-5 sm:p-8 lg:p-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between relative overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>

        <div class="relative z-10 space-y-4 sm:space-y-6">
          <!-- Logo & Brand Header -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <Sparkles class="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-lg sm:text-xl text-white tracking-tight">NexLeads</span>
                <span class="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">CRM PRO</span>
              </div>
              <p class="text-[11px] sm:text-xs text-slate-400 font-medium">B2B Lead Gen & Outreach Platform</p>
            </div>
          </div>

          <!-- Headline & Pitch (Compact on mobile, full on desktop) -->
          <div class="space-y-1 sm:space-y-2">
            <h1 class="text-base sm:text-xl lg:text-2xl font-black text-white leading-tight">
              High-Velocity Sales & Follow-Up Machine
            </h1>
            <p class="text-xs text-slate-400 leading-relaxed hidden sm:block">
              Automate cold calling logs, instant WhatsApp touchpoints, and maintain 100% 5-Golden-Rule compliance for your sales reps.
            </p>
          </div>

          <!-- Feature Highlights Checklist (Hidden on small mobile to keep form visible without endless scroll) -->
          <div class="space-y-2.5 pt-1 hidden md:block">
            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <PhoneCall class="w-4 h-4" />
              </div>
              <div class="text-xs">
                <strong class="text-white font-bold block">Interactive Cold Call Logger</strong>
                <span class="text-slate-400 text-[11px]">Live stopwatch, dispositions & instant notes</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <MessageCircle class="w-4 h-4" />
              </div>
              <div class="text-xs">
                <strong class="text-white font-bold block">1-Click WhatsApp Hub</strong>
                <span class="text-slate-400 text-[11px]">Personalized templates & direct wa.me launch</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
              <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck class="w-4 h-4" />
              </div>
              <div class="text-xs">
                <strong class="text-white font-bold block">5 Golden Rules Compliance</strong>
                <span class="text-slate-400 text-[11px]">Zero dropped leads & automated smart queues</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom status tag -->
        <div class="relative z-10 pt-3 lg:pt-6 border-t border-slate-800/80 mt-3 lg:mt-6 flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>MongoDB Atlas Active</span>
          </div>
          <span class="font-bold text-slate-300">v2.5 CRM</span>
        </div>
      </div>

      <!-- RIGHT AUTH FORM PANEL (7 Cols on Desktop) -->
      <div class="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-between bg-slate-900/50 space-y-6">
        <div>
          <!-- Top Auth Mode Tabs & Instant Demo Mode Button -->
          <div class="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 pb-4 mb-5">
            <div class="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                @click="authMode = 'login'; localError = ''"
                :class="[
                  'px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                Sign In
              </button>
              <button
                type="button"
                @click="authMode = 'signup'; localError = ''"
                :class="[
                  'px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  authMode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                Create Account
              </button>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div
            v-if="localError"
            class="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in"
          >
            <AlertCircle class="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{{ localError }}</span>
          </div>

          <!-- ==================== SIGN IN FORM ==================== -->
          <form v-if="authMode === 'login'" @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Work Email Address</label>
              <div class="relative">
                <Mail class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="loginEmail"
                  type="email"
                  placeholder="name@company.com"
                  required
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold text-slate-300">Password</label>
                <a href="#" @click.prevent="handleForgotPassword()" class="text-[11px] text-indigo-400 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div class="relative">
                <Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="loginPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="������������"
                  required
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs pt-0.5">
              <label class="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input type="checkbox" v-model="rememberMe" class="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500" />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] mt-2"
            >
              <span>{{ isSubmitting ? 'Authenticating...' : 'Sign In to Workspace' }}</span>
              <ArrowRight class="w-4 h-4" />
            </button>

            <!-- 1-Click Quick Login Accounts -->
            <div class="pt-3 border-t border-slate-800/80 space-y-2">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                Or 1-Click Quick Login
              </div>
              <div class="grid grid-cols-2 gap-2">
                <!-- Laiba Khan Quick Login -->
                <button
                  type="button"
                  @click="quickLogin('salesspacesandplaces@gmail.com', 'Laiba1234')"
                  class="p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/60 text-left transition-all flex items-center gap-2 group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                    class="w-7 h-7 rounded-full object-cover border border-emerald-500/40 flex-shrink-0"
                  />
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-white group-hover:text-emerald-400 truncate">Laiba Khan</div>
                    <div class="text-[10px] text-slate-400 truncate">Sales Ops Manager</div>
                  </div>
                </button>

                <!-- SuperAdmin Quick Login -->
                <button
                  type="button"
                  @click="quickLogin('admin@nexleads.io', 'password123')"
                  class="p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/60 text-left transition-all flex items-center gap-2 group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
                    class="w-7 h-7 rounded-full object-cover border border-indigo-500/40 flex-shrink-0"
                  />
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-white group-hover:text-indigo-400 truncate">SuperAdmin</div>
                    <div class="text-[10px] text-slate-400 truncate">Agency Owner</div>
                  </div>
                </button>
              </div>
            </div>
          </form>

          <!-- ==================== SIGN UP FORM ==================== -->
          <form v-else-if="authMode === 'signup'" @submit.prevent="handleSignup" class="space-y-3.5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                <div class="relative">
                  <User class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="signupName"
                    type="text"
                    placeholder="e.g. Tariq Mehmood"
                    required
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Company / Agency</label>
                <div class="relative">
                  <Building class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="signupCompanyName"
                    type="text"
                    placeholder="e.g. Apex Media Agency"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Work Email</label>
                <div class="relative">
                  <Mail class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="signupEmail"
                    type="email"
                    placeholder="name@company.com"
                    required
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Sales Role</label>
                <div class="relative">
                  <Briefcase class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    v-model="signupRole"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    <option value="Senior SDR / Closer">Senior SDR / Closer</option>
                    <option value="Account Executive">Account Executive</option>
                    <option value="Lead Generation Specialist">Lead Generation Specialist</option>
                    <option value="Sales Operations Manager">Sales Operations Manager</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Create Password</label>
                <div class="relative">
                  <Lock class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="signupPassword"
                    :type="showSignupPassword ? 'text' : 'password'"
                    placeholder="Min 6 characters"
                    required
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <button
                    type="button"
                    @click="showSignupPassword = !showSignupPassword"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <component :is="showSignupPassword ? EyeOff : Eye" class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Confirm Password</label>
                <div class="relative">
                  <Lock class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="signupConfirmPassword"
                    :type="showSignupPassword ? 'text' : 'password'"
                    placeholder="Repeat password"
                    required
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>
            </div>

            <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-400 pt-1">
              <input type="checkbox" v-model="termsAccepted" class="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500" required />
              <span>I agree to CRM standard protocols & 5 Golden Rules tracking</span>
            </label>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99] mt-2"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>{{ isSubmitting ? 'Creating Account...' : 'Complete Registration & Open CRM' }}</span>
            </button>
          </form>
        </div>

        <!-- Footer terms -->
        <div class="pt-4 text-center text-[11px] text-slate-500">
          <span>Protected by Enterprise Encryption � NexLeads Multi-Tenant CRM</span>
        </div>
      </div>
    </div>
  </div>
</template>
