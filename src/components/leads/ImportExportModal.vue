<script setup lang="ts">
import { ref } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import {
  FileSpreadsheet,
  Download,
  Upload,
  X,
  FileCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next';

const store = useCRMStore();

const fileInput = ref<HTMLInputElement | null>(null);
const parsedLeadsCount = ref<number | null>(null);
const parsedData = ref<any[]>([]);
const errorMessage = ref<string>('');
const successMessage = ref<string>('');

function handleExport() {
  store.exportLeadsToCSV();
}

function handleFileChange(event: Event) {
  errorMessage.value = '';
  successMessage.value = '';
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        errorMessage.value = 'CSV file must have a header row and at least one lead row.';
        return;
      }

      // Simple CSV parser supporting quotes
      const headers = parseCSVLine(lines[0]);
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0) {
          const rowObj: any = {};
          headers.forEach((h, index) => {
            rowObj[h.trim()] = values[index] ? values[index].trim() : '';
          });
          rows.push(rowObj);
        }
      }

      parsedData.value = rows;
      parsedLeadsCount.value = rows.length;
    } catch (err: any) {
      errorMessage.value = 'Failed to parse CSV file: ' + (err.message || 'Invalid format');
    }
  };
  reader.readAsText(file);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

function confirmImport() {
  if (store.currentUser?.role !== 'SuperAdmin') {
    errorMessage.value = 'Permission denied: Only SuperAdmin is authorized to import leads.';
    return;
  }
  if (parsedData.value.length === 0) return;
  const count = store.importLeadsFromCSV(parsedData.value);
  successMessage.value = `Successfully imported ${count} leads into the CRM!`;
  parsedData.value = [];
  parsedLeadsCount.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

function downloadSampleCSV() {
  const headers = [
    'Lead Name',
    'Company Name',
    'Phone Number',
    'WhatsApp Number',
    'Email',
    'City',
    'Full Address',
    'Industry',
    'Service Required',
    'Lead Source',
    'Priority',
    'Pipeline Stage',
    'Project Type',
    'Project Location',
    'Budget Range',
    'Area Size',
    'Timeline',
    'Assigned Salesperson',
    'Next Action',
    'Notes'
  ];

  const sampleRows = [
    [
      '"Marcus Sterling"',
      '"Sterling Logistics"',
      '"+1 555-492-8819"',
      '"+1 555-492-8819"',
      '"marcus@sterlinglogistics.com"',
      '"Dallas, TX"',
      '"400 Main St, Dallas, TX"',
      '"Logistics"',
      '"Fleet Management CRM"',
      '"Google Maps"',
      '"Hot"',
      '"Interested"',
      '"Commercial"',
      '"Downtown Dallas"',
      '"1m-2m"',
      '"1000-2000 sq.ft"',
      '"Immediately"',
      '"Laiba Khan"',
      '"First cold call to CEO"',
      '"Looking for turnkey lead generation system and WhatsApp follow-up automation."'
    ],
    [
      '"Sophia Lin"',
      '"Nova Cloud Dynamics"',
      '"+1 555-831-2244"',
      '"+1 555-831-2244"',
      '"sophia@novacloud.io"',
      '"Seattle, WA"',
      '"Floor 12, Westlake Ave, Seattle, WA"',
      '"SaaS & Tech"',
      '"B2B Outbound Campaigns"',
      '"LinkedIn"',
      '"Warm"',
      '"Contacted"',
      '"Office"',
      '"Seattle Tech Hub"',
      '"2m-3m"',
      '"2000-3000 sq.ft"',
      '"0-1 month"',
      '"Laiba Khan"',
      '"Send WhatsApp credentials & case study"',
      '"High budget client from LinkedIn campaign. Ready for demo next week."'
    ]
  ];

  const sampleCSV = '\uFEFF' + [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');

  const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sample_leads_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div
    v-if="store.isImportExportModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold">CSV Lead Data Hub</h3>
            <p class="text-xs text-slate-400">Bulk import scraped leads (Google Maps / LinkedIn) or export CRM records</p>
          </div>
        </div>

        <button
          @click="store.isImportExportModalOpen = false"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6 text-xs overflow-y-auto">
        <!-- Section: Export -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white text-xs">Export All Leads</h4>
              <p class="text-[11px] text-slate-500">Download complete lead database with call logs and follow-up history as a CSV file</p>
            </div>

            <button
              @click="handleExport"
              class="px-4 py-2 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white flex items-center gap-2 shadow-sm transition-all"
            >
              <Download class="w-4 h-4" />
              <span>Export CSV ({{ store.leads.length }})</span>
            </button>
          </div>
        </div>

        <!-- Section: Import -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white text-xs">Bulk Import Leads</h4>
              <p class="text-[11px] text-slate-500">Upload CSV file with columns like Lead Name, Company, Phone, Industry, etc.</p>
            </div>

            <button
              @click="downloadSampleCSV"
              class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Download Sample CSV
            </button>
          </div>

          <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-white dark:bg-slate-900/60">
            <Upload class="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <label class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
              <span>Choose CSV file</span>
              <input
                ref="fileInput"
                type="file"
                accept=".csv,text/csv"
                @change="handleFileChange"
                class="hidden"
              />
            </label>
            <p class="text-[11px] text-slate-400 mt-1">Supports standard CSV format with headers</p>
          </div>

          <!-- Parsed count banner -->
          <div v-if="parsedLeadsCount !== null" class="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <FileCheck class="w-4 h-4 text-indigo-600" />
              <span class="font-bold text-indigo-950 dark:text-indigo-200">
                {{ parsedLeadsCount }} leads detected and ready to import
              </span>
            </div>

            <button
              @click="confirmImport"
              class="px-4 py-1.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
            >
              Import Now
            </button>
          </div>

          <!-- Alert Messages -->
          <div v-if="successMessage" class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-semibold">
            <CheckCircle2 class="w-4 h-4 text-emerald-600" />
            <span>{{ successMessage }}</span>
          </div>

          <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-200 flex items-center gap-2 font-semibold">
            <AlertCircle class="w-4 h-4 text-rose-600" />
            <span>{{ errorMessage }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
