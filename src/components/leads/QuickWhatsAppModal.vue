<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { getTodayString, getCurrentTimeString } from '@/utils/dateUtils';
import {
  WHATSAPP_TEMPLATES,
  fillWhatsAppTemplate,
  generateWhatsAppLink,
  WhatsAppTemplate
} from '@/utils/whatsappTemplates';
import {
  MessageCircle,
  ExternalLink,
  Send,
  FileText,
  PhoneCall,
  CheckCheck,
  Check,
  Calendar,
  Clock,
  X,
  Sparkles,
  Paperclip,
  CheckCircle2
} from 'lucide-vue-next';

const store = useCRMStore();
const lead = computed(() => store.activeLead);

// Form state
const messageSentDate = ref(getTodayString());
const messageSentTime = ref(getCurrentTimeString());
const messageSent = ref(true);
const messageRead = ref(false);
const customerReplied = ref(false);
const whatsAppCallMade = ref(false);
const whatsAppCallAttended = ref(false);
const documentsSent = ref(false);
const proposalSent = ref(false);
const followUpRequired = ref(true);
const conversationNotes = ref('');
const nextFollowUpDate = ref(getTodayString());
const nextFollowUpTime = ref('16:00');

// WhatsApp Template Selection
const selectedTemplateId = ref<string>('intro-formal');
const customMessageText = ref<string>('');

const currentTemplate = computed(() => {
  return WHATSAPP_TEMPLATES.find(t => t.id === selectedTemplateId.value) || WHATSAPP_TEMPLATES[0];
});

function applyTemplate(tmpl: WhatsAppTemplate) {
  selectedTemplateId.value = tmpl.id;
  if (lead.value) {
    customMessageText.value = fillWhatsAppTemplate(
      tmpl.text,
      {
        name: lead.value.name,
        companyName: lead.value.companyName,
        industry: lead.value.industry,
        serviceRequired: lead.value.serviceRequired
      },
      store.currentSalesperson
    );
  }
}

// Direct WhatsApp URL
const directWhatsAppLink = computed(() => {
  if (!lead.value || !lead.value.whatsAppNumber) return '#';
  return generateWhatsAppLink(lead.value.whatsAppNumber, customMessageText.value);
});

function openWhatsAppWeb() {
  if (directWhatsAppLink.value !== '#') {
    window.open(directWhatsAppLink.value, '_blank');
    messageSent.value = true;
  }
}

// Presets
function setQuickFollowUp(offsetDays: number, timeStr: string, actionNote: string) {
  const targetDate = new Date(Date.now() + offsetDays * 86400000);
  nextFollowUpDate.value = targetDate.toISOString().split('T')[0];
  nextFollowUpTime.value = timeStr;
  if (actionNote && !conversationNotes.value) {
    conversationNotes.value = actionNote;
  }
}

watch(
  () => store.activeLead,
  (newLead) => {
    if (newLead) {
      messageSentDate.value = getTodayString();
      messageSentTime.value = getCurrentTimeString();
      messageSent.value = true;
      messageRead.value = false;
      customerReplied.value = false;
      whatsAppCallMade.value = false;
      whatsAppCallAttended.value = false;
      documentsSent.value = false;
      proposalSent.value = false;
      followUpRequired.value = true;
      conversationNotes.value = '';
      nextFollowUpDate.value = newLead.nextFollowUpDate || getTodayString();
      nextFollowUpTime.value = newLead.nextFollowUpTime || '16:00';
      applyTemplate(currentTemplate.value);
    }
  },
  { immediate: true }
);

function handleSubmitWhatsApp() {
  if (!lead.value) return;

  store.logWhatsApp({
    leadId: lead.value.id,
    messageSent: messageSent.value,
    messageSentDate: messageSentDate.value,
    messageSentTime: messageSentTime.value,
    messageRead: messageRead.value,
    customerReplied: customerReplied.value,
    whatsAppCallMade: whatsAppCallMade.value,
    whatsAppCallAttended: whatsAppCallAttended.value,
    documentsSent: documentsSent.value,
    proposalSent: proposalSent.value,
    followUpRequired: followUpRequired.value,
    conversationNotes: conversationNotes.value.trim() || `WhatsApp outreach logged. Sent message: "${customMessageText.value.slice(0, 60)}..."`,
    nextFollowUpDate: nextFollowUpDate.value,
    nextFollowUpTime: nextFollowUpTime.value,
    templateUsed: currentTemplate.value.title
  });

  store.isQuickWhatsAppModalOpen = false;
}
</script>

<template>
  <div
    v-if="store.isQuickWhatsAppModalOpen && lead"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <MessageCircle class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold flex items-center gap-2">
              <span>WhatsApp Communication & Follow-Up Hub</span>
              <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200">wa.me Integration</span>
            </h3>
            <p class="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span class="font-bold text-white">{{ lead.name }}</span>
              <span>•</span>
              <span>{{ lead.companyName }}</span>
              <span class="text-emerald-300 font-mono font-bold">
                {{ lead.whatsAppNumber || lead.phoneNumber || 'No number specified' }}
              </span>
            </p>
          </div>
        </div>

        <button
          @click="store.isQuickWhatsAppModalOpen = false"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <form @submit.prevent="handleSubmitWhatsApp" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs">
        <!-- Quick WhatsApp Launcher & Template Selector -->
        <div class="p-3.5 sm:p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-3">
          <div class="flex items-center justify-between">
            <label class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Sparkles class="w-4 h-4 text-emerald-600" />
              <span>Select High-Converting WhatsApp Template</span>
            </label>
            <span class="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium hidden sm:inline">Auto-populates contact details</span>
          </div>

          <!-- Template Pills -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="tmpl in WHATSAPP_TEMPLATES"
              :key="tmpl.id"
              type="button"
              @click="applyTemplate(tmpl)"
              :class="[
                'p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between h-14',
                selectedTemplateId === tmpl.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              ]"
            >
              <div class="font-bold truncate text-[11px]">{{ tmpl.title }}</div>
              <div class="text-[9px] opacity-80 uppercase font-semibold">{{ tmpl.category }}</div>
            </button>
          </div>

          <!-- Message Box -->
          <div>
            <textarea
              v-model="customMessageText"
              rows="3"
              class="w-full bg-white dark:bg-slate-800 border border-emerald-300/80 dark:border-emerald-700/80 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500/20 font-sans"
              placeholder="Type or customize your WhatsApp message..."
            ></textarea>
          </div>

          <!-- 1-Click Launch Button -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div class="text-[11px] text-slate-500 flex items-center gap-1">
              <ExternalLink class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Opens WhatsApp Web or App directly</span>
            </div>

            <button
              type="button"
              @click="openWhatsAppWeb"
              :disabled="!lead.whatsAppNumber"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all active:scale-95 text-xs"
            >
              <MessageCircle class="w-4 h-4" />
              <span>Launch in WhatsApp Now</span>
            </button>
          </div>
        </div>

        <!-- Tracking Checkboxes & Status Indicators (PDF Requirements) -->
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-2">
            Track Communication Status
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <!-- Message Sent -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="messageSent" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200">Message Sent</span>
            </label>

            <!-- Message Read -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="messageRead" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <CheckCheck class="w-3.5 h-3.5 text-sky-500" />
                <span>Message Read</span>
              </span>
            </label>

            <!-- Customer Replied -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="customerReplied" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <span>💬 Replied</span>
              </span>
            </label>

            <!-- Proposal Sent -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="proposalSent" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <FileText class="w-3.5 h-3.5 text-indigo-500" />
                <span>Proposal Sent</span>
              </span>
            </label>

            <!-- Company Profile / Docs Sent -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="documentsSent" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <Paperclip class="w-3.5 h-3.5 text-slate-500" />
                <span>Profile/Docs Sent</span>
              </span>
            </label>

            <!-- WhatsApp Call Made -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="whatsAppCallMade" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200">WA Call Made</span>
            </label>

            <!-- WhatsApp Call Attended -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="whatsAppCallAttended" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200">WA Call Attended</span>
            </label>

            <!-- Follow-up Required -->
            <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-colors">
              <input type="checkbox" v-model="followUpRequired" class="rounded text-emerald-600 focus:ring-emerald-500" />
              <span class="font-semibold text-slate-700 dark:text-slate-200">Follow-Up Required</span>
            </label>
          </div>
        </div>

        <!-- Meta Timing -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Message Sent Date</label>
            <input
              v-model="messageSentDate"
              type="date"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Message Sent Time</label>
            <input
              v-model="messageSentTime"
              type="time"
              class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Conversation Notes</label>
          <textarea
            v-model="conversationNotes"
            rows="2"
            placeholder="e.g. Sent brochure and pricing tier. Tariq confirmed he will review this afternoon."
            class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500/20"
          ></textarea>
        </div>

        <!-- Next Follow-up Scheduler (5-Rules) -->
        <div class="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Calendar class="w-4 h-4 text-emerald-600" />
              <span>Next Follow-Up Date & Time</span>
            </span>

            <div class="flex items-center gap-1 text-[10px]">
              <span class="text-slate-400">Presets:</span>
              <button
                type="button"
                @click="setQuickFollowUp(0, '17:00', 'Evening WhatsApp check-in')"
                class="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 font-semibold"
              >
                Today 5pm
              </button>
              <button
                type="button"
                @click="setQuickFollowUp(1, '12:00', 'Midday Follow-up message')"
                class="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 font-semibold"
              >
                Tomorrow Noon
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Next Follow-Up Date</label>
              <input
                v-model="nextFollowUpDate"
                type="date"
                class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Next Follow-Up Time</label>
              <input
                v-model="nextFollowUpTime"
                type="time"
                class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="store.isQuickWhatsAppModalOpen = false"
            class="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-6 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2"
          >
            <CheckCircle2 class="w-4 h-4" />
            <span>Save WhatsApp Record & Timeline</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
