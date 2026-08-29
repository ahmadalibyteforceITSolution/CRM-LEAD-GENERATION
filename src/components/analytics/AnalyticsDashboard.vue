<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import { PipelineStage, LeadSource, LeadPriority } from '@/types/crm';
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
  Flame,
  PieChart,
  Activity,
  Layers,
  Filter,
  CheckCircle2
} from 'lucide-vue-next';

// Chart.js & vue-chartjs imports
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'vue-chartjs';

// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Filler
);

const store = useCRMStore();

// Selected Filters
const selectedRepFilter = ref<string>('all');
const pipelineMetricType = ref<'count' | 'value'>('count');
const activityTimeframe = ref<'7days' | 'all'>('7days');

// Filtered leads based on selected rep
const filteredLeads = computed(() => {
  if (store.currentUser && store.currentUser.role !== 'SuperAdmin' && store.currentUser.role !== 'Admin') {
    return store.leads.filter(l => l.assignedSalesperson === store.currentUser?.name);
  }
  if (selectedRepFilter.value === 'all') {
    return store.leads;
  }
  return store.leads.filter(l => l.assignedSalesperson === selectedRepFilter.value);
});

// Top Metrics
const totalLeads = computed(() => filteredLeads.value.length);
const wonLeads = computed(() => filteredLeads.value.filter(l => l.stage === 'Won / Closed'));
const wonValue = computed(() => wonLeads.value.reduce((acc, l) => acc + (l.dealValue || 0), 0));
const totalPipelineValue = computed(() => filteredLeads.value.reduce((acc, l) => acc + (l.dealValue || 0), 0));
const winRate = computed(() => totalLeads.value ? Math.round((wonLeads.value.length / totalLeads.value) * 100) : 0);
const avgDealValue = computed(() => wonLeads.value.length ? Math.round(wonValue.value / wonLeads.value.length) : 0);

const totalCallsLogged = computed(() => filteredLeads.value.reduce((acc, l) => acc + (l.totalCalls || 0), 0));
const totalWhatsAppLogged = computed(() => filteredLeads.value.reduce((acc, l) => acc + (l.totalWhatsApp || 0), 0));

// --- 1. Pipeline Funnel (Bar Chart) Data & Options ---
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
    const leadsInStage = filteredLeads.value.filter(l => l.stage === stg);
    const count = leadsInStage.length;
    const value = leadsInStage.reduce((a, b) => a + (b.dealValue || 0), 0);
    return {
      stage: stg,
      count,
      value
    };
  });
});

const pipelineChartData = computed(() => {
  const labels = stageOrder.map(s => s.replace(' / ', '/'));
  const isCount = pipelineMetricType.value === 'count';
  const data = stageStats.value.map(s => isCount ? s.count : s.value);
  
  const backgroundColors = stageOrder.map(s => {
    if (s === 'Won / Closed') return 'rgba(16, 185, 129, 0.85)'; // emerald
    if (s === 'Lost') return 'rgba(148, 163, 184, 0.7)'; // slate
    if (s === 'Interested' || s === 'Meeting Scheduled') return 'rgba(99, 102, 241, 0.85)'; // indigo
    if (s === 'Proposal Sent' || s === 'Negotiation') return 'rgba(168, 85, 247, 0.85)'; // purple
    return 'rgba(59, 130, 246, 0.75)'; // blue
  });

  const borderColors = stageOrder.map(s => {
    if (s === 'Won / Closed') return '#10b981';
    if (s === 'Lost') return '#94a3b8';
    if (s === 'Interested' || s === 'Meeting Scheduled') return '#6366f1';
    if (s === 'Proposal Sent' || s === 'Negotiation') return '#a855f7';
    return '#3b82f6';
  });

  return {
    labels,
    datasets: [
      {
        label: isCount ? 'Lead Count' : 'Deal Value ($)',
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6,
        maxBarThickness: 38
      }
    ]
  };
});

const pipelineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleFont: { size: 12, weight: 'bold' as const },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: function (context: any) {
          if (pipelineMetricType.value === 'value') {
            return ` Pipeline Value: $${Number(context.raw).toLocaleString()}`;
          }
          return ` Lead Count: ${context.raw} leads`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#94a3b8',
        font: { size: 10 },
        maxRotation: 45,
        minRotation: 25
      }
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.12)'
      },
      ticks: {
        color: '#94a3b8',
        font: { size: 10 },
        precision: 0,
        stepSize: pipelineMetricType.value === 'value' ? undefined : 1,
        callback: function (val: any) {
          if (pipelineMetricType.value === 'value') {
            return `$${val.toLocaleString()}`;
          }
          return Math.floor(val) === val ? val : '';
        }
      }
    }
  }
}));

// --- 2. Lead Source Attribution (Doughnut Chart) Data & Options ---
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
    const leadsInSource = filteredLeads.value.filter(l => l.leadSource === src);
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

const sourceChartData = computed(() => {
  const labels = sourceStats.value.map(s => s.source);
  const data = sourceStats.value.map(s => s.count);
  const palette = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#14b8a6', // Teal
    '#64748b'  // Slate
  ];

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: palette.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }
    ]
  };
});

const sourceChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 12,
        font: { size: 11 },
        color: '#64748b'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: function (context: any) {
          const index = context.dataIndex;
          const stat = sourceStats.value[index];
          if (!stat) return '';
          return ` ${stat.source}: ${stat.count} leads (${stat.percent}%) - $${stat.value.toLocaleString()}`;
        }
      }
    }
  },
  cutout: '68%'
}));

// --- 3. Monthly Leads Trend (Line Chart) ---
const activityTimelineData = computed(() => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  
  // Get number of days in the current month
  const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Initialize days map (1 to numDays)
  const daysMap = new Map<number, number>();
  for (let d = 1; d <= numDays; d++) {
    daysMap.set(d, 0);
  }

  // Populate leads added for this month
  filteredLeads.value.forEach(l => {
    if (l.dateLeadAdded) {
      const parts = l.dateLeadAdded.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (y === currentYear && (m - 1) === currentMonth) {
          if (daysMap.has(d)) {
            daysMap.set(d, daysMap.get(d)! + 1);
          }
        }
      }
    } else if (l.createdAt) {
      const date = new Date(l.createdAt);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        const d = date.getDate();
        if (daysMap.has(d)) {
          daysMap.set(d, daysMap.get(d)! + 1);
        }
      }
    }
  });

  const labels: string[] = [];
  const leadsData: number[] = [];

  for (let d = 1; d <= numDays; d++) {
    labels.push(String(d));
    leadsData.push(daysMap.get(d) || 0);
  }

  return {
    labels,
    datasets: [
      {
        label: 'New Leads Added',
        data: leadsData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  };
});

const activityTimelineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        font: { size: 11 },
        color: '#64748b'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', font: { size: 10 } }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.12)' },
      ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 }
    }
  }
}));

// --- 4. Priority & Qualification (Doughnut Chart) ---
const priorityStats = computed(() => {
  const priorities: LeadPriority[] = ['Hot', 'Warm', 'Cold', 'Not Qualified'];
  return priorities.map(pri => {
    const count = filteredLeads.value.filter(l => l.priority === pri).length;
    return {
      priority: pri,
      count,
      percent: totalLeads.value ? Math.round((count / totalLeads.value) * 100) : 0
    };
  });
});

const priorityChartData = computed(() => {
  return {
    labels: ['Hot', 'Warm', 'Cold', 'Not Qualified'],
    datasets: [
      {
        data: priorityStats.value.map(p => p.count),
        backgroundColor: [
          '#ef4444', // Hot (Red)
          '#f59e0b', // Warm (Amber)
          '#0ea5e9', // Cold (Sky)
          '#94a3b8'  // Not Qualified (Slate)
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };
});

const priorityChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        font: { size: 11 },
        color: '#64748b'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      padding: 10,
      cornerRadius: 8
    }
  },
  cutout: '62%'
}));

// --- 5. Sales Team Performance Comparison (Grouped Bar Chart) ---
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

const repComparisonChartData = computed(() => {
  const labels = repLeaderboard.value.map(r => r.name);
  return {
    labels,
    datasets: [
      {
        label: 'Assigned Leads',
        data: repLeaderboard.value.map(r => r.totalLeads),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 4,
        maxBarThickness: 20
      },
      {
        label: 'Calls Logged',
        data: repLeaderboard.value.map(r => r.callsMade),
        backgroundColor: 'rgba(14, 165, 233, 0.85)',
        borderRadius: 4,
        maxBarThickness: 20
      },
      {
        label: 'WhatsApp Sent',
        data: repLeaderboard.value.map(r => r.waMade),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4,
        maxBarThickness: 20
      },
      {
        label: 'Deals Won',
        data: repLeaderboard.value.map(r => r.wonCount),
        backgroundColor: 'rgba(245, 158, 11, 0.85)',
        borderRadius: 4,
        maxBarThickness: 20
      }
    ]
  };
});

const repComparisonChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        font: { size: 11 },
        color: '#64748b'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' as const } }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.12)' },
      ticks: {
        color: '#94a3b8',
        font: { size: 10 },
        precision: 0,
        stepSize: 1,
        callback: function (val: any) {
          return Math.floor(val) === val ? val : '';
        }
      }
    }
  }
}));
</script>

<template>
  <div class="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/50">
    <!-- Header & Interactive Filter Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h2 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 class="w-5 h-5 text-indigo-600" />
          <span>Interactive Lead Generation & Performance Analytics</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Visual graphs for conversion funnel attribution, outreach momentum, qualification temperature, and rep KPIs.
        </p>
      </div>

      <!-- Filter Controls -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Salesperson Filter Dropdown (Visible only to SuperAdmin/Admin) -->
        <div
          v-if="store.currentUser?.role === 'SuperAdmin' || store.currentUser?.role === 'Admin'"
          class="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm text-xs"
        >
          <Filter class="w-3.5 h-3.5 text-slate-400" />
          <span class="text-slate-400 font-medium">Rep:</span>
          <select
            v-model="selectedRepFilter"
            class="bg-transparent font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Sales Representatives</option>
            <option v-for="rep in store.salespersons" :key="rep.id" :value="rep.name">
              {{ rep.name }}
            </option>
          </select>
        </div>

        <!-- 5-Rule CRM Compliance Badge -->
        <div class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{{ store.complianceRate }}% 5-Rule CRM Health</span>
        </div>
      </div>
    </div>

    <!-- Top Key Metrics Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- Total Pipeline Value -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pipeline</div>
          <div class="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ${{ totalPipelineValue.toLocaleString() }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">{{ totalLeads }} leads under management</div>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <DollarSign class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      <!-- Closed Revenue Won -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Won Deals Revenue</div>
          <div class="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            ${{ wonValue.toLocaleString() }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">{{ wonLeads.length }} won ({{ winRate }}% Win Rate)</div>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <Award class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      <!-- Cold Calls Logged -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cold Calling Logs</div>
          <div class="text-lg sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {{ totalCallsLogged }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">Calls with disposition notes</div>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <PhoneCall class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      <!-- WhatsApp Outreach -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Touches</div>
          <div class="text-lg sm:text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
            {{ totalWhatsAppLogged }}
          </div>
          <div class="text-[10px] text-slate-500 font-medium mt-0.5">Templates & brochures sent</div>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center flex-shrink-0">
          <MessageCircle class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>

    <!-- Visual Charts Row 1: Pipeline Funnel & Acquisition Source Doughnut -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <!-- 11-Stage Pipeline Conversion Funnel (Bar Chart) - 7 Cols -->
      <div class="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-indigo-500" />
              <span>11-Stage Pipeline Conversion Funnel</span>
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">Stage velocity and distribution across active leads</p>
          </div>

          <!-- Toggle Metric: Count vs Dollar Value -->
          <div class="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
            <button
              @click="pipelineMetricType = 'count'"
              :class="[
                'px-2.5 py-1 rounded-md transition-all',
                pipelineMetricType === 'count'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              ]"
            >
              Lead Count
            </button>
            <button
              @click="pipelineMetricType = 'value'"
              :class="[
                'px-2.5 py-1 rounded-md transition-all',
                pipelineMetricType === 'value'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              ]"
            >
              Deal Value ($)
            </button>
          </div>
        </div>

        <!-- Interactive Chart.js Canvas -->
        <div class="h-64 sm:h-72 w-full relative pt-2">
          <Bar :data="pipelineChartData" :options="pipelineChartOptions" />
        </div>
      </div>

      <!-- Lead Acquisition Channel Attribution (Doughnut Chart) - 5 Cols -->
      <div class="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <PieChart class="w-4 h-4 text-purple-500" />
              <span>Lead Source Attribution Share</span>
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">Marketing channel ROI & volume</p>
          </div>
          <span class="text-[11px] font-bold text-slate-400">{{ sourceStats.length }} Active Channels</span>
        </div>

        <!-- Doughnut Canvas -->
        <div class="h-64 sm:h-72 w-full relative">
          <Doughnut :data="sourceChartData" :options="sourceChartOptions" />
        </div>
      </div>
    </div>

    <!-- Visual Charts Row 2: Outreach Velocity Timeline & Priority Qualification -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <!-- Monthly New Leads Trend (Line Chart) - 7 Cols -->
      <div class="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity class="w-4 h-4 text-indigo-500" />
              <span>Monthly New Leads Trend</span>
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">Day-by-day visualization of new leads added to the database this month</p>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            This Month
          </span>
        </div>

        <!-- Line Chart Canvas -->
        <div class="h-64 w-full relative pt-2">
          <Line :data="activityTimelineData" :options="activityTimelineOptions" />
        </div>
      </div>

      <!-- Lead Temperature & Priority Breakdown (Doughnut Chart) - 5 Cols -->
      <div class="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Flame class="w-4 h-4 text-rose-500" />
              <span>Lead Qualification & Temperature</span>
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">Hot, Warm, Cold, and Unqualified triage</p>
          </div>
          <span class="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full">
            {{ priorityStats.find(p => p.priority === 'Hot')?.count || 0 }} Hot Deals
          </span>
        </div>

        <!-- Priority Canvas -->
        <div class="h-64 w-full relative">
          <Doughnut :data="priorityChartData" :options="priorityChartOptions" />
        </div>
      </div>
    </div>

    <!-- Visual Charts Row 3: Sales Reps Multi-Metric Benchmarking (Grouped Bar Chart - Visible only to Admin/Manager) -->
    <div
      v-if="store.currentUser?.role === 'Admin' || store.currentUser?.role === 'Manager'"
      class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
    >
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users class="w-4 h-4 text-indigo-500" />
            <span>Sales Representative Benchmark & Volume Comparison</span>
          </h3>
          <p class="text-[11px] text-slate-400 mt-0.5">Side-by-side comparison of SDR outreach volume, leads assigned, and closed deals</p>
        </div>
        <span class="text-xs font-semibold text-slate-500">{{ store.salespersons.length }} Active Reps</span>
      </div>

      <!-- Rep Comparison Bar Chart Canvas -->
      <div class="h-64 sm:h-72 w-full relative pt-2">
        <Bar :data="repComparisonChartData" :options="repComparisonChartOptions" />
      </div>
    </div>

    <!-- Sales Reps Leaderboard Table (Visible only to Admin/Manager) -->
    <div
      v-if="store.currentUser?.role === 'Admin' || store.currentUser?.role === 'Manager'"
      class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
    >
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Award class="w-4 h-4 text-amber-500" />
            <span>Sales Team Performance Leaderboard</span>
          </h3>
          <p class="text-[11px] text-slate-400 mt-0.5">Ranked by closed won revenue, outreach discipline, and 5-Rule CRM adherence</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[650px] text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th class="py-2.5 px-3">Salesperson</th>
              <th class="py-2.5 px-3">Role</th>
              <th class="py-2.5 px-3 text-center">Assigned Leads</th>
              <th class="py-2.5 px-3 text-center">Calls Made</th>
              <th class="py-2.5 px-3 text-center">WhatsApp Sent</th>
              <th class="py-2.5 px-3 text-center">5-Rule Discipline</th>
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
              <td class="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">{{ rep.totalLeads }}</td>
              <td class="py-3 px-3 text-center font-mono text-indigo-600 dark:text-indigo-400 font-bold">{{ rep.callsMade }}</td>
              <td class="py-3 px-3 text-center font-mono text-teal-600 dark:text-teal-400 font-bold">{{ rep.waMade }}</td>
              <td class="py-3 px-3 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold inline-block" :class="rep.compliance >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'">
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
