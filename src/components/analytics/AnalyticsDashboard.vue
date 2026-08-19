<script setup lang="ts">
import { computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { PipelineStage, LeadSource } from '@/types/crm';
import {
  BarChart3,
  TrendingUp,
  PhoneCall,
  MessageCircle,
  DollarSign,
  Award,
  Users,
  ShieldCheck,
  Target,
  Flame
} from 'lucide-vue-next';

const store = useCRMStore();

const totalLeads = computed(() => store.leads.length);
const wonLeads = computed(() => store.leads.filter(l => l.stage === 'Won / Closed'));
const wonValue = computed(() => wonLeads.value.reduce((acc, l) => acc + (l.dealValue || 0), 0));
const totalPipelineValue = computed(() => store.leads.reduce((acc, l) => acc + (l.dealValue || 0), 0));
const winRate = computed(() => totalLeads.value ? Math.round((wonLeads.value.length / totalLeads.value) * 100) : 0);

const totalCallsLogged = computed(() => store.leads.reduce((acc, l) => acc + (l.totalCalls || 0), 0));
const totalWhatsAppLogged = computed(() => store.leads.reduce((acc, l) => acc + (l.totalWhatsApp || 0), 0));

// Source breakdown
const allSources: LeadSource[] = [
  'Google Maps',
  'Google Search / SERP',
  'LinkedIn',
  'Website',
  'Google Ads',
  'Meta Ads',
  'Referral',
  'Existing Database',
  'Other'
];

const sourceStats = computed(() => {
  return allSources.map(src => {
    const leadsInSource = store.leads.filter(l => l.leadSource === src);
    const wonInSource = leadsInSource.filter(l => l.stage === 'Won / Closed');
    const valInSource = leadsInSource.reduce((a, b) => a + (b.dealValue || 0), 0);
    return {
      source: src,
      count: leadsInSource.length,
      wonCount: wonInSource.length,
      value: valInSource,
      percent: totalLeads.value ? Math.round((leadsInSource.length / totalLeads.value) * 100) : 0
    };
  }).filter(s => s.count > 0).sort((a, b) => b.count - a.count);
});

// Stage breakdown
const stageOrder: PipelineStage[] = [
  'New Lead',
  'Call Attempted',
  'Contacted',
  'WhatsApp Sent',
  'Interested',
  'Follow-Up Required',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Won / Closed',
  'Lost'
];

const stageStats = computed(() => {
  return stageOrder.map(stg => {
    const count = store.leads.filter(l => l.stage === stg).length;
    const value = store.leads.filter(l => l.stage === stg).reduce((a, b) => a + (b.dealValue || 0), 0);
    return {
      stage: stg,
      count,
      value,
      percent: totalLeads.value ? Math.round((count / totalLeads.value) * 100) : 0
    };
  });
});

// Salesperson Leaderboard
const repLeaderboard = computed(() => {
  return store.salespersons.map(rep => {
    const repLeads = store.leads.filter(l => l.assignedSalesperson === rep.name);
    const wonRepLeads = repLeads.filter(l => l.stage === 'Won / Closed');
    const totalWonRevenue = wonRepLeads.reduce((a, b) => a + (b.dealValue || 0), 0);
    const callsMade = repLeads.reduce((a, b) => a + (b.totalCalls || 0), 0);
    const waMade = repLeads.reduce((a, b) => a + (b.totalWhatsApp || 0), 0);
    const compliance = repLeads.length > 0
      ? Math.round((repLeads.filter(l => store.checkLeadCompliance(l).isCompliant).length / repLeads.length) * 100)
      : 100;

    return {
      ...rep,
      totalLeads: repLeads.length,
      wonCount: wonRepLeads.length,
      revenue: totalWonRevenue,
      callsMade,
      waMade,
      compliance
    };
  }).sort((a, b) => b.revenue - a.revenue);
});
</script>

<template>
  <div class="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div>
        <h2 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Lead Generation & Sales Performance Analytics</span>
        </h2>
        <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Real-time metrics, conversion funnel attribution, outreach volume, and rep KPI leaderboards.</p>
      </div>

      <div class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 self-start sm:self-auto">
        <ShieldCheck class="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>{{ store.complianceRate }}% 5-Rule CRM Compliance</span>
      </div>
    </div>

    <!-- Top KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- Total Pipeline Value -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pipeline Value</div>
          <div class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ${{ totalPipelineValue.toLocaleString() }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">Across all active deal stages</div>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <DollarSign class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      <!-- Closed Revenue Won -->
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue Won</div>
          <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            ${{ wonValue.toLocaleString() }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">{{ wonLeads.length }} deals closed ({{ winRate }}% Win Rate)</div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
          <Award class="w-6 h-6" />
        </div>
      </div>

      <!-- Cold Calls Volume -->
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cold Calling Logs</div>
          <div class="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {{ totalCallsLogged }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">Logged calls with dispositions</div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
          <PhoneCall class="w-6 h-6" />
        </div>
      </div>

      <!-- WhatsApp Volume -->
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Touches</div>
          <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {{ totalWhatsAppLogged }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">Messages & profile deliveries</div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
          <MessageCircle class="w-6 h-6" />
        </div>
      </div>
    </div>

    <!-- Charts Row: Funnel Pipeline & Source Attribution -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- 11-Stage Pipeline Conversion Breakdown (7 Cols) -->
      <div class="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-indigo-500" />
            <span>11-Stage Pipeline Conversion Funnel</span>
          </h3>
          <span class="text-[11px] text-slate-400 font-medium">Stage Count & Deal Volume</span>
        </div>

        <div class="space-y-2.5">
          <div v-for="stg in stageStats" :key="stg.stage" class="space-y-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-700 dark:text-slate-300">{{ stg.stage }}</span>
              <div class="flex items-center gap-2 font-mono">
                <span class="text-slate-500">{{ stg.count }} leads</span>
                <span class="font-bold text-slate-900 dark:text-white">${{ stg.value.toLocaleString() }}</span>
              </div>
            </div>
            <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="stg.stage === 'Won / Closed' ? 'bg-emerald-500' : stg.stage === 'Lost' ? 'bg-slate-400' : 'bg-indigo-500'"
                :style="{ width: `${Math.max(stg.percent, 4)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lead Sources Attribution (5 Cols) -->
      <div class="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Target class="w-4 h-4 text-purple-500" />
            <span>Lead Source ROI & Volume</span>
          </h3>
          <span class="text-[11px] text-slate-400 font-medium">Acquisition channel</span>
        </div>

        <div class="space-y-3">
          <div v-for="src in sourceStats" :key="src.source" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
            <div class="flex items-center justify-between font-bold">
              <span class="text-slate-800 dark:text-slate-200">{{ src.source }}</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-mono">${{ src.value.toLocaleString() }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>{{ src.count }} leads captured</span>
              <span>{{ src.wonCount }} Won ({{ src.percent }}% share)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sales Reps Leaderboard -->
    <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Users class="w-4 h-4 text-indigo-500" />
          <span>Sales Team Performance Leaderboard</span>
        </h3>
        <span class="text-[11px] text-slate-400">Tracked by Won Revenue & Outreach Discipline</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[650px] text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th class="py-2.5 px-3">Salesperson</th>
              <th class="py-2.5 px-3">Role</th>
              <th class="py-2.5 px-3">Assigned Leads</th>
              <th class="py-2.5 px-3">Calls Made</th>
              <th class="py-2.5 px-3">WhatsApp Sent</th>
              <th class="py-2.5 px-3">5-Rule Discipline</th>
              <th class="py-2.5 px-3 text-right">Closed Won Revenue</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            <tr v-for="rep in repLeaderboard" :key="rep.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td class="py-3 px-3">
                <div class="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
                  <img :src="rep.avatar" class="w-6 h-6 rounded-full object-cover" />
                  <span>{{ rep.name }}</span>
                </div>
              </td>
              <td class="py-3 px-3 text-slate-500">{{ rep.role }}</td>
              <td class="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{{ rep.totalLeads }}</td>
              <td class="py-3 px-3 font-mono text-indigo-600 dark:text-indigo-400">{{ rep.callsMade }}</td>
              <td class="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400">{{ rep.waMade }}</td>
              <td class="py-3 px-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="rep.compliance >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'">
                  {{ rep.compliance }}%
                </span>
              </td>
              <td class="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                ${{ rep.revenue.toLocaleString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
