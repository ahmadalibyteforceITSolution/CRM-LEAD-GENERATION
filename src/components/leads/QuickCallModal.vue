<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { CallOutcome } from '@/types/crm';
import { getTodayString, getCurrentTimeString } from '@/utils/dateUtils';
import {
  PhoneCall,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
  Clock,
  UserCheck,
  User,
  Building,
  Calendar,
  AlertCircle
} from 'lucide-vue-next';

const store = useCRMStore();

const lead = computed(() => store.activeLead);

// Form state
const callDate = ref(getTodayString());
const callTime = ref(getCurrentTimeString());
const calledBy = ref(store.currentSalesperson);
const assignedTo = ref(lead.value?.assignedSalesperson || store.currentSalesperson);
const callAnswered = ref(true);
const decisionMakerAvailable = ref(true);
const selectedOutcomes = ref<CallOutcome[]>(['Answered', 'Interested']);
const callNotes = ref('');
const nextAction = ref('');
const nextFollowUpDate = ref(getTodayString());
const nextFollowUpTime = ref('15:00');

// Stopwatch state
const timerSeconds = ref(0);
const isTimerRunning = ref(false);
let timerInterval: any = null;

function toggleTimer() {
  if (isTimerRunning.value) {
    clearInterval(timerInterval);
    isTimerRunning.value = false;
  } else {
    isTimerRunning.value = true;
    timerInterval = setInterval(() => {
      timerSeconds.value++;
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning.value = false;
  timerSeconds.value = 0;
}

const formattedTimer = computed(() => {
  const mins = Math.floor(timerSeconds.value / 60);
  const secs = timerSeconds.value % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
});

const outcomeOptions: { label: string; value: CallOutcome }[] = [
  { label: 'Answered', value: 'Answered' },
  { label: 'Busy', value: 'Busy' },
  { label: 'Number Switched Off', value: 'Number Switched Off' },
  { label: 'Wrong Number', value: 'Wrong Number' },
  { label: 'Call Rejected', value: 'Call Rejected' },
  { label: 'No Response', value: 'No Response' },
  { label: 'Call Back Requested', value: 'Call Back Requested' },
  { label: 'Interested', value: 'Interested' },
  { label: 'Not Interested', value: 'Not Interested' }
];

function toggleOutcome(value: CallOutcome) {
  if (selectedOutcomes.value.includes(value)) {
    selectedOutcomes.value = selectedOutcomes.value.filter(o => o !== value);
  } else {
    selectedOutcomes.value.push(value);
    if (value === 'Answered') callAnswered.value = true;
    if (['Busy', 'Number Switched Off', 'No Response', 'Call Rejected'].includes(value)) {
      callAnswered.value = false;
    }
  }
}

// Quick follow-up presets
function setQuickFollowUp(offsetDays: number, timeStr: string, actionText: string) {
  const targetDate = new Date(Date.now() + offsetDays * 86400000);
  nextFollowUpDate.value = targetDate.toISOString().split('T')[0];
  nextFollowUpTime.value = timeStr;
  if (actionText) nextAction.value = actionText;
}

// Watch for lead changes
watch(
  () => store.activeLead,
  (newLead) => {
    if (newLead) {
      callDate.value = getTodayString();
      callTime.value = getCurrentTimeString();
      calledBy.value = store.currentSalesperson;
      assignedTo.value = newLead.assignedSalesperson || store.currentSalesperson;
      nextAction.value = newLead.nextAction || 'Send profile via WhatsApp & check-in';
      nextFollowUpDate.value = newLead.nextFollowUpDate || getTodayString();
      nextFollowUpTime.value = newLead.nextFollowUpTime || '15:00';
      callNotes.value = '';
      selectedOutcomes.value = ['Answered', 'Interested'];
      resetTimer();
    }
  },
  { immediate: true }
);

function handleSubmitCall() {
  if (!lead.value) return;

  store.logColdCall({
    leadId: lead.value.id,
    callDate: callDate.value,
    callTime: callTime.value,
    calledBy: calledBy.value,
    assignedTo: assignedTo.value,
    callDurationSeconds: timerSeconds.value,
    callAnswered: callAnswered.value,
    outcomes: selectedOutcomes.value,
    decisionMakerAvailable: decisionMakerAvailable.value,
    callNotes: callNotes.value.trim() || (callAnswered.value ? 'Call connected. Notes updated.' : 'Outreach attempt logged.'),
    nextAction: nextAction.value.trim() || 'Follow up with lead',
    nextFollowUpDate: nextFollowUpDate.value,
    nextFollowUpTime: nextFollowUpTime.value
  });

  resetTimer();
  store.isQuickCallModalOpen = false;
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div
    v-if="store.isQuickCallModalOpen && lead"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
            <PhoneCall class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold flex items-center gap-2">
              <span>Log Cold Call Record</span>
              <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/40 text-indigo-200">Interactive Logger</span>
            </h3>
            <p class="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span class="font-bold text-white">{{ lead.name }}</span>
              <span>•</span>
              <span>{{ lead.companyName }}</span>
              <a :href="'tel:' + lead.phoneNumber" class="text-indigo-300 underline font-mono ml-2 hover:text-white">
                {{ lead.phoneNumber }}
              </a>
            </p>
          </div>
        </div>

        <button
          @click="store.isQuickCallModalOpen = false"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <form @submit.prevent="handleSubmitCall" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs">
        <!-- Live Call Stopwatch Banner -->
        <div class="p-3.5 sm:p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :class="isTimerRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'"></div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Call Timer</span>
              <div class="text-xl sm:text-2xl font-mono font-extrabold text-white tracking-widest">{{ formattedTimer }}</div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <a
              :href="'tel:' + lead.phoneNumber"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 text-xs"
            >
              <PhoneCall class="w-3.5 h-3.5" />
              <span>Dial</span>
            </a>

            <button
              type="button"
              @click="toggleTimer"
              :class="[
                'px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs',
                isTimerRunning ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              ]"
            >
              <component :is="isTimerRunning ? Pause : Play" class="w-3.5 h-3.5" />
              <span>{{ isTimerRunning ? 'Pause' : 'Start' }}</span>
            </button>

            <button
              type="button"
              @click="resetTimer"
              class="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Reset Timer"
            >
              <RotateCcw class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Call Meta: Date, Time, Caller, Decision Maker -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Call Date</label>
            <input
              v-model="callDate"
              type="date"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Call Time</label>
            <input
              v-model="callTime"
              type="time"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Called By</label>
            <select
              v-model="calledBy"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option v-for="sp in store.salespersons" :key="sp.id" :value="sp.name">{{ sp.name }}</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned To</label>
            <select
              v-model="assignedTo"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option v-for="sp in store.salespersons" :key="sp.id" :value="sp.name">{{ sp.name }}</option>
            </select>
          </div>
        </div>

        <!-- Toggles: Call Answered & DM Available -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800 dark:text-slate-200">Call Answered?</span>
            <div class="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg">
              <button
                type="button"
                @click="callAnswered = true"
                :class="['px-3 py-1 rounded-md font-bold transition-all', callAnswered ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-800']"
              >
                Yes
              </button>
              <button
                type="button"
                @click="callAnswered = false"
                :class="['px-3 py-1 rounded-md font-bold transition-all', !callAnswered ? 'bg-rose-600 text-white shadow' : 'text-slate-500 hover:text-slate-800']"
              >
                No
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800 dark:text-slate-200">Decision Maker Available?</span>
            <div class="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg">
              <button
                type="button"
                @click="decisionMakerAvailable = true"
                :class="['px-3 py-1 rounded-md font-bold transition-all', decisionMakerAvailable ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-800']"
              >
                Yes
              </button>
              <button
                type="button"
                @click="decisionMakerAvailable = false"
                :class="['px-3 py-1 rounded-md font-bold transition-all', !decisionMakerAvailable ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-800']"
              >
                No
              </button>
            </div>
          </div>
        </div>

        <!-- Outcome Chips (PDF Specs) -->
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-2">
            Call Outcomes & Dispositions (Click to select)
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in outcomeOptions"
              :key="opt.value"
              type="button"
              @click="toggleOutcome(opt.value)"
              :class="[
                'px-3 py-1.5 rounded-xl font-semibold border transition-all text-xs flex items-center gap-1.5',
                selectedOutcomes.includes(opt.value)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              ]"
            >
              <span v-if="selectedOutcomes.includes(opt.value)">✓</span>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Call Notes -->
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Call Conversation Notes
          </label>
          <textarea
            v-model="callNotes"
            rows="3"
            placeholder="e.g. Spoke with decision maker. Expressed strong interest in lead automation, requested proposal by tomorrow 3 PM."
            class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400"
          ></textarea>
        </div>

        <!-- 5-Rule Mandatory Section: Next Action & Follow-Up -->
        <div class="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
              <CheckCircle2 class="w-4 h-4 text-indigo-600" />
              <span>Next Action & Follow-Up (Mandatory Rule)</span>
            </span>

            <!-- Quick Presets -->
            <div class="flex items-center gap-1 text-[10px]">
              <span class="text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                @click="setQuickFollowUp(0, '16:30', 'Afternoon Follow-up Call')"
                class="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-indigo-600 font-semibold"
              >
                Today PM
              </button>
              <button
                type="button"
                @click="setQuickFollowUp(1, '11:00', 'Follow up on proposal review')"
                class="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-indigo-600 font-semibold"
              >
                Tomorrow
              </button>
              <button
                type="button"
                @click="setQuickFollowUp(2, '14:00', 'Check in on quotation & scope')"
                class="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-indigo-600 font-semibold"
              >
                +2 Days
              </button>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Next Action</label>
            <input
              v-model="nextAction"
              type="text"
              placeholder="e.g. Send customized pricing proposal & schedule demo call"
              class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Next Follow-Up Date</label>
              <input
                v-model="nextFollowUpDate"
                type="date"
                class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Next Follow-Up Time</label>
              <input
                v-model="nextFollowUpTime"
                type="time"
                class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
          </div>
        </div>

        <!-- Submit Footer inside modal -->
        <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="store.isQuickCallModalOpen = false"
            class="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-6 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <CheckCircle2 class="w-4 h-4" />
            <span>Save Call Record & Timeline</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
