<script setup lang="ts">
import { onMounted } from 'vue';
import { useCRMStore } from '@/stores/crmStore';
import Header from '@/components/layout/Header.vue';
import Sidebar from '@/components/layout/Sidebar.vue';
import RuleComplianceBar from '@/components/layout/RuleComplianceBar.vue';
import LeadTable from '@/components/leads/LeadTable.vue';
import LeadKanban from '@/components/leads/LeadKanban.vue';
import SmartQueuesView from '@/components/queues/SmartQueuesView.vue';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard.vue';
import LeadDetailDrawer from '@/components/leads/LeadDetailDrawer.vue';
import QuickCallModal from '@/components/leads/QuickCallModal.vue';
import QuickWhatsAppModal from '@/components/leads/QuickWhatsAppModal.vue';
import CreateLeadModal from '@/components/leads/CreateLeadModal.vue';
import ImportExportModal from '@/components/leads/ImportExportModal.vue';

const store = useCRMStore();

onMounted(() => {
  store.initStore();
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-slate-100/50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 select-none">
    <!-- Mandatory 5 Golden Rules Compliance Top Banner -->
    <RuleComplianceBar />

    <!-- Application Top Navigation Bar -->
    <Header />

    <!-- Main App Workspace Container -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar Navigation & Smart Queues Counter -->
      <Sidebar />

      <!-- Active Workspace View -->
      <main class="flex-1 flex flex-col overflow-hidden relative">
        <LeadTable v-if="store.currentView === 'table'" />
        <LeadKanban v-else-if="store.currentView === 'kanban'" />
        <SmartQueuesView v-else-if="store.currentView === 'queues'" />
        <AnalyticsDashboard v-else-if="store.currentView === 'analytics'" />
      </main>
    </div>

    <!-- Modals & Overlay Drawers -->
    <LeadDetailDrawer />
    <QuickCallModal />
    <QuickWhatsAppModal />
    <CreateLeadModal />
    <ImportExportModal />
  </div>
</template>
